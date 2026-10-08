/** The picture editor's two frames: where the motion starts and where it ends. */
export const FRAME_KEYS = ["from", "to"] as const;
export type FrameKey = (typeof FRAME_KEYS)[number];
