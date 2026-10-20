/** Generated channels (-1..1), interleaved, as a 16-bit PCM WAV file, built byte by byte. */
export function pcmWav(
  channels: readonly Float32Array[],
  sampleRate: number,
): Uint8Array<ArrayBuffer> {
  const [firstChannel] = channels;
  if (!firstChannel) {
    throw new Error("pcmWav needs at least one channel");
  }
  const numChannels = channels.length;
  const bytesPerSample = 2;
  const fullScale = 0x7fff;
  const headerLength = 44;
  const frameCount = firstChannel.length;
  const dataLength = frameCount * numChannels * bytesPerSample;
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
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * bytesPerSample, true);
  view.setUint16(32, numChannels * bytesPerSample, true);
  view.setUint16(34, bytesPerSample * 8, true);
  ascii(36, "data");
  view.setUint32(40, dataLength, true);
  for (let frame = 0; frame < frameCount; frame += 1) {
    for (let channel = 0; channel < numChannels; channel += 1) {
      const sample = channels[channel]?.[frame] ?? 0;
      const clipped = Math.max(-1, Math.min(1, sample));
      const offset = headerLength + (frame * numChannels + channel) * bytesPerSample;
      view.setInt16(offset, Math.round(clipped * fullScale), true);
    }
  }
  return bytes;
}
