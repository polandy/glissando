/** The picture editor's two frames: where the motion starts and where it ends. */
export const FRAME_KEYS = ["from", "to"] as const;
export type FrameKey = (typeof FRAME_KEYS)[number];

export function isFrameKey(value: string): value is FrameKey {
  return FRAME_KEYS.some((key) => key === value);
}
