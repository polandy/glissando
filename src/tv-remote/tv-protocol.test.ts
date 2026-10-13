import { describe, expect, it } from "vitest";
import { DocumentFormatError } from "../glissando-file/document-values";
import { readCommand, readPlaybackState, type PlaybackState } from "./tv-protocol";

const state: PlaybackState = {
  playing: true,
  ended: false,
  needsTvOk: false,
  positionSeconds: 12.5,
  durationSeconds: 200,
  pictureIndex: 2,
  pictureCount: 48,
  volume: 0.7,
  title: "July 2025",
};

describe("readPlaybackState", () => {
  it("reads what the TV reports", () => {
    expect(readPlaybackState({ ...state })).toEqual(state);
  });

  it.each([
    ["a position below zero", { positionSeconds: -1 }],
    ["a position that is not finite", { positionSeconds: Number.POSITIVE_INFINITY }],
    ["a volume above one", { volume: 1.1 }],
    ["a picture index that is no whole number", { pictureIndex: 1.5 }],
    ["a flag that is no boolean", { playing: "yes" }],
    ["a title that is no text", { title: 5 }],
    ["a key it does not know", { extra: true }],
  ])("refuses %s", (_name, change) => {
    expect(() => readPlaybackState({ ...state, ...change })).toThrow(DocumentFormatError);
  });

  it("refuses a missing key by name", () => {
    const { title: _title, ...without } = state;
    expect(() => readPlaybackState(without)).toThrow(/title/);
  });
});

describe("readCommand", () => {
  it.each(["play", "pause", "next", "previous", "restart", "disconnect"] as const)(
    "reads %s without a value",
    (type) => {
      expect(readCommand({ type })).toEqual({ type });
    },
  );

  it("reads seek and volume with their value", () => {
    expect(readCommand({ type: "seek", value: 30 })).toEqual({ type: "seek", value: 30 });
    expect(readCommand({ type: "volume", value: 0.4 })).toEqual({ type: "volume", value: 0.4 });
  });

  it.each([
    ["an unknown type", { type: "explode" }],
    ["a seek without a value", { type: "seek" }],
    ["a seek below zero", { type: "seek", value: -2 }],
    ["a volume above one", { type: "volume", value: 2 }],
    ["a value on play", { type: "play", value: 1 }],
    ["no object", "play"],
  ])("refuses %s", (_name, value) => {
    expect(() => readCommand(value)).toThrow(DocumentFormatError);
  });
});
