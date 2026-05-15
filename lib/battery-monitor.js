import Gio from "gi://Gio";

const UPOWER_BUS_NAME = "org.freedesktop.UPower";
const UPOWER_DEVICE_PATH = "/org/freedesktop/UPower/devices/DisplayDevice";
const UPOWER_DEVICE_IFACE = "org.freedesktop.UPower.Device";

const CHARGING_STATES = new Set([1, 6]);

export class BatteryMonitor {
  constructor() {
    this._callbacks = new Set();
    this._proxy = null;
    this._proxySignalId = 0;
  }

  start() {
    this.stop();

    try {
      this._proxy = Gio.DBusProxy.new_sync(
        Gio.DBus.system,
        Gio.DBusProxyFlags.NONE,
        null,
        UPOWER_BUS_NAME,
        UPOWER_DEVICE_PATH,
        UPOWER_DEVICE_IFACE,
        null,
      );
      this._proxySignalId = this._proxy.connect("g-properties-changed", () => {
        this._emitState();
      });
    } catch (error) {
      logError(error, "BatteryInd: failed to create UPower proxy");
      this._proxy = null;
    }

    this._emitState();
  }

  stop() {
    if (this._proxy && this._proxySignalId) {
      this._proxy.disconnect(this._proxySignalId);
    }

    this._proxySignalId = 0;
    this._proxy = null;
  }

  destroy() {
    this.stop();
    this._callbacks.clear();
  }

  subscribe(callback) {
    this._callbacks.add(callback);
    callback(this.getState());

    return () => {
      this._callbacks.delete(callback);
    };
  }

  getState() {
    if (!this._proxy) {
      return {
        available: false,
        level: 0,
        charging: false,
        state: null,
      };
    }

    const percentage = this._readProperty("Percentage", 0);
    const state = this._readProperty("State", 0);

    return {
      available: true,
      level: Math.min(100, Math.max(0, Math.trunc(percentage))),
      charging: CHARGING_STATES.has(state),
      state,
    };
  }

  _readProperty(name, fallback) {
    try {
      const variant = this._proxy.get_cached_property(name);
      return variant ? variant.unpack() : fallback;
    } catch {
      return fallback;
    }
  }

  _emitState() {
    const state = this.getState();

    for (const callback of this._callbacks) {
      callback(state);
    }
  }
}
