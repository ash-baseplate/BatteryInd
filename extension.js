import GLib from "gi://GLib";
import St from "gi://St";
import Gio from "gi://Gio";
import * as Main from "resource:///org/gnome/shell/ui/main.js";
import * as PanelMenu from "resource:///org/gnome/shell/ui/panelMenu.js";
import { Extension } from "resource:///org/gnome/shell/extensions/extension.js";

const NOTIFICATION_COOLDOWN = 30;

export default class BatteryNotifier extends Extension {
    enable() {
        this._notifyEnabled = true;
        this._lastNotificationTime = 0;

        this._indicator = new PanelMenu.Button(0.0, "Battery Notifier", false);
        this._icon = new St.Icon({
            gicon: this._getCustomIcon(true),
            style_class: 'system-status-icon',
        });

        this._indicator.add_child(this._icon);
        this._indicator.connect("button-press-event", () => this.toggleNotifications());

        this._timeout = GLib.timeout_add_seconds(
            GLib.PRIORITY_DEFAULT, 30, () => {
                this._checkBatteryLevel();
                return GLib.SOURCE_CONTINUE;
            }
        );

        // Change index to -1 to place it at the start of the left side
        Main.panel.addToStatusArea(this.metadata.uuid, this._indicator, -1, 'left');
    }

    disable() {
        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }

        if (this._timeout) {
            GLib.source_remove(this._timeout);
            this._timeout = null;
        }
    }

    _getCustomIcon(enabled) {
        const iconPath = `${this.path}/icons/${enabled ? 'on.png' : 'off.png'}`;
        return Gio.FileIcon.new(Gio.File.new_for_path(iconPath));
    }

    toggleNotifications() {
        this._notifyEnabled = !this._notifyEnabled;
        this._icon.gicon = this._getCustomIcon(this._notifyEnabled);
        Main.notify("Battery Notifier", 
            this._notifyEnabled ? "Notifications enabled" : "Notifications disabled");
    }

    _getBatteryInfo() {
        try {
            const batteryDevicePath = GLib.spawn_command_line_sync("upower -e | grep 'battery_'")[1];
            if (!batteryDevicePath) {
                return { level: 0, isCharging: false };
            }

            const output = GLib.spawn_command_line_sync(
                `upower -i ${String(batteryDevicePath).trim()}`
            );
            const result = String(output[1]);

            const levelMatch = result.match(/percentage:\s+(\d+)%/);
            const stateMatch = result.match(/state:\s+(\w+)/);

            if (!levelMatch || !stateMatch) {
                return { level: 0, isCharging: false };
            }

            return {
                level: parseInt(levelMatch[1], 10),
                isCharging: stateMatch[1].trim() === "charging"
            };
        } catch (error) {
            log("Error getting battery info: " + error);
            return { level: 0, isCharging: false };
        }
    }

    _checkBatteryLevel() {
        const { level, isCharging } = this._getBatteryInfo();

        if (this._notifyEnabled) {
            const now = GLib.get_monotonic_time() / 1000000;

            if (now - this._lastNotificationTime >= NOTIFICATION_COOLDOWN) {
                if (level < 40 && !isCharging) {
                    Main.notify("Battery Low", "Battery level is below 40%. Please plug in your charger.");
                    this._lastNotificationTime = now;
                } else if (level >= 80 && isCharging) {
                    Main.notify("Battery Full", "Battery level is above 80% please consider unplugging");
                    this._lastNotificationTime = now;
                }
            }
        }
    }
}
