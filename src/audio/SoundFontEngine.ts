import { WorkletSynthesizer } from 'spessasynth_lib';
import soundFontUrl from 'generaluser/GeneralUser.sf2?url';
import processorUrl from 'spessasynth_lib/dist/spessasynth_processor.min.js?url';
import type { InstrumentPreset } from '../types';

interface SynthUnit {
  synth: WorkletSynthesizer;
  configuredPreset: Map<number, string>;
}

interface NodeRoute {
  unit: number;
  channel: number;
  target: AudioNode;
  configuredControls?: string;
}

interface InstrumentControls {
  expression: number;
  attack: number;
  release: number;
}

type LoadingState = 'idle' | 'loading' | 'ready' | 'error';

const BANK_ID = 'generaluser-gs-1.471';
const PREVIEW_CHANNEL = 15;
const channelsForUnit = (unit: number) => unit === 0
  ? Array.from({ length: 15 }, (_, channel) => channel)
  : Array.from({ length: 16 }, (_, channel) => channel);

export class AuditoriumSoundFontEngine {
  private context: AudioContext | null = null;
  private fontBuffer: ArrayBuffer | null = null;
  private units: SynthUnit[] = [];
  private routes = new Map<string, NodeRoute>();
  private initializePromise: Promise<void> | null = null;
  private loadingState: LoadingState = 'idle';
  private lastError: Error | null = null;
  private previewTarget: AudioNode | null = null;

  get state() { return this.loadingState; }
  get error() { return this.lastError; }
  get presetCount() { return 201; }

  async initialize(context: AudioContext, requiredNodeChannels = 1) {
    if (this.context && this.context !== context) this.dispose();
    this.context = context;
    if (!this.initializePromise) {
      this.loadingState = 'loading';
      this.initializePromise = this.loadCore(context).catch((error) => {
        this.loadingState = 'error';
        this.lastError = error instanceof Error ? error : new Error(String(error));
        this.initializePromise = null;
        throw this.lastError;
      });
    }
    await this.initializePromise;
    await this.ensureCapacity(requiredNodeChannels);
  }

  private async loadCore(context: AudioContext) {
    if (!context.audioWorklet) throw new Error('Este navegador no admite AudioWorklet; el banco instrumental real no puede ejecutarse.');
    const [response] = await Promise.all([
      fetch(soundFontUrl),
      context.audioWorklet.addModule(processorUrl),
    ]);
    if (!response.ok) throw new Error(`No se pudo cargar GeneralUser GS (${response.status}).`);
    this.fontBuffer = await response.arrayBuffer();
    await this.addUnit();
    this.loadingState = 'ready';
    this.lastError = null;
  }

  private async addUnit() {
    if (!this.context || !this.fontBuffer) throw new Error('El banco instrumental todavía no está disponible.');
    const synth = new WorkletSynthesizer(this.context, { eventsEnabled: false, oneOutput: false });
    synth.setLogLevel(false, false, false);
    await synth.soundBankManager.addSoundBank(this.fontBuffer.slice(0), BANK_ID);
    await synth.isReady;
    this.units.push({ synth, configuredPreset: new Map() });
  }

  private async ensureCapacity(nodeChannels: number) {
    const unitsNeeded = Math.max(1, Math.ceil((nodeChannels + 1) / 16));
    while (this.units.length < unitsNeeded) await this.addUnit();
  }

  clearRouting() {
    for (const route of this.routes.values()) {
      try { this.units[route.unit]?.synth.disconnectChannel(route.target, route.channel); } catch { /* already disconnected */ }
    }
    this.routes.clear();
    for (const unit of this.units) unit.configuredPreset.clear();
  }

  registerNode(nodeId: string, target: AudioNode) {
    const used = new Set(Array.from(this.routes.values()).map((route) => `${route.unit}:${route.channel}`));
    for (let unit = 0; unit < this.units.length; unit += 1) {
      const channel = channelsForUnit(unit).find((candidate) => !used.has(`${unit}:${candidate}`));
      if (channel === undefined) continue;
      this.units[unit].synth.connectChannel(target, channel);
      this.routes.set(nodeId, { unit, channel, target });
      return;
    }
    throw new Error('No hay canales SoundFont libres. Vuelve a sincronizar el proyecto para ampliar el motor.');
  }

