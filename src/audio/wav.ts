const writeAscii = (view: DataView, offset: number, value: string) => {
  for (let index = 0; index < value.length; index += 1) view.setUint8(offset + index, value.charCodeAt(index));
};

export const encodeWav = (
  leftChunks: Float32Array[],
  rightChunks: Float32Array[],
  sampleRate: number,
  bitDepth: 16 | 24 | 32 = 24,
): Blob => {
  const totalFrames = leftChunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const channels = rightChunks.length ? 2 : 1;
  const bytesPerSample = bitDepth / 8;
  const dataLength = totalFrames * channels * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);

  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeAscii(view, 8, 'WAVE');
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channels * bytesPerSample, true);
  view.setUint16(32, channels * bytesPerSample, true);
  view.setUint16(34, bitDepth, true);
  writeAscii(view, 36, 'data');
  view.setUint32(40, dataLength, true);

  let offset = 44;
  for (let chunkIndex = 0; chunkIndex < leftChunks.length; chunkIndex += 1) {
    const left = leftChunks[chunkIndex];
    const right = rightChunks[chunkIndex] ?? left;
    for (let frame = 0; frame < left.length; frame += 1) {
      const values = channels === 2 ? [left[frame], right[frame]] : [left[frame]];
      for (const raw of values) {
        const value = Math.max(-1, Math.min(1, raw));
        if (bitDepth === 16) {
          view.setInt16(offset, value < 0 ? value * 0x8000 : value * 0x7fff, true);
          offset += 2;
        } else if (bitDepth === 24) {
          const sample = Math.round(value < 0 ? value * 0x800000 : value * 0x7fffff);
          view.setUint8(offset, sample & 0xff);
          view.setUint8(offset + 1, (sample >> 8) & 0xff);
          view.setUint8(offset + 2, (sample >> 16) & 0xff);
          offset += 3;
        } else {
          view.setInt32(offset, value < 0 ? value * 0x80000000 : value * 0x7fffffff, true);
          offset += 4;
        }
      }
    }
  }

  return new Blob([buffer], { type: 'audio/wav' });
};
