import Clutter from "gi://Clutter";
import Gio from "gi://Gio";
import GLib from "gi://GLib";
import GObject from "gi://GObject";
import St from "gi://St";

import * as Main from "resource:///org/gnome/shell/ui/main.js";
import * as PanelMenu from "resource:///org/gnome/shell/ui/panelMenu.js";
import * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";
import { Extension } from "resource:///org/gnome/shell/extensions/extension.js";

import {
  HYSTERESIS_MARGIN,
  SETTINGS_KEYS,
  SETTINGS_SCHEMA,
  normalizeCooldown,
  normalizeThresholds,
} from "./lib/battery-settings.js";
import { BatteryMonitor } from "./lib/battery-monitor.js";

const BatteryIndicatorButton = GObject.registerClass(
  class BatteryIndicatorButton extends PanelMenu.Button {
    vfunc_event() {
      return Clutter.EVENT_PROPAGATE;
    }
  },
);

export default class BatteryNotifierExtension extends Extension {
  enable() {
    this._settings = this.getSettings(SETTINGS_SCHEMA);
    this._settingsSignalIds = [];
    this._isUpdatingMenuToggle = false;
    this._isNormalizingThresholds = false;

    this._notificationEnabled = this._settings.get_boolean(
      SETTINGS_KEYS.enabled,
    );
    this._cooldownSeconds = normalizeCooldown(
      this._settings.get_int(SETTINGS_KEYS.cooldown),
    );
    this._thresholds = normalizeThresholds(
      this._settings.get_int(SETTINGS_KEYS.lowerLimit),
      this._settings.get_int(SETTINGS_KEYS.upperLimit),
    );
    this._lastLowNotificationAt = 0;
    this._lastHighNotificationAt = 0;
    this._lowConditionActive = false;
    this._highConditionActive = false;
    this._currentBatteryState = null;
    this._pollTimeoutId = 0;

    this._indicator = new BatteryIndicatorButton(
      0.0,
      "Battery Notifier",
      false,
    );
    this._indicator._clickGesture?.set_enabled(false);
    this._indicator.connect("button-press-event", (_actor, event) =>
      this._onButtonPress(event),
    );

    this._icon = new St.Icon({
      gicon: this._getCustomIcon(this._notificationEnabled),
      style_class: "system-status-icon",
    });
    this._indicator.add_child(this._icon);

    this._buildMenu();

    this._monitor = new BatteryMonitor();
    this._monitor.start();
    this._monitorSubscription = this._monitor.subscribe((state) =>
      this._handleBatteryState(state),
    );

    this._connectSettings();
    this._reschedulePolling();

    Main.panel.addToStatusArea(this.metadata.uuid, this._indicator, -1, "left");
  }

  disable() {
    for (const signalId of this._settingsSignalIds) {
      this._settings.disconnect(signalId);
    }
    this._settingsSignalIds = [];

    if (this._monitorSubscription) {
      this._monitorSubscription();
      this._monitorSubscription = null;
    }

    if (this._monitor) {
      this._monitor.destroy();
      this._monitor = null;
    }

    if (this._pollTimeoutId) {
      GLib.source_remove(this._pollTimeoutId);
      this._pollTimeoutId = 0;
    }

    if (this._indicator) {
      this._indicator.destroy();
      this._indicator = null;
    }

    this._icon = null;
    this._settings = null;
  }

  _buildMenu() {
    this._notificationMenuItem = new PopupMenu.PopupSwitchMenuItem(
      "Notifications",
      this._notificationEnabled,
    );
    this._notificationMenuItem.connect("toggled", (item) => {
      if (this._isUpdatingMenuToggle) {
        return;
      }

      this._setNotificationsEnabled(item.state, true);
    });

    this._indicator.menu.addMenuItem(this._notificationMenuItem);
    this._indicator.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

    const settingsItem = new PopupMenu.PopupMenuItem("Settings");
    settingsItem.connect("activate", () => {
      Extension.lookupByUUID(this.metadata.uuid).openPreferences();
    });
    this._indicator.menu.addMenuItem(settingsItem);
  }

