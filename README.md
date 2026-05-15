# Battery Indicator

A production-ready GNOME 50+ battery indicator extension with intelligent notifications, persistent settings, and a modern preferences interface.

## Features

- 🔋 **DBus Battery Monitoring**: Real-time battery level monitoring via UPower DBus interface
- ⚙️ **Persistent Settings**: All configuration persists across GNOME Shell restarts using GSettings
- 🔔 **Intelligent Notifications**:
  - Low battery alert when level drops below 40% (and not charging)
  - High battery alert when level reaches 80% or above (while charging)
- 🎛️ **Left-Click Toggle**: Instantly enable/disable notifications
- 📋 **Context Menu**: Right-click for quick access to Notifications toggle and Settings
- ⏰ **Smart Cooldown**: Configurable notification cooldown (default 30 seconds)
- 🔄 **Hysteresis**: Prevents notification spam near threshold boundaries
- 🎨 **Visual Feedback**: Real-time icon updates reflect notification status
- 🖥️ **Modern Preferences**: GTK4/libadwaita preferences window with immediate settings sync
- 📍 **GNOME 50+ Compatible**: Stable integration with GNOME Shell 50+

## Installation

### Important: Installation Location

The extension **must** be installed to:

```
~/.local/share/gnome-shell/extensions/batteryind@ash.ext.com/
```

This is the standard location where GNOME Shell looks for user extensions.

### Method 1: Manual Installation

1. Clone or download this repository:

   ```bash
   git clone https://github.com/ash-baseplate/BatteryInd.git
   ```

2. Copy the extension to your local extensions directory:

   ```bash
   cp -r BatteryInd ~/.local/share/gnome-shell/extensions/batteryind@ash.ext.com/
   ```

   **Note**: The folder name `batteryind@ash.ext.com` must match the UUID in `metadata.json`

3. **No restart required!** The extension will load automatically when enabled.

4. Enable the extension:
   ```bash
   gnome-extensions enable batteryind@ash.ext.com
   ```

### Method 2: Using GNOME Extensions Manager

1. Install GNOME Extensions Manager if you haven't already:

   ```bash
   sudo apt install gnome-shell-extension-manager
   ```

2. Copy the extension to the extensions directory (step 2 from Method 1)
3. Open Extensions Manager and enable "Battery Indicator"

## Usage

### Basic Operation

- **Toggle Notifications**: Left-click the battery indicator icon in the top panel to instantly enable/disable
- **Context Menu**: Right-click to open a menu with:
  - Notifications On/Off toggle (synchronized with left-click state)
  - Settings button to open preferences
- **Visual Status**:
  - Green icon: Notifications enabled
  - Gray icon: Notifications disabled

### Configuration

Open the preferences window from the extension menu (right-click → Settings) or from GNOME Extensions manager. You can configure:

- **Notification Cooldown**: Time (in seconds) between consecutive notifications for the same condition
- **Lower Limit**: Battery percentage that triggers low battery alert (default 40%)
- **Upper Limit**: Battery percentage that triggers charging alert (default 80%)

**Settings apply immediately without requiring a restart.**

### Notification Behavior

- **Low Battery (< 40%)**: Get notified when battery is low and not charging
- **High Battery (≥ 80%)**: Get notified when battery is high and still charging
- **Smart Cooldown**: Respects the configured cooldown timer between successive alerts
- **Hysteresis Protection**: Uses a 5% margin above/below thresholds to prevent rapid-fire notifications near boundaries
- **Real-Time Evaluation**: Checks battery state immediately when settings change or timer fires

## Compatibility

This extension is tested and compatible with:

- GNOME Shell 50+

## File Structure

