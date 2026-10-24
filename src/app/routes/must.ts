/** `value`, once it is not null; throws naming `what`, for state a screen only reads once shown. */
export function must<Value>(value: Value | null, what: string): Value {
  if (value === null) throw new Error(`${what} is not ready yet`);
  return value;
}
