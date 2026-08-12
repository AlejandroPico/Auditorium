import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { SoundBankLoader, type BasicPreset, type BasicSample } from 'spessasynth_core';
import { instruments } from '../data/instruments';

const bytes = readFileSync(resolve('node_modules/generaluser/GeneralUser.sf2'));
const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
const soundBank = SoundBankLoader.fromArrayBuffer(buffer);
const sampleHashes = new WeakMap<BasicSample, string>();
const sampleHash = (sample: BasicSample) => {
  const cached = sampleHashes.get(sample);
  if (cached) return cached;
  const audio = sample.getAudioData();
  const value = createHash('sha256')
    .update(new Uint8Array(audio.buffer, audio.byteOffset, audio.byteLength))
    .digest('hex');
  sampleHashes.set(sample, value);
  return value;
};

const signature = (preset: BasicPreset) => JSON.stringify({
  globalGenerators: preset.globalZone.generators,
  globalModulators: preset.globalZone.modulators,
  zones: preset.zones.map((zone) => ({
    generators: zone.generators,
    modulators: zone.modulators,
    instrumentGlobalGenerators: zone.instrument.globalZone.generators,
    instrumentGlobalModulators: zone.instrument.globalZone.modulators,
    samples: zone.instrument.zones.map((instrumentZone) => ({
      audioSha256: sampleHash(instrumentZone.sample),
      sampleRate: instrumentZone.sample.sampleRate,
      originalKey: instrumentZone.sample.originalKey,
      pitchCorrection: instrumentZone.sample.pitchCorrection,
      loopStart: instrumentZone.sample.loopStart,
      loopEnd: instrumentZone.sample.loopEnd,
      sampleType: instrumentZone.sample.sampleType,
      keyRange: instrumentZone.keyRange,
      velocityRange: instrumentZone.velRange,
      generators: instrumentZone.generators,
      modulators: instrumentZone.modulators,
    })),
  })),
});

const sourcePresetFor = (instrument: (typeof instruments)[number]) => soundBank.presets.find((preset) =>
  !preset.isDrum
  && preset.bankMSB === instrument.bankMSB
  && preset.bankLSB === instrument.bankLSB
  && preset.program === instrument.program,
);

describe('banco instrumental real', () => {
  it('respalda cada ficha publicada con zonas y muestras presentes en el SF2', () => {
    for (const instrument of instruments) {
      const preset = sourcePresetFor(instrument);
      expect(preset?.name).toBe(instrument.sourcePreset);
      expect(preset?.zones.length).toBeGreaterThan(0);
      expect(preset?.zones.some((zone) => zone.instrument.zones.some((item) => item.sample.name.length > 0))).toBe(true);
      expect(preset?.zones.some((zone) => zone.instrument.zones.some((item) => {
        const audio = item.sample.getAudioData();
        return audio.length > 0 && audio.some((sample) => Math.abs(sample) > 0.0001);
      }))).toBe(true);
    }
  });

  it('no publica dos presets con la misma firma completa de muestras y programación', () => {
    const signatures = instruments.map((instrument) => signature(sourcePresetFor(instrument)!));
    expect(new Set(signatures).size).toBe(instruments.length);
  });

  it('usa material muestreado diferente en familias representativas', () => {
    const samples = (name: string) => sourcePresetFor(instruments.find((instrument) => instrument.name === name)!)!
      .zones.flatMap((zone) => zone.instrument.zones.map((item) => sampleHash(item.sample)));
    expect(samples('Stereo Grand')).not.toEqual(samples('Nylon Guitar'));
    expect(samples('Nylon Guitar')).not.toEqual(samples('Steel Guitar'));
    expect(samples('Shakuhachi')).not.toEqual(samples('Sitar'));
    expect(samples('Sitar')).not.toEqual(samples('Koto'));
  });
});
