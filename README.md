# Battery Indicator

A smart battery indicator extension for GNOME Shell that provides intelligent notifications for battery levels to help optimize battery health and user productivity.

## Features

- 🔋 **Smart Battery Monitoring**: Continuously monitors battery level every 30 seconds
- 🔔 **Intelligent Notifications**: 
  - Low battery alert when level drops below 40% (and not charging)
  - High battery alert when level reaches 80% or above (while charging)
- 🎛️ **Toggle Control**: Click the panel icon to enable/disable notifications
- ⏰ **Notification Cooldown**: 30-second cooldown prevents notification spam
- 🎨 **Visual Indicators**: Custom icons show notification status (on/off)
- 📍 **Panel Integration**: Clean integration with GNOME Shell top panel

## Installation

### Method 1: Manual Installation

1. Clone or download this repository:
   ```bash
   git clone https://github.com/ash-baseplate/BatteryInd.git
   ```

2. Copy the extension to your local extensions directory:
   ```bash
   cp -r BatteryInd ~/.local/share/gnome-shell/extensions/batteryind@ash.ext.com/
   ```

3. Restart GNOME Shell:
   - Press `Alt + F2`
   - Type `r` and press Enter
   - Or log out and log back in

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

- **Enable/Disable Notifications**: Click the battery indicator icon in the top panel
- **Visual Status**: 
  - Green icon: Notifications enabled
  - Gray icon: Notifications disabled

### Notification Behavior

- **Low Battery (< 40%)**: Get notified when battery is low and not charging
- **High Battery (≥ 80%)**: Get notified when battery is high and still charging
- **Smart Cooldown**: Notifications have a 30-second cooldown to prevent spam

## Compatibility

This extension is compatible with GNOME Shell versions:
- 43.x
- 44.x  
- 45.x
- 46.x
- 47.x
- 48.x

## File Structure

```
batteryind@ash.ext.com/
├── extension.js      # Main extension logic
├── metadata.json     # Extension metadata and compatibility
├── icons/           # Custom icons
│   ├── on.png       # Notifications enabled icon
│   └── off.png      # Notifications disabled icon
└── README.md        # This file
```

## Technical Details

### Battery Health Optimization

This extension promotes good battery health practices:
- **40% Low Threshold**: Prevents deep discharge cycles that can damage lithium-ion batteries
- **80% High Threshold**: Avoids keeping batteries at 100% charge, which can reduce long-term capacity

### Performance

- **Lightweight**: Minimal system resource usage
- **Efficient Polling**: 30-second check intervals balance responsiveness with battery life
- **Non-blocking**: Uses GLib timeouts for asynchronous operation

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

### Notifications Not Appearing

1. Ensure notifications are enabled in GNOME Settings:
   - Open Settings → Notifications
   - Make sure notifications are enabled

2. Check if the extension icon shows notifications are enabled (green icon)

3. Test with battery levels in the trigger ranges (< 40% or ≥ 80%)

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

### v1.0.0
- Initial release
- Basic battery monitoring and notifications
- Toggle functionality for enabling/disabling notifications
- Support for GNOME Shell 43-48

---

⭐ If you find this extension useful, please consider giving it a star on GitHub!