/** Generated samples (-1..1) as a mono 16-bit PCM WAV file, built byte by byte. */
export function pcmWav(samples: Float32Array, sampleRate: number): Uint8Array<ArrayBuffer> {
  const bytesPerSample = 2;
  const fullScale = 0x7fff;
  const headerLength = 44;
  const dataLength = samples.length * bytesPerSample;
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
  samples.forEach((sample, index) => {
    const clipped = Math.max(-1, Math.min(1, sample));
    view.setInt16(headerLength + index * bytesPerSample, Math.round(clipped * fullScale), true);
  });
  return bytes;
}
