import Adw from "gi://Adw";
import Gtk from "gi://Gtk";

import { ExtensionPreferences } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js";

import {
  SETTINGS_KEYS,
  SETTINGS_SCHEMA,
  clampInteger,
  normalizeThresholds,
} from "./lib/battery-settings.js";

function createSpinRow({
  title,
  subtitle,
  minimum,
  maximum,
  step,
  initialValue,
}) {
  const row = new Adw.ActionRow({
    title,
    subtitle,
  });

  const adjustment = new Gtk.Adjustment({
    lower: minimum,
    upper: maximum,
    stepIncrement: step,
    pageIncrement: step * 10,
    value: initialValue,
  });

  const spinButton = new Gtk.SpinButton({
    adjustment,
    numeric: true,
    valign: Gtk.Align.CENTER,
    widthChars: 6,
  });

  row.add_suffix(spinButton);
  row.activatableWidget = spinButton;

  return { row, spinButton };
}

function addTextRow(group, title, subtitle) {
  const row = new Adw.ActionRow({
    title,
    subtitle,
  });
  group.add(row);
  return row;
}

export default class BatteryNotifierPreferences extends ExtensionPreferences {
  fillPreferencesWindow(window) {
    const settings = this.getSettings(SETTINGS_SCHEMA);
    const settingsSignalIds = [];

    const controlsPage = new Adw.PreferencesPage({
      title: "Controls",
      iconName: "preferences-system-symbolic",
    });
    const controlsGroup = new Adw.PreferencesGroup({
      title: "Notification Settings",
    });

    const cooldownRow = createSpinRow({
      title: "Notification Cooldown",
      subtitle: "Minimum seconds between battery notifications.",
      minimum: 0,
      maximum: 3600,
      step: 1,
      initialValue: clampInteger(
        settings.get_int(SETTINGS_KEYS.cooldown),
        0,
        3600,
      ),
    });
    controlsGroup.add(cooldownRow.row);

    const lowerRow = createSpinRow({
      title: "Lower Limit",
      subtitle: "Notify when the battery drops below this value.",
      minimum: 0,
      maximum: 100,
      step: 1,
      initialValue: clampInteger(
        settings.get_int(SETTINGS_KEYS.lowerLimit),
        0,
        100,
      ),
    });
    controlsGroup.add(lowerRow.row);

    const upperRow = createSpinRow({
      title: "Upper Limit",
      subtitle:
        "Notify when the battery rises above this value while charging.",
      minimum: 0,
      maximum: 100,
      step: 1,
      initialValue: clampInteger(
        settings.get_int(SETTINGS_KEYS.upperLimit),
        0,
        100,
      ),
    });
    controlsGroup.add(upperRow.row);

    controlsPage.add(controlsGroup);

    const applyThresholds = (changedKey, value) => {
      const normalizedValue = clampInteger(value, 0, 100);

      let lower = settings.get_int(SETTINGS_KEYS.lowerLimit);
      let upper = settings.get_int(SETTINGS_KEYS.upperLimit);

      if (changedKey === SETTINGS_KEYS.lowerLimit) {
        lower = normalizedValue;
      } else {
        upper = normalizedValue;
      }

      const normalized = normalizeThresholds(lower, upper);
      settings.set_int(SETTINGS_KEYS.lowerLimit, normalized.lowerLimit);
      settings.set_int(SETTINGS_KEYS.upperLimit, normalized.upperLimit);
    };

    let updatingControls = false;

    const syncControlsFromSettings = () => {
      updatingControls = true;
      cooldownRow.spinButton.value = clampInteger(
        settings.get_int(SETTINGS_KEYS.cooldown),
        0,
        3600,
      );
      lowerRow.spinButton.value = clampInteger(
        settings.get_int(SETTINGS_KEYS.lowerLimit),
        0,
        100,
      );
      upperRow.spinButton.value = clampInteger(
        settings.get_int(SETTINGS_KEYS.upperLimit),
        0,
        100,
      );
      updatingControls = false;
    };

    cooldownRow.spinButton.connect("value-changed", (spinButton) => {
      if (updatingControls) {
        return;
      }

      settings.set_int(
        SETTINGS_KEYS.cooldown,
        clampInteger(spinButton.value, 0, 3600),
      );
    });

    lowerRow.spinButton.connect("value-changed", (spinButton) => {
      if (updatingControls) {
        return;
      }

      applyThresholds(SETTINGS_KEYS.lowerLimit, spinButton.value);
    });

    upperRow.spinButton.connect("value-changed", (spinButton) => {
      if (updatingControls) {
        return;
      }

      applyThresholds(SETTINGS_KEYS.upperLimit, spinButton.value);
    });

    settingsSignalIds.push(
      settings.connect(
        `changed::${SETTINGS_KEYS.cooldown}`,
        syncControlsFromSettings,
      ),
    );
    settingsSignalIds.push(
      settings.connect(
        `changed::${SETTINGS_KEYS.lowerLimit}`,
        syncControlsFromSettings,
      ),
    );
    settingsSignalIds.push(
      settings.connect(
        `changed::${SETTINGS_KEYS.upperLimit}`,
        syncControlsFromSettings,
      ),
    );

    const aboutPage = new Adw.PreferencesPage({
      title: "About",
      iconName: "help-about-symbolic",
    });
    const aboutGroup = new Adw.PreferencesGroup({
      title: "Battery Indicator",
    });

    addTextRow(aboutGroup, this.metadata.name, this.metadata.description);
    addTextRow(
      aboutGroup,
      "Developer",
      this.metadata.author ?? "Ash Baseplate",
    );

    const repositoryRow = new Adw.ActionRow({
      title: "Repository",
      subtitle: "Open the project page on GitHub.",
    });
    const repositoryButton = new Gtk.LinkButton({
      uri: this.metadata.url,
      label: "Open Repository",
      valign: Gtk.Align.CENTER,
    });
    repositoryRow.add_suffix(repositoryButton);
    repositoryRow.activatableWidget = repositoryButton;
    aboutGroup.add(repositoryRow);

    addTextRow(
      aboutGroup,
      "Extension Version",
      this.metadata["version-name"] ?? "2.0.0",
    );

    aboutPage.add(aboutGroup);

    window.add(controlsPage);
    window.add(aboutPage);

    window.connect("close-request", () => {
      for (const signalId of settingsSignalIds) {
        settings.disconnect(signalId);
      }

      return false;
    });

    syncControlsFromSettings();
  }
}