  private selectPreset(unitIndex: number, channel: number, preset: InstrumentPreset, time: number) {
    const unit = this.units[unitIndex];
    if (!unit) return;
    if (unit.configuredPreset.get(channel) === preset.id) return;
    unit.synth.sendMessage([0xb0 | channel, 0, preset.bankMSB], 0, { time: Math.max(0, time - 0.003) });
    unit.synth.sendMessage([0xb0 | channel, 32, preset.bankLSB], 0, { time: Math.max(0, time - 0.002) });
    unit.synth.programChange(channel, preset.program, { time: Math.max(0, time - 0.001) });
    unit.configuredPreset.set(channel, preset.id);
  }

  private applyControls(route: NodeRoute, controls: InstrumentControls, time: number) {
    const unit = this.units[route.unit];
    if (!unit) return;
    const toMidi = (value: number) => Math.round(Math.max(0, Math.min(100, value)) * 1.27);
    const values = [toMidi(controls.expression), toMidi(controls.attack), toMidi(controls.release)];
    const signature = values.join(':');
    if (route.configuredControls === signature) return;
    unit.synth.sendMessage([0xb0 | route.channel, 11, values[0]], 0, { time });
    unit.synth.sendMessage([0xb0 | route.channel, 73, values[1]], 0, { time });
    unit.synth.sendMessage([0xb0 | route.channel, 72, values[2]], 0, { time });
    route.configuredControls = signature;
  }

  triggerNode(nodeId: string, preset: InstrumentPreset, pitch: number, velocity: number, time: number, duration: number, controls: InstrumentControls) {
    const route = this.routes.get(nodeId);
    if (!route) return false;
    const unit = this.units[route.unit];
    this.selectPreset(route.unit, route.channel, preset, time);
    this.applyControls(route, controls, Math.max(0, time - 0.0005));
    unit.synth.noteOn(route.channel, pitch, Math.round(Math.max(0, Math.min(1, velocity)) * 127), { time });
    unit.synth.noteOff(route.channel, pitch, { time: time + Math.max(0.03, duration) });
    return true;
  }

  async preview(preset: InstrumentPreset, target: AudioNode) {
    if (!this.context) throw new Error('El motor de audio aún no está iniciado.');
    await this.initialize(this.context, 1);
    const unit = this.units[0];
    if (this.previewTarget !== target) {
      if (this.previewTarget) {
        try { unit.synth.disconnectChannel(this.previewTarget, PREVIEW_CHANNEL); } catch { /* already disconnected */ }
      }
      unit.synth.connectChannel(target, PREVIEW_CHANNEL);
      this.previewTarget = target;
    }
    const start = this.context.currentTime + 0.035;
    unit.synth.sendMessage([0xb0 | PREVIEW_CHANNEL, 123, 0], 0, { time: start });
    this.selectPreset(0, PREVIEW_CHANNEL, preset, start + 0.01);
    unit.synth.sendMessage([0xb0 | PREVIEW_CHANNEL, 11, 112], 0, { time: start + 0.011 });
    unit.synth.sendMessage([0xb0 | PREVIEW_CHANNEL, 73, 64], 0, { time: start + 0.012 });
    unit.synth.sendMessage([0xb0 | PREVIEW_CHANNEL, 72, 64], 0, { time: start + 0.013 });
    preset.previewPitches.forEach((pitch, index) => {
      const when = start + 0.04 + index * 0.26;
      const length = preset.program >= 40 && preset.program < 80 ? 0.58 : preset.program >= 88 && preset.program < 104 ? 0.72 : 0.24;
      unit.synth.noteOn(PREVIEW_CHANNEL, pitch, Math.max(46, 110 - index * 7), { time: when });
      unit.synth.noteOff(PREVIEW_CHANNEL, pitch, { time: when + length });
    });
  }

  stopAll() {
    for (const unit of this.units) unit.synth.stopAll(false);
  }

  dispose() {
    this.clearRouting();
    for (const unit of this.units) unit.synth.destroy();
    this.units = [];
    this.fontBuffer = null;
    this.context = null;
    this.initializePromise = null;
    this.loadingState = 'idle';
    this.previewTarget = null;
  }
}
