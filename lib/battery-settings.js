export const SETTINGS_SCHEMA = "org.gnome.shell.extensions.batteryind";

export const SETTINGS_KEYS = {
  enabled: "notification-enabled",
  cooldown: "notification-cooldown",
  lowerLimit: "lower-limit",
  upperLimit: "upper-limit",
};

export const DEFAULTS = {
  enabled: true,
  cooldown: 30,
  lowerLimit: 40,
  upperLimit: 80,
};

export const HYSTERESIS_MARGIN = 5;

export function clampInteger(value, minimum, maximum) {
  const numericValue = Number(value);
  const safeValue = Number.isFinite(numericValue)
    ? Math.trunc(numericValue)
    : minimum;

  return Math.min(maximum, Math.max(minimum, safeValue));
}

export function normalizeCooldown(value) {
  return clampInteger(value, 0, 3600);
}

export function normalizeThresholds(lowerLimit, upperLimit) {
  let lower = clampInteger(lowerLimit, 0, 99);
  let upper = clampInteger(upperLimit, 1, 100);

  if (lower >= upper) {
    upper = Math.min(100, lower + 1);
  }

  if (upper <= lower) {
    lower = Math.max(0, upper - 1);
  }

  return {
    lowerLimit: lower,
    upperLimit: upper,
  };
}
