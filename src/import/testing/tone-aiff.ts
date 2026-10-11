const AIFF_HEADER_BYTES = 54;
const CHANNELS = 2;
const BYTES_PER_SAMPLE = 2;
const SAMPLE_RATE = 44_100;
const TONE_HZ = 440;
const AMPLITUDE = 8000;

/** IEEE 754 80-bit extended, as AIFF stores its sample rate; exact for whole numbers. */
function extended80(view: DataView, at: number, value: number): void {
  const exponent = Math.floor(Math.log2(value));
  view.setUint16(at, 16383 + exponent);
  const mantissa = value / 2 ** exponent;
  view.setUint32(at + 2, Math.floor(mantissa * 2 ** 31));
  view.setUint32(at + 6, 0);
}

/** A stereo 16-bit AIFF of a 440 Hz sine tone lasting `seconds`, built byte by byte. */
export function toneAiff(seconds: number): Uint8Array<ArrayBuffer> {
  const frames = Math.round(seconds * SAMPLE_RATE);
  const dataLength = frames * CHANNELS * BYTES_PER_SAMPLE;
  const bytes = new Uint8Array(AIFF_HEADER_BYTES + dataLength);
  const view = new DataView(bytes.buffer);
  const ascii = (at: number, text: string) =>
    [...text].forEach((character, index) => view.setUint8(at + index, character.charCodeAt(0)));
  ascii(0, "FORM");
  view.setUint32(4, bytes.length - 8);
  ascii(8, "AIFF");
  ascii(12, "COMM");
  view.setUint32(16, 18);
  view.setUint16(20, CHANNELS);
  view.setUint32(22, frames);
  view.setUint16(26, BYTES_PER_SAMPLE * 8);
  extended80(view, 28, SAMPLE_RATE);
  ascii(38, "SSND");
  view.setUint32(42, dataLength + 8);
  view.setUint32(46, 0); // offset
  view.setUint32(50, 0); // block size
  for (let frame = 0; frame < frames; frame += 1) {
    const sample = Math.round(AMPLITUDE * Math.sin((2 * Math.PI * TONE_HZ * frame) / SAMPLE_RATE));
    for (let channel = 0; channel < CHANNELS; channel += 1) {
      view.setInt16(AIFF_HEADER_BYTES + (frame * CHANNELS + channel) * BYTES_PER_SAMPLE, sample);
    }
  }
  return bytes;
}