```
batteryind@ash.ext.com/
├── extension.js              # Main extension logic and panel indicator
├── prefs.js                  # GTK4/libadwaita preferences window
├── metadata.json             # Extension metadata and compatibility
├── lib/
│   ├── battery-settings.js   # Settings schema keys and validation helpers
│   └── battery-monitor.js    # DBus-based UPower battery monitor
├── schemas/
│   ├── org.gnome.shell.extensions.batteryind.gschema.xml  # GSettings schema
│   └── gschemas.compiled     # Compiled schema binary
├── icons/                    # Custom icons
│   ├── on.png       # Notifications enabled icon
│   └── off.png      # Notifications disabled icon
└── README.md                 # This file
```

## Technical Details

### Architecture

- **Settings Backend**: Uses GSettings for persistent, dconf-backed configuration
- **Battery Monitoring**: Direct DBus proxy to org.freedesktop.UPower.Device for real-time state updates
- **Notification Logic**: Time-based cooldown with hysteresis to prevent spam
- **Preferences UI**: Native GTK4 with libadwaita for consistent GNOME appearance
- **GNOME 50 Compatibility**: Preserves required event handling workarounds for stable panel integration

### Battery Health Optimization

This extension promotes good battery health practices:

- **Default 40% Low Threshold**: Prevents deep discharge cycles that can damage lithium-ion batteries
- **Default 80% High Threshold**: Avoids keeping batteries at 100% charge, which can reduce long-term capacity
- **Customizable**: Adjust thresholds to match your device and usage patterns

### Performance

- **Lightweight**: Minimal system resource usage with DBus callbacks, not polling
- **Adaptive Polling**: Secondary polling interval matches cooldown for efficient re-evaluation
- **Non-blocking**: Uses GLib timeouts and DBus signals for fully asynchronous operation
- **Memory Efficient**: Single DBus proxy connection with set-based callback management

## Troubleshooting

### Extension Not Working

1. Check if the extension is enabled:

   ```bash
   gnome-extensions list --enabled | grep batteryind
   ```

2. Check for errors in the logs:

   ```bash
   journalctl -f -o cat /usr/bin/gnome-shell
   ```

3. Restart GNOME Shell:

   ```bash
   # On X11
   killall -3 gnome-shell

   # On Wayland (requires logout/login)
   gnome-session-quit --logout
   ```

### Settings Don't Apply

Settings should update in real-time. If they don't:

1. Check that the preferences window closed properly
2. Verify the extension is still enabled
3. Try restarting GNOME Shell (see above)

### Notifications Not Appearing

1. Ensure notifications are enabled in GNOME Settings:
   - Open Settings → Notifications
   - Make sure notifications are enabled

2. Check if the extension icon shows notifications are enabled (green icon)

3. Verify configured thresholds match your test conditions (default: < 40% or ≥ 80%)

4. Ensure the cooldown timer has expired since the last notification

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

### Development Setup

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Test the extension thoroughly
5. Commit your changes: `git commit -am 'Add some feature'`
6. Push to the branch: `git push origin feature-name`
7. Submit a pull request

## License

This project is open source. Feel free to use, modify, and distribute as needed.

## Author

**Ash Baseplate**

- GitHub: [@ash-baseplate](https://github.com/ash-baseplate)
- Repository: [BatteryInd](https://github.com/ash-baseplate/BatteryInd)

## Changelog

### v2.0.0

- **Major Refactor**: Rebuilt from scratch for GNOME 50+ with modern architecture
- Persistent settings using GSettings (no manual config files)
- Modern GTK4/libadwaita preferences window
- DBus-based UPower battery monitoring (replaces spawned UPower commands)
- Context menu with toggle and settings button
- Real-time settings application without restart
- Improved notification cooldown with proper time-based re-evaluation
- Hysteresis logic to prevent notification spam near thresholds
- Configurable notification cooldown and battery thresholds
- GNOME 50+ only (dropped support for older versions)

### v1.0.0

- Initial release
- Basic battery monitoring and notifications
- Toggle functionality for enabling/disabling notifications
- Support for GNOME Shell 43-48

---

⭐ If you find this extension useful, please consider giving it a star on GitHub!
