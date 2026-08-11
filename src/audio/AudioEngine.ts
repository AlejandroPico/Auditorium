import { instrumentById } from '../data/instruments';
import type { AuditoriumProject, InstrumentPreset, ModuleData, StudioNode, Workspace } from '../types';
import { encodeWav } from './wav';

interface RuntimeNode {
  id: string;
  input: AudioNode;
  output: AudioNode;
  data: ModuleData;
  nodes: AudioNode[];
  sources: AudioScheduledSourceNode[];
}

const dbToGain = (db: number) => 10 ** (db / 20);
const pct = (value: unknown, fallback = 100) => Number(value ?? fallback) / 100;
const numberParam = (data: ModuleData, key: string, fallback: number) => Number(data.params[key] ?? fallback);

const makeDistortionCurve = (amount: number, soft = true) => {
  const samples = 4096;
  const curve = new Float32Array(samples);
  const drive = 1 + amount * 1.6;
  for (let index = 0; index < samples; index += 1) {
    const x = (index * 2) / (samples - 1) - 1;
    curve[index] = soft ? Math.tanh(x * drive) / Math.tanh(drive) : Math.max(-1, Math.min(1, x * drive));
  }
  return curve;
};

const createImpulse = (context: AudioContext, duration: number, decay: number) => {
  const length = Math.max(1, Math.floor(context.sampleRate * duration));
  const impulse = context.createBuffer(2, length, context.sampleRate);
  for (let channel = 0; channel < 2; channel += 1) {
    const data = impulse.getChannelData(channel);
    for (let index = 0; index < length; index += 1) {
      data[index] = (Math.random() * 2 - 1) * ((1 - index / length) ** decay);
    }
  }
  return impulse;
};

const pitchToFrequency = (pitch: number) => 440 * 2 ** ((pitch - 69) / 12);

class AuditoriumAudioEngine {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private masterAnalyser: AnalyserNode | null = null;
  private runtimes = new Map<string, RuntimeNode>();
  private nodeAnalysers = new Map<string, AnalyserNode>();
  private buffers = new Map<string, AudioBuffer>();
  private mediaSources = new Map<string, AudioBufferSourceNode>();
  private streams = new Map<string, MediaStream>();
  private schedulerTimer: number | null = null;
  private nextStepTime = 0;
  private currentStep = 0;
  private project: AuditoriumProject | null = null;
  private recordingProcessor: ScriptProcessorNode | null = null;
  private recordingSink: GainNode | null = null;
  private recordedLeft: Float32Array[] = [];
  private recordedRight: Float32Array[] = [];
  private started = false;