  _connectSettings() {
    this._settingsSignalIds.push(
      this._settings.connect(`changed::${SETTINGS_KEYS.enabled}`, () => {
        this._syncEnabledFromSettings();
      }),
    );
    this._settingsSignalIds.push(
      this._settings.connect(`changed::${SETTINGS_KEYS.cooldown}`, () => {
        this._syncCooldownFromSettings();
      }),
    );
    this._settingsSignalIds.push(
      this._settings.connect(`changed::${SETTINGS_KEYS.lowerLimit}`, () => {
        this._syncThresholdsFromSettings();
      }),
    );
    this._settingsSignalIds.push(
      this._settings.connect(`changed::${SETTINGS_KEYS.upperLimit}`, () => {
        this._syncThresholdsFromSettings();
      }),
    );

    this._syncEnabledFromSettings();
    this._syncCooldownFromSettings();
    this._syncThresholdsFromSettings();
  }

  _onButtonPress(event) {
    switch (event.get_button()) {
      case Clutter.BUTTON_PRIMARY:
        this._setNotificationsEnabled(!this._notificationEnabled, true);
        return Clutter.EVENT_STOP;
      case Clutter.BUTTON_SECONDARY:
        this._indicator.menu.toggle();
        return Clutter.EVENT_STOP;
      default:
        return Clutter.EVENT_PROPAGATE;
    }
  }

  _getCustomIcon(enabled) {
    const iconPath = `${this.path}/icons/${enabled ? "on.png" : "off.png"}`;
    return Gio.FileIcon.new(Gio.File.new_for_path(iconPath));
  }

  _setNotificationsEnabled(enabled, showConfirmation) {
    const value = Boolean(enabled);

    if (this._settings.get_boolean(SETTINGS_KEYS.enabled) !== value) {
      this._settings.set_boolean(SETTINGS_KEYS.enabled, value);
    }

    this._notificationEnabled = value;
    this._updateIndicatorState();
    this._syncMenuToggleState(value);

    if (value) {
      this._evaluateCurrentBatteryState(true);
    } else {
      this._lowConditionActive = false;
      this._highConditionActive = false;
    }

    if (showConfirmation) {
      Main.notify(
        "Battery Notifier",
        value ? "Notifications enabled" : "Notifications disabled",
      );
    }
  }

  _syncEnabledFromSettings() {
    const enabled = this._settings.get_boolean(SETTINGS_KEYS.enabled);
    this._notificationEnabled = enabled;
    this._updateIndicatorState();
    this._syncMenuToggleState(enabled);

    if (enabled) {
      this._evaluateCurrentBatteryState(true);
    } else {
      this._lowConditionActive = false;
      this._highConditionActive = false;
    }
  }

  _syncCooldownFromSettings() {
    const cooldown = normalizeCooldown(
      this._settings.get_int(SETTINGS_KEYS.cooldown),
    );

    if (cooldown !== this._settings.get_int(SETTINGS_KEYS.cooldown)) {
      this._settings.set_int(SETTINGS_KEYS.cooldown, cooldown);
      return;
    }

    this._cooldownSeconds = cooldown;
    this._reschedulePolling();
  }

  _syncThresholdsFromSettings() {
    if (this._isNormalizingThresholds) {
      return;
    }

    const lowerLimit = this._settings.get_int(SETTINGS_KEYS.lowerLimit);
    const upperLimit = this._settings.get_int(SETTINGS_KEYS.upperLimit);
    const normalized = normalizeThresholds(lowerLimit, upperLimit);

    this._thresholds = normalized;

    if (
      normalized.lowerLimit === lowerLimit &&
      normalized.upperLimit === upperLimit
    ) {
      this._evaluateCurrentBatteryState(true);
      return;
    }

    this._isNormalizingThresholds = true;
    if (normalized.lowerLimit !== lowerLimit) {
      this._settings.set_int(SETTINGS_KEYS.lowerLimit, normalized.lowerLimit);
    }
    if (normalized.upperLimit !== upperLimit) {
      this._settings.set_int(SETTINGS_KEYS.upperLimit, normalized.upperLimit);
    }
    this._isNormalizingThresholds = false;

    this._evaluateCurrentBatteryState(true);
  }

