const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3600;

const twoDigits = (value: number) => String(value).padStart(2, "0");

/** "0:12", "4:10", "1:02:03": the page's time display, in whole seconds. */
export function formatPlayTime(seconds: number): string {
  const whole = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const hours = Math.floor(whole / SECONDS_PER_HOUR);
  const minutes = Math.floor((whole % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE);
  const rest = twoDigits(whole % SECONDS_PER_MINUTE);
  return hours > 0 ? `${hours}:${twoDigits(minutes)}:${rest}` : `${minutes}:${rest}`;
}
