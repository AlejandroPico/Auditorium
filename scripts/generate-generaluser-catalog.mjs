import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { SoundBankLoader } from 'spessasynth_core';

const sourcePath = resolve('node_modules/generaluser/GeneralUser.sf2');
const outputPath = resolve('src/data/generated/generalUserPresets.ts');
const bytes = await readFile(sourcePath);
const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
const soundBank = SoundBankLoader.fromArrayBuffer(buffer);
const sampleHashes = new WeakMap();
const sampleSignature = (sample) => {
  if (!sampleHashes.has(sample)) {
    const audio = sample.getAudioData();
    const view = new Uint8Array(audio.buffer, audio.byteOffset, audio.byteLength);
    sampleHashes.set(sample, createHash('sha256').update(view).digest('hex'));
  }
  return {
    audioSha256: sampleHashes.get(sample),
    sampleRate: sample.sampleRate,
    originalKey: sample.originalKey,
    pitchCorrection: sample.pitchCorrection,
    loopStart: sample.loopStart,
    loopEnd: sample.loopEnd,
    sampleType: sample.sampleType,
  };
};
const soundSignature = (preset) => JSON.stringify({
  globalGenerators: preset.globalZone.generators,
  globalModulators: preset.globalZone.modulators,
  zones: preset.zones.map((zone) => ({
    generators: zone.generators,
    modulators: zone.modulators,
    instrumentGlobalGenerators: zone.instrument.globalZone.generators,
    instrumentGlobalModulators: zone.instrument.globalZone.modulators,
    samples: zone.instrument.zones.map((instrumentZone) => ({
      sample: sampleSignature(instrumentZone.sample),
      keyRange: instrumentZone.keyRange,
      velocityRange: instrumentZone.velRange,
      generators: instrumentZone.generators,
      modulators: instrumentZone.modulators,
    })),
  })),
});

const seenSignatures = new Set();
const presets = soundBank.presets
  .filter((preset) => !preset.isDrum && preset.program < 120)
  .filter((preset) => {
    const signature = soundSignature(preset);
    if (seenSignatures.has(signature)) return false;
    seenSignatures.add(signature);
    return true;
  })
  .map((preset) => ({
    name: preset.name,
    program: preset.program,
    bankMSB: preset.bankMSB,
    bankLSB: preset.bankLSB,
  }))
  .sort((a, b) => a.program - b.program || a.bankMSB - b.bankMSB || a.bankLSB - b.bankLSB || a.name.localeCompare(b.name));

const banner = `// Generated from GeneralUser.sf2 (${soundBank.soundBankInfo.name}).\n// Do not add names here by hand: run npm run catalog:soundfont.\n`;
const source = `${banner}export const generalUserPresets = ${JSON.stringify(presets, null, 2)} as const;\n`;
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, source, 'utf8');
console.log(`Generated ${presets.length} sample-backed presets from ${soundBank.soundBankInfo.name}.`);
