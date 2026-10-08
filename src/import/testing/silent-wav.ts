/** A mono 16-bit PCM WAV file of silence lasting `durationMs`, built byte by byte. */
export function silentWav(durationMs: number, sampleRate = 8000): Uint8Array<ArrayBuffer> {
  const bytesPerSample = 2;
  const dataLength = Math.round((sampleRate * durationMs) / 1000) * bytesPerSample;
  const headerLength = 44;
  const bytes = new Uint8Array(headerLength + dataLength);
  const view = new DataView(bytes.buffer);
  const ascii = (at: number, text: string) =>
    [...text].forEach((character, index) => view.setUint8(at + index, character.charCodeAt(0)));
  ascii(0, "RIFF");
  view.setUint32(4, headerLength - 8 + dataLength, true);
  ascii(8, "WAVE");
  ascii(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * bytesPerSample, true);
  view.setUint16(32, bytesPerSample, true);
  view.setUint16(34, bytesPerSample * 8, true);
  ascii(36, "data");
  view.setUint32(40, dataLength, true);
  return bytes;
}