  async init() {
    if (!this.context) {
      const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) throw new Error('Este navegador no ofrece Web Audio API.');
      this.context = new AudioContextClass({ latencyHint: 'interactive', sampleRate: 48000 });
      this.masterGain = this.context.createGain();
      this.masterAnalyser = this.context.createAnalyser();
      this.masterAnalyser.fftSize = 4096;
      this.masterAnalyser.smoothingTimeConstant = 0.74;
      this.masterGain.connect(this.masterAnalyser);
      this.masterAnalyser.connect(this.context.destination);
    }
    if (this.context.state === 'suspended') await this.context.resume();
    return this.context;
  }

  get audioContext() {
    return this.context;
  }

  get analyser() {
    return this.masterAnalyser;
  }

  getAnalyser(nodeId?: string) {
    return nodeId ? this.nodeAnalysers.get(nodeId) ?? this.masterAnalyser : this.masterAnalyser;
  }

  async syncProject(project: AuditoriumProject) {
    await this.init();
    this.project = project;
    if (!this.context || !this.masterGain) return;
    this.masterGain.gain.setTargetAtTime(dbToGain(project.transport.masterGain), this.context.currentTime, 0.015);
    const wasStarted = this.started;
    this.clearGraph();
    this.buildWorkspace(project.workspaces[project.rootWorkspaceId], project);
    if (wasStarted) this.startMediaSources();
  }

  private clearGraph() {
    for (const runtime of this.runtimes.values()) {
      for (const source of runtime.sources) {
        try { source.stop(); } catch { /* already stopped */ }
        try { source.disconnect(); } catch { /* disconnected */ }
      }
      for (const node of runtime.nodes) {
        try { node.disconnect(); } catch { /* disconnected */ }
      }
    }
    for (const source of this.mediaSources.values()) {
      try { source.stop(); } catch { /* already stopped */ }
    }
    this.mediaSources.clear();
    this.runtimes.clear();
    this.nodeAnalysers.clear();
  }

  private buildWorkspace(workspace: Workspace, project: AuditoriumProject, externalInput?: AudioNode, externalOutput?: AudioNode) {
    if (!this.context || !this.masterGain) return;
    for (const node of workspace.nodes) {
      const runtime = this.createRuntime(node, project, externalInput, externalOutput);
      this.runtimes.set(node.id, runtime);
    }
    for (const edge of workspace.edges) {
      const source = this.runtimes.get(edge.source);
      const target = this.runtimes.get(edge.target);
      if (!source || !target || source.output === target.input) continue;
      try { source.output.connect(target.input); } catch { /* incompatible control/audio path */ }
    }
  }

  private makePassRuntime(node: StudioNode) {
    const input = this.context!.createGain();
    const output = this.context!.createGain();
    input.connect(output);
    return { id: node.id, input, output, data: node.data, nodes: [input, output], sources: [] } satisfies RuntimeNode;
  }

  private createRuntime(node: StudioNode, project: AuditoriumProject, externalInput?: AudioNode, externalOutput?: AudioNode): RuntimeNode {
    const context = this.context!;
    const data = node.data;
    const type = data.moduleType;

    if (type === 'portalIn' && externalInput) {
      return { id: node.id, input: externalInput, output: externalInput, data, nodes: [], sources: [] };
    }
    if (type === 'portalOut' && externalOutput) {
      return { id: node.id, input: externalOutput, output: externalOutput, data, nodes: [], sources: [] };
    }
    if (type === 'capsule') {
      const input = context.createGain();
      const output = context.createGain();
      const child = data.workspaceId ? project.workspaces[data.workspaceId] : undefined;
      if (child) this.buildWorkspace(child, project, input, output);
      else input.connect(output);
      return { id: node.id, input, output, data, nodes: [input, output], sources: [] };
    }

    if (['oscillator', 'instrument', 'drumMachine', 'pianoRoll', 'score', 'fmSynth', 'wavetable', 'granular', 'turntable', 'stemDeck', 'sampler', 'performancePads', 'stepSequencer', 'microphone', 'audioInput', 'midiInput', 'noise', 'lfo'].includes(type)) {
      const input = context.createGain();
      const output = context.createGain();
      const level = type === 'noise' ? pct(data.params.level, 20) : pct(data.params.level, 75);
      output.gain.value = data.mute ? 0 : Math.min(1.5, level);
      input.connect(output);
      return { id: node.id, input, output, data, nodes: [input, output], sources: [] };
    }

    if (type === 'eq3') {
      const input = context.createGain();
      const low = context.createBiquadFilter();
      const mid = context.createBiquadFilter();
      const high = context.createBiquadFilter();
      const output = context.createGain();
      low.type = 'lowshelf'; low.frequency.value = 180; low.gain.value = numberParam(data, 'low', 0);
      mid.type = 'peaking'; mid.frequency.value = numberParam(data, 'midFreq', 1000); mid.Q.value = 0.8; mid.gain.value = numberParam(data, 'mid', 0);
      high.type = 'highshelf'; high.frequency.value = 6200; high.gain.value = numberParam(data, 'high', 0);
      input.connect(low).connect(mid).connect(high).connect(output);
      return { id: node.id, input, output, data, nodes: [input, low, mid, high, output], sources: [] };
    }

    if (['filter', 'parametricEq', 'autoFilter'].includes(type)) {
      const input = context.createGain();
      const filter = context.createBiquadFilter();
      const output = context.createGain();
      filter.type = type === 'parametricEq' ? 'peaking' : String(data.params.mode ?? 'lowpass') as BiquadFilterType;
      filter.frequency.value = numberParam(data, 'frequency', 5000);
      filter.Q.value = numberParam(data, 'q', 0.8);
      if (type === 'parametricEq') filter.gain.value = numberParam(data, 'gain', 0);
      const sources: AudioScheduledSourceNode[] = [];
      const nodes: AudioNode[] = [input, filter, output];
      if (type === 'autoFilter') {
        const lfo = context.createOscillator();
        const depth = context.createGain();
        lfo.frequency.value = numberParam(data, 'rate', 1);
        depth.gain.value = numberParam(data, 'frequency', 1400) * pct(data.params.depth, 50) * 0.8;
        lfo.connect(depth).connect(filter.frequency);
        lfo.start();
        sources.push(lfo); nodes.push(lfo, depth);
      }
      input.connect(filter).connect(output);
      return { id: node.id, input, output, data, nodes, sources };
    }

    if (type === 'compressor' || type === 'limiter' || type === 'gate' || type === 'transient') {
      const input = context.createGain();
      const compressor = context.createDynamicsCompressor();
      const makeup = context.createGain();
      const output = context.createGain();
      compressor.threshold.value = type === 'limiter' ? numberParam(data, 'ceiling', -1) : numberParam(data, 'threshold', -24);
      compressor.knee.value = type === 'limiter' ? 0 : 18;
      compressor.ratio.value = type === 'limiter' ? 20 : numberParam(data, 'ratio', type === 'gate' ? 12 : 4);
      compressor.attack.value = numberParam(data, 'attack', 10) / 1000;
      compressor.release.value = numberParam(data, 'release', 160) / 1000;
      makeup.gain.value = dbToGain(numberParam(data, 'makeup', 0));
      input.connect(compressor).connect(makeup).connect(output);
      return { id: node.id, input, output, data, nodes: [input, compressor, makeup, output], sources: [] };
    }

    if (type === 'multiband') return this.createMultiband(node);

    if (type === 'delay') {
      const input = context.createGain();
      const dry = context.createGain();
      const wet = context.createGain();
      const delay = context.createDelay(4);
      const feedback = context.createGain();
      const filter = context.createBiquadFilter();
      const output = context.createGain();
      const mix = pct(data.params.mix, 24);
      dry.gain.value = Math.cos(mix * Math.PI * 0.5);
      wet.gain.value = Math.sin(mix * Math.PI * 0.5);
      delay.delayTime.value = numberParam(data, 'time', 320) / 1000;
      feedback.gain.value = Math.min(0.94, pct(data.params.feedback, 34));
      filter.type = 'lowpass'; filter.frequency.value = numberParam(data, 'filter', 7800);
      input.connect(dry).connect(output);
      input.connect(delay).connect(filter).connect(wet).connect(output);
      filter.connect(feedback).connect(delay);
      return { id: node.id, input, output, data, nodes: [input, dry, wet, delay, feedback, filter, output], sources: [] };
    }

    if (type === 'reverb' || type === 'convolution') {
      const input = context.createGain();
      const dry = context.createGain();
      const wet = context.createGain();
      const convolver = context.createConvolver();
      const output = context.createGain();
      const mix = pct(data.params.mix, 30);
      dry.gain.value = Math.cos(mix * Math.PI * 0.5);
      wet.gain.value = Math.sin(mix * Math.PI * 0.5);
      convolver.buffer = createImpulse(context, Math.min(8, numberParam(data, 'decay', 2.8)), 2.2);
      input.connect(dry).connect(output);
      input.connect(convolver).connect(wet).connect(output);
      return { id: node.id, input, output, data, nodes: [input, dry, wet, convolver, output], sources: [] };
    }

    if (['chorus', 'flanger', 'phaser', 'tremolo'].includes(type)) return this.createModulation(node);

    if (['distortion', 'clipper', 'bitcrusher'].includes(type)) {
      const input = context.createGain();
      const dry = context.createGain();
      const wet = context.createGain();
      const shaper = context.createWaveShaper();
      const output = context.createGain();
      const mix = pct(data.params.mix, type === 'clipper' ? 100 : 65);
      const drive = type === 'clipper' ? Math.abs(numberParam(data, 'threshold', -3)) * 0.3 : pct(data.params.drive, 35) * 8;
      shaper.curve = makeDistortionCurve(drive, type !== 'bitcrusher');
      shaper.oversample = '4x';
      dry.gain.value = 1 - mix; wet.gain.value = mix;
      input.connect(dry).connect(output);
      input.connect(shaper).connect(wet).connect(output);
      return { id: node.id, input, output, data, nodes: [input, dry, wet, shaper, output], sources: [] };
    }

    if (['gain', 'mixer', 'crossfader', 'merger', 'splitter', 'sendReturn'].includes(type)) {
      const input = context.createGain();
      const pan = context.createStereoPanner();
      const output = context.createGain();
      const gainValue = type === 'gain' || type === 'mixer' ? dbToGain(numberParam(data, 'gain', 0)) : 1;
      input.gain.value = data.mute ? 0 : gainValue;
      pan.pan.value = Math.max(-1, Math.min(1, numberParam(data, 'pan', 0) / 100));
      input.connect(pan).connect(output);
      return { id: node.id, input, output, data, nodes: [input, pan, output], sources: [] };
    }

    if (['spectrum', 'oscilloscope', 'loudness', 'tuner'].includes(type)) {
      const input = context.createGain();
      const analyser = context.createAnalyser();
      const output = context.createGain();
      analyser.fftSize = Math.min(32768, Math.max(256, numberParam(data, 'size', 4096)));
      analyser.smoothingTimeConstant = pct(data.params.smoothing, 72);
      input.connect(analyser).connect(output);
      this.nodeAnalysers.set(node.id, analyser);
      return { id: node.id, input, output, data, nodes: [input, analyser, output], sources: [] };
    }

    if (type === 'output') {
      const input = context.createGain();
      const limiter = context.createDynamicsCompressor();
      const output = context.createGain();
      input.gain.value = dbToGain(numberParam(data, 'gain', -3));
      limiter.threshold.value = -1; limiter.knee.value = 0; limiter.ratio.value = 20; limiter.attack.value = 0.002; limiter.release.value = 0.08;
      input.connect(limiter).connect(output).connect(this.masterGain!);
      return { id: node.id, input, output, data, nodes: [input, limiter, output], sources: [] };
    }

    if (type === 'spatializer') {
      const input = context.createGain();
      const panner = context.createPanner();
      const output = context.createGain();
      const azimuth = numberParam(data, 'azimuth', 0) * Math.PI / 180;
      const elevation = numberParam(data, 'elevation', 0) * Math.PI / 180;
      const distance = numberParam(data, 'distance', 1);
      panner.positionX.value = Math.sin(azimuth) * Math.cos(elevation) * distance;
      panner.positionY.value = Math.sin(elevation) * distance;
      panner.positionZ.value = -Math.cos(azimuth) * Math.cos(elevation) * distance;
      panner.panningModel = 'HRTF';
      input.connect(panner).connect(output);
      return { id: node.id, input, output, data, nodes: [input, panner, output], sources: [] };
    }

    return this.makePassRuntime(node);
  }

  private createMultiband(node: StudioNode): RuntimeNode {
    const context = this.context!;
    const data = node.data;
    const input = context.createGain();
    const sum = context.createGain();
    const clipper = context.createWaveShaper();
    const output = context.createGain();
    const crossovers = [numberParam(data, 'cross1', 120), numberParam(data, 'cross2', 1200), numberParam(data, 'cross3', 6500)];
    const amount = pct(data.params.amount, 58);
    const down = pct(data.params.down, 42);
    const up = pct(data.params.up, 34);
    const nodes: AudioNode[] = [input, sum, clipper, output];

    for (let band = 0; band < 4; band += 1) {
      let last: AudioNode = input;
      if (band > 0) {
        const high = context.createBiquadFilter();
        high.type = 'highpass'; high.frequency.value = crossovers[band - 1]; high.Q.value = Math.SQRT1_2;
        last.connect(high); last = high; nodes.push(high);
      }
      if (band < 3) {
        const low = context.createBiquadFilter();
        low.type = 'lowpass'; low.frequency.value = crossovers[band]; low.Q.value = Math.SQRT1_2;
        last.connect(low); last = low; nodes.push(low);
      }
      const compressor = context.createDynamicsCompressor();
      compressor.threshold.value = -18 - down * 30;
      compressor.ratio.value = 1 + amount * down * 11;
      compressor.knee.value = 16;
      compressor.attack.value = 0.008;
      compressor.release.value = 0.12;
      const makeup = context.createGain();
      makeup.gain.value = dbToGain(up * amount * 5.5);
      last.connect(compressor).connect(makeup).connect(sum);
      nodes.push(compressor, makeup);
    }
    clipper.curve = makeDistortionCurve(pct(data.params.clip, 8) * 4, true);
    clipper.oversample = data.params.oversampling ? '4x' : 'none';
    sum.connect(clipper).connect(output);
    return { id: node.id, input, output, data, nodes, sources: [] };
  }

  private createModulation(node: StudioNode): RuntimeNode {
    const context = this.context!;
    const data = node.data;
    const type = data.moduleType;
    const input = context.createGain();
    const output = context.createGain();
    const lfo = context.createOscillator();
    const depth = context.createGain();
    const nodes: AudioNode[] = [input, output, lfo, depth];
    lfo.frequency.value = numberParam(data, 'rate', 0.8);
    lfo.type = String(data.params.shape ?? 'sine') as OscillatorType;

    if (type === 'tremolo') {
      const amp = context.createGain();
      amp.gain.value = 1 - pct(data.params.depth, 45) * 0.5;
      depth.gain.value = pct(data.params.depth, 45) * 0.5;
      lfo.connect(depth).connect(amp.gain);
      input.connect(amp).connect(output);
      nodes.push(amp);
    } else if (type === 'phaser') {
      const filter = context.createBiquadFilter();
      filter.type = 'allpass'; filter.frequency.value = 900; filter.Q.value = 4;
      depth.gain.value = 700 * pct(data.params.depth, 65);
      lfo.connect(depth).connect(filter.frequency);
      input.connect(filter).connect(output);
      nodes.push(filter);
    } else {
      const dry = context.createGain();
      const wet = context.createGain();
      const delay = context.createDelay(0.08);
      const mix = pct(data.params.mix, 40);
      const base = type === 'flanger' ? 0.003 : 0.018;
      delay.delayTime.value = base;
      depth.gain.value = base * pct(data.params.depth, 45) * 0.75;
      dry.gain.value = 1 - mix * 0.5; wet.gain.value = mix;
      lfo.connect(depth).connect(delay.delayTime);
      input.connect(dry).connect(output);
      input.connect(delay).connect(wet).connect(output);
      nodes.push(dry, wet, delay);
    }
    lfo.start();
    return { id: node.id, input, output, data, nodes, sources: [lfo] };
  }

  async play() {
    await this.init();
    if (!this.project) return;
    if (!this.runtimes.size) await this.syncProject(this.project);
    this.started = true;
    this.currentStep = 0;
    this.nextStepTime = this.context!.currentTime + 0.04;
    this.startMediaSources();
    if (this.schedulerTimer !== null) window.clearInterval(this.schedulerTimer);
    this.schedulerTimer = window.setInterval(() => this.scheduleAhead(), 25);
  }

  pause() {
    this.started = false;
    if (this.schedulerTimer !== null) window.clearInterval(this.schedulerTimer);
    this.schedulerTimer = null;
    for (const source of this.mediaSources.values()) {
      try { source.stop(); } catch { /* already stopped */ }
    }
    this.mediaSources.clear();
  }

  stop() {
    this.pause();
    this.currentStep = 0;
  }

  private scheduleAhead() {
    if (!this.context || !this.project || !this.started) return;
    const secondsPerStep = 60 / this.project.transport.bpm / 4;
    while (this.nextStepTime < this.context.currentTime + 0.12) {
      this.scheduleStep(this.currentStep, this.nextStepTime, secondsPerStep);
      this.currentStep = (this.currentStep + 1) % 16;
      this.nextStepTime += secondsPerStep;
    }
  }

  private scheduleStep(step: number, time: number, secondsPerStep: number) {
    if (!this.project) return;
    for (const runtime of this.runtimes.values()) {
      if (runtime.data.mute || runtime.data.bypass) continue;
      const type = runtime.data.moduleType;
      if (type === 'drumMachine' && runtime.data.drumPattern?.[step]) {
        const kind = step % 8 === 0 ? 'kick' : step % 4 === 2 ? 'snare' : 'hat';
        this.triggerDrum(runtime, kind, time);
      }
      const sequence = runtime.data.sequence;
      if (sequence && ['instrument', 'oscillator', 'pianoRoll', 'score', 'fmSynth', 'wavetable', 'granular'].includes(type)) {
        for (const note of sequence.filter((event) => event.step % 16 === step)) {
          this.triggerVoice(runtime, note.pitch, note.velocity, time, secondsPerStep * note.length);
        }
      }
    }
    if (this.project.transport.metronome && step % 4 === 0) this.triggerClick(time, step === 0);
  }

  private triggerVoice(runtime: RuntimeNode, pitch: number, velocity: number, time: number, duration: number) {
    const context = this.context!;
    const preset = runtime.data.instrumentId ? instrumentById.get(runtime.data.instrumentId) : undefined;
    const type = runtime.data.moduleType;
    const waveform = type === 'fmSynth' ? 'sine' : type === 'wavetable' ? 'sawtooth' : preset?.waveform ?? String(runtime.data.params.wave ?? 'triangle') as OscillatorType;
    const attack = preset?.attack ?? Math.max(0.004, pct(runtime.data.params.attack, 10) * 0.3);
    const release = preset?.release ?? Math.max(0.08, pct(runtime.data.params.release, 35) * 1.5);
    const filterFrequency = preset?.filter ?? 6500;
    const oscillator = context.createOscillator();
    const companion = type === 'fmSynth' || type === 'wavetable' ? context.createOscillator() : null;
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    oscillator.type = waveform;
    oscillator.frequency.setValueAtTime(pitchToFrequency(pitch), time);
    if (preset?.detune) oscillator.detune.value = preset.detune;
    filter.type = 'lowpass'; filter.frequency.value = filterFrequency; filter.Q.value = 0.7;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, velocity * 0.22), time + attack);
    gain.gain.setValueAtTime(Math.max(0.0002, velocity * 0.18), time + Math.max(attack, duration));
    gain.gain.exponentialRampToValueAtTime(0.0001, time + Math.max(attack, duration) + release);
    oscillator.connect(filter).connect(gain).connect(runtime.output);
    oscillator.start(time); oscillator.stop(time + duration + release + 0.05);
    if (companion) {
      companion.type = type === 'fmSynth' ? 'sine' : 'sawtooth';
      companion.frequency.value = pitchToFrequency(pitch) * (type === 'fmSynth' ? numberParam(runtime.data, 'ratio', 2) : 1.006);
      companion.detune.value = type === 'wavetable' ? 7 : 0;
      const companionGain = context.createGain();
      companionGain.gain.value = type === 'fmSynth' ? 0.08 : 0.12;
      companion.connect(companionGain).connect(filter);
      companion.start(time); companion.stop(time + duration + release + 0.05);
    }
  }

  private triggerDrum(runtime: RuntimeNode, kind: 'kick' | 'snare' | 'hat', time: number) {
    const context = this.context!;
    const gain = context.createGain();
    if (kind === 'kick') {
      const oscillator = context.createOscillator();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(150, time);
      oscillator.frequency.exponentialRampToValueAtTime(48, time + 0.12);
      gain.gain.setValueAtTime(0.65, time); gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.32);
      oscillator.connect(gain).connect(runtime.output); oscillator.start(time); oscillator.stop(time + 0.34);
      return;
    }
    const length = kind === 'hat' ? 0.06 : 0.18;
    const buffer = context.createBuffer(1, Math.floor(context.sampleRate * length), context.sampleRate);
    const channel = buffer.getChannelData(0);
    for (let index = 0; index < channel.length; index += 1) channel[index] = Math.random() * 2 - 1;
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    filter.type = kind === 'hat' ? 'highpass' : 'bandpass'; filter.frequency.value = kind === 'hat' ? 6500 : 1800; filter.Q.value = 0.8;
    gain.gain.setValueAtTime(kind === 'hat' ? 0.18 : 0.32, time); gain.gain.exponentialRampToValueAtTime(0.0001, time + length);
    source.buffer = buffer; source.connect(filter).connect(gain).connect(runtime.output); source.start(time);
  }

  private triggerClick(time: number, accent: boolean) {
    const oscillator = this.context!.createOscillator();
    const gain = this.context!.createGain();
    oscillator.frequency.value = accent ? 1320 : 880;
    gain.gain.setValueAtTime(0.13, time); gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.035);
    oscillator.connect(gain).connect(this.masterGain!); oscillator.start(time); oscillator.stop(time + 0.04);
  }

  triggerExternal(nodeId: string, pitch: number, velocity = 0.8, duration = 0.35) {
    const runtime = this.runtimes.get(nodeId) ?? Array.from(this.runtimes.values()).find((item) => ['instrument', 'oscillator', 'pianoRoll', 'score'].includes(item.data.moduleType));
    if (!runtime || !this.context) return;
    this.triggerVoice(runtime, pitch, velocity, this.context.currentTime + 0.005, duration);
  }

  async previewInstrument(preset: InstrumentPreset) {
    const context = await this.init();
    if (!this.masterGain) return;
    const previewBus = context.createGain();
    previewBus.gain.value = 0.72;
    previewBus.connect(this.masterGain);
    const startedAt = context.currentTime + 0.015;

    [60, 64, 67].forEach((pitch, index) => {
      const time = startedAt + index * 0.28;
      const duration = 0.22;
      const oscillator = context.createOscillator();
      const filter = context.createBiquadFilter();
      const gain = context.createGain();
      oscillator.type = preset.waveform;
      oscillator.frequency.setValueAtTime(pitchToFrequency(pitch), time);
      oscillator.detune.value = preset.detune ?? 0;
      filter.type = 'lowpass';
      filter.frequency.value = preset.filter;
      filter.Q.value = 0.7;
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.exponentialRampToValueAtTime(0.16, time + Math.max(0.006, preset.attack));
      gain.gain.setValueAtTime(0.13, time + duration);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + duration + Math.min(0.8, preset.release));
      oscillator.connect(filter).connect(gain).connect(previewBus);
      oscillator.start(time);
      oscillator.stop(time + duration + Math.min(0.8, preset.release) + 0.04);
    });

    window.setTimeout(() => previewBus.disconnect(), 1900);
  }

  async loadAudioFile(nodeId: string, file: File) {
    const context = await this.init();
    const data = await file.arrayBuffer();
    const buffer = await context.decodeAudioData(data.slice(0));
    this.buffers.set(nodeId, buffer);
    return { duration: buffer.duration, sampleRate: buffer.sampleRate, channels: buffer.numberOfChannels };
  }

  private startMediaSources() {
    if (!this.context) return;
    for (const [nodeId, buffer] of this.buffers) {
      const runtime = this.runtimes.get(nodeId);
      if (!runtime || !['turntable', 'sampler', 'stemDeck'].includes(runtime.data.moduleType)) continue;
      const source = this.context.createBufferSource();
      source.buffer = buffer;
      source.loop = Boolean(runtime.data.params.loop);
      const pitch = numberParam(runtime.data, 'pitch', 0);
      source.playbackRate.value = runtime.data.moduleType === 'turntable' ? 1 + pitch / 100 : 2 ** (pitch / 12);
      source.connect(runtime.output);
      source.start();
      this.mediaSources.set(nodeId, source);
    }
  }

  scratch(nodeId: string, velocity: number) {
    const source = this.mediaSources.get(nodeId);
    if (!source || !this.context) return;
    const rate = Math.max(-2.5, Math.min(2.5, velocity));
    source.playbackRate.cancelScheduledValues(this.context.currentTime);
    source.playbackRate.setValueAtTime(rate, this.context.currentTime);
    source.playbackRate.linearRampToValueAtTime(1, this.context.currentTime + 0.16);
  }

  async enableMicrophone(nodeId: string) {
    const context = await this.init();
    const runtime = this.runtimes.get(nodeId);
    if (!runtime) throw new Error('El módulo de micrófono aún no está en el grafo activo.');
    this.streams.get(nodeId)?.getTracks().forEach((track) => track.stop());
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });
    context.createMediaStreamSource(stream).connect(runtime.output);
    this.streams.set(nodeId, stream);
    return stream;
  }

  setMasterGain(db: number) {
    if (!this.context || !this.masterGain) return;
    this.masterGain.gain.setTargetAtTime(dbToGain(db), this.context.currentTime, 0.02);
  }

  async startRecording() {
    const context = await this.init();
    if (!this.masterGain || this.recordingProcessor) return;
    this.recordedLeft = [];
    this.recordedRight = [];
    const processor = context.createScriptProcessor(4096, 2, 2);
    const sink = context.createGain();
    sink.gain.value = 0;
    processor.onaudioprocess = (event) => {
      this.recordedLeft.push(new Float32Array(event.inputBuffer.getChannelData(0)));
      if (event.inputBuffer.numberOfChannels > 1) this.recordedRight.push(new Float32Array(event.inputBuffer.getChannelData(1)));
    };
    this.masterGain.connect(processor);
    processor.connect(sink).connect(context.destination);
    this.recordingProcessor = processor;
    this.recordingSink = sink;
  }

  stopRecording(bitDepth: 16 | 24 | 32 = 24) {
    if (!this.context || !this.recordingProcessor) return null;
    this.recordingProcessor.onaudioprocess = null;
    try { this.masterGain?.disconnect(this.recordingProcessor); } catch { /* disconnected */ }
    this.recordingProcessor.disconnect();
    this.recordingSink?.disconnect();
    this.recordingProcessor = null;
    this.recordingSink = null;
    return encodeWav(this.recordedLeft, this.recordedRight, this.context.sampleRate, bitDepth);
  }

  dispose() {
    this.stop();
    this.clearGraph();
    for (const stream of this.streams.values()) stream.getTracks().forEach((track) => track.stop());
    this.streams.clear();
    this.context?.close();
    this.context = null;
  }
}

export const audioEngine = new AuditoriumAudioEngine();
