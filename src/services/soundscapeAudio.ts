import { SoundscapeType } from '../types';

class SoundscapeEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private currentNodes: {
    stop?: () => void;
  }[] = [];
  private currentType: SoundscapeType | null = null;
  private volume: number = 0.5;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
    }
  }

  public stop() {
    for (const node of this.currentNodes) {
      try {
        node.stop?.();
      } catch (e) {
        // ignore
      }
    }
    this.currentNodes = [];
    this.currentType = null;
  }

  public isPlaying(): boolean {
    return this.currentNodes.length > 0;
  }

  public play(type: SoundscapeType) {
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    if (this.currentType === type && this.currentNodes.length > 0) {
      return;
    }

    this.stop();
    this.currentType = type;

    switch (type) {
      case 'ocean':
        this.startOcean();
        break;
      case 'singing-bowls':
        this.startSingingBowls();
        break;
      case 'forest-rain':
        this.startForestRain();
        break;
      case 'theta-binaural':
        this.startBinaural(200, 204); // 4Hz Theta for deep meditation
        break;
      case 'alpha-flow':
        this.startBinaural(216, 224); // 8Hz Alpha for calm focus
        break;
      case 'zen-stream':
        this.startZenStream();
        break;
    }
  }

  // Tibetan Bell / Singing bowl chime for session start or finish
  public playChime(freq = 528) {
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const chimeGain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

    // subtle harmonic overtone
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 2.76, this.ctx.currentTime);

    chimeGain.gain.setValueAtTime(0, this.ctx.currentTime);
    chimeGain.gain.linearRampToValueAtTime(0.4, this.ctx.currentTime + 0.08);
    chimeGain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 4.5);

    osc.connect(chimeGain);
    osc2.connect(chimeGain);
    chimeGain.connect(this.masterGain);

    osc.start();
    osc2.start();
    osc.stop(this.ctx.currentTime + 4.6);
    osc2.stop(this.ctx.currentTime + 4.6);
  }

  // Ocean wave simulation using filtered pink noise and rhythmic LFO
  private startOcean() {
    if (!this.ctx || !this.masterGain) return;

    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    // Filter to make deep surf
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(320, this.ctx.currentTime);

    // Wave swell LFO (every 7 seconds)
    const waveLfo = this.ctx.createOscillator();
    waveLfo.frequency.setValueAtTime(0.14, this.ctx.currentTime); // ~7 sec cycle

    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(220, this.ctx.currentTime);

    waveLfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    const oceanGain = this.ctx.createGain();
    oceanGain.gain.setValueAtTime(0.35, this.ctx.currentTime);

    whiteNoise.connect(filter);
    filter.connect(oceanGain);
    oceanGain.connect(this.masterGain);

    whiteNoise.start();
    waveLfo.start();

    this.currentNodes.push({
      stop: () => {
        try {
          whiteNoise.stop();
          waveLfo.stop();
        } catch (e) {}
      },
    });
  }

  // Tibetan Singing Bowls with harmonic resonance
  private startSingingBowls() {
    if (!this.ctx || !this.masterGain) return;

    // Harmonic base frequencies: 432Hz, 648Hz, 864Hz
    const freqs = [216, 432, 648, 864];
    const oscillators: OscillatorNode[] = [];
    const bowlGain = this.ctx.createGain();
    bowlGain.gain.setValueAtTime(0.15, this.ctx.currentTime);

    // Slow pulsating tremolo LFO
    const tremolo = this.ctx.createOscillator();
    tremolo.frequency.setValueAtTime(0.2, this.ctx.currentTime);
    const tremoloGain = this.ctx.createGain();
    tremoloGain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    tremolo.connect(tremoloGain);
    tremoloGain.connect(bowlGain.gain);
    tremolo.start();

    freqs.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq + (idx * 0.5), this.ctx.currentTime);

      const subGain = this.ctx.createGain();
      subGain.gain.setValueAtTime(0.25 / (idx + 1), this.ctx.currentTime);

      osc.connect(subGain);
      subGain.connect(bowlGain);
      osc.start();
      oscillators.push(osc);
    });

    bowlGain.connect(this.masterGain);

    this.currentNodes.push({
      stop: () => {
        try {
          tremolo.stop();
          oscillators.forEach(o => o.stop());
        } catch (e) {}
      },
    });
  }

  // Forest Rain & gentle breeze
  private startForestRain() {
    if (!this.ctx || !this.masterGain) return;

    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * 0.15;
    }

    const rainSource = this.ctx.createBufferSource();
    rainSource.buffer = noiseBuffer;
    rainSource.loop = true;

    // Bandpass filter for gentle rain patter
    const bandpass = this.ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(1200, this.ctx.currentTime);
    bandpass.Q.setValueAtTime(0.6, this.ctx.currentTime);

    const rainGain = this.ctx.createGain();
    rainGain.gain.setValueAtTime(0.22, this.ctx.currentTime);

    rainSource.connect(bandpass);
    bandpass.connect(rainGain);
    rainGain.connect(this.masterGain);

    rainSource.start();

    this.currentNodes.push({
      stop: () => {
        try {
          rainSource.stop();
        } catch (e) {}
      },
    });
  }

  // True stereo binaural beats for brainwave entrainment
  private startBinaural(leftFreq: number, rightFreq: number) {
    if (!this.ctx || !this.masterGain) return;

    const oscLeft = this.ctx.createOscillator();
    const oscRight = this.ctx.createOscillator();

    oscLeft.type = 'sine';
    oscLeft.frequency.setValueAtTime(leftFreq, this.ctx.currentTime);

    oscRight.type = 'sine';
    oscRight.frequency.setValueAtTime(rightFreq, this.ctx.currentTime);

    // Channel merger for true stereo separation (left ear / right ear)
    const merger = this.ctx.createChannelMerger(2);
    const pannerLeft = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
    const pannerRight = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;

    const binauralGain = this.ctx.createGain();
    binauralGain.gain.setValueAtTime(0.2, this.ctx.currentTime);

    if (pannerLeft && pannerRight) {
      pannerLeft.pan.setValueAtTime(-1, this.ctx.currentTime);
      pannerRight.pan.setValueAtTime(1, this.ctx.currentTime);
      oscLeft.connect(pannerLeft);
      oscRight.connect(pannerRight);
      pannerLeft.connect(binauralGain);
      pannerRight.connect(binauralGain);
    } else {
      oscLeft.connect(binauralGain);
      oscRight.connect(binauralGain);
    }

    binauralGain.connect(this.masterGain);

    oscLeft.start();
    oscRight.start();

    this.currentNodes.push({
      stop: () => {
        try {
          oscLeft.stop();
          oscRight.stop();
        } catch (e) {}
      },
    });
  }

  // Zen mountain stream with gentle bubbling
  private startZenStream() {
    if (!this.ctx || !this.masterGain) return;

    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * 0.2;
    }

    const streamSource = this.ctx.createBufferSource();
    streamSource.buffer = noiseBuffer;
    streamSource.loop = true;

    const lowpass = this.ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(750, this.ctx.currentTime);

    const streamGain = this.ctx.createGain();
    streamGain.gain.setValueAtTime(0.25, this.ctx.currentTime);

    streamSource.connect(lowpass);
    lowpass.connect(streamGain);
    streamGain.connect(this.masterGain);

    streamSource.start();

    this.currentNodes.push({
      stop: () => {
        try {
          streamSource.stop();
        } catch (e) {}
      },
    });
  }
}

export const soundscapeAudio = new SoundscapeEngine();