  _syncMenuToggleState(enabled) {
    if (!this._notificationMenuItem) {
      return;
    }

    this._isUpdatingMenuToggle = true;
    this._notificationMenuItem.setToggleState(enabled);
    this._isUpdatingMenuToggle = false;
  }

  _updateIndicatorState() {
    if (this._icon) {
      this._icon.gicon = this._getCustomIcon(this._notificationEnabled);
    }
  }

  _primeLatchStateFromCurrentBattery() {
    if (!this._monitor) {
      return;
    }

    this._primeLatchStateFromState(this._monitor.getState());
  }

  _primeLatchStateFromState(state) {
    this._currentBatteryState = state;
    this._lowConditionActive = state.level <= this._thresholds.lowerLimit;
    this._highConditionActive = state.level >= this._thresholds.upperLimit;
  }

  _evaluateCurrentBatteryState(ignoreLatches = false) {
    if (!this._currentBatteryState) {
      return;
    }

    this._evaluateBatteryState(this._currentBatteryState, ignoreLatches);
  }

  _evaluateBatteryState(state, ignoreLatches = false) {
    this._currentBatteryState = state;

    if (!this._notificationEnabled || !state.available) {
      return;
    }

    const now = GLib.get_monotonic_time() / 1000000;
    const lowCooldownExpired =
      now - this._lastLowNotificationAt >= this._cooldownSeconds;
    const highCooldownExpired =
      now - this._lastHighNotificationAt >= this._cooldownSeconds;

    if (
      state.level <= this._thresholds.lowerLimit &&
      !state.charging &&
      lowCooldownExpired
    ) {
      Main.notify(
        "Battery Low",
        `Battery level is below ${this._thresholds.lowerLimit}%. Please plug in your charger.`,
      );
      this._lastLowNotificationAt = now;
      this._lowConditionActive = true;
      this._highConditionActive = false;
      return;
    }

    if (
      state.level >= this._thresholds.upperLimit &&
      state.charging &&
      highCooldownExpired
    ) {
      Main.notify(
        "Battery Full",
        `Battery level is above ${this._thresholds.upperLimit}% while charging. Consider unplugging.`,
      );
      this._lastHighNotificationAt = now;
      this._highConditionActive = true;
      this._lowConditionActive = false;
    }
  }

  _handleBatteryState(state) {
    this._currentBatteryState = state;
    this._updateConditionState(state.level);
    this._evaluateBatteryState(state);
  }

  _reschedulePolling() {
    if (this._pollTimeoutId) {
      GLib.source_remove(this._pollTimeoutId);
      this._pollTimeoutId = 0;
    }

    const intervalSeconds = Math.max(1, Math.min(30, this._cooldownSeconds));
    this._pollTimeoutId = GLib.timeout_add_seconds(
      GLib.PRIORITY_DEFAULT,
      intervalSeconds,
      () => {
        this._evaluateCurrentBatteryState();
        return GLib.SOURCE_CONTINUE;
      },
    );
  }

  _updateConditionState(level) {
    const releaseLowThreshold = this._thresholds.lowerLimit + HYSTERESIS_MARGIN;
    const releaseHighThreshold =
      this._thresholds.upperLimit - HYSTERESIS_MARGIN;

    if (level >= releaseLowThreshold) {
      this._lowConditionActive = false;
    }

    if (level <= releaseHighThreshold) {
      this._highConditionActive = false;
    }
  }
}
