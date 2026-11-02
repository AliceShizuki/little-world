/**
 * 声音系统（全部由 Web Audio API 实时合成，不依赖任何外部音频文件）
 *
 * 设计原则：
 *  - 所有音效都带柔和的 attack / release 包络，避免爆音与刺耳提示音。
 *  - 环境声（河流、雨声、夜晚）用持续的音量渐变，跟随天气与昼夜自然过渡。
 *  - 严格遵循浏览器自动播放策略：AudioContext 只在用户第一次交互后创建并恢复。
 */

export type SoundName =
  | 'sun'
  | 'sparkle'
  | 'cloud'
  | 'leaf'
  | 'bloom'
  | 'water'
  | 'splash'
  | 'bird'
  | 'rabbit'
  | 'frog'
  | 'door'
  | 'eat'
  | 'plant'
  | 'stone'
  | 'whoosh'
  | 'pop'
  /* —— V3 新增：动物与场景 —— */
  | 'moo'
  | 'cluck'
  | 'quack'
  | 'oink'
  | 'neigh'
  | 'meow'
  | 'chirp'
  | 'buzz'
  | 'wave'
  | 'hammer'
  | 'beep'
  | 'dig';

type Ctx = AudioContext;

/** 五声音阶 C5 D5 E5 G5 A5：给"会唱歌的石头"用，乱敲也不会刺耳 */
const PENTATONIC = [523.25, 587.33, 659.25, 783.99, 880];

class AudioSystem {
  private ctx: Ctx | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;

  private rainNode: { src: AudioBufferSourceNode; gain: GainNode } | null = null;
  private riverNode: { src: AudioBufferSourceNode; gain: GainNode } | null = null;
  private nightNode: { oscs: OscillatorNode[]; gain: GainNode } | null = null;
  /** V3：区域环境声底噪（风 / 叶 / 浪 / 街 / 水 / 施工） */
  private sceneNode: { src: AudioBufferSourceNode; filter: BiquadFilterNode; gain: GainNode } | null = null;
  private sceneKind = 'forest';

  private enabled = true;
  private volume = 0.6;
  private rainTarget = 0;
  private nightTarget = 0;

  private ambTimer: number | null = null;
  private isNight = false;
  private isRain = false;

  /** 首次用户手势后调用，创建 / 恢复音频上下文 */
  unlock(): void {
    this.ensure();
    if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume();
    this.startAmbienceScheduler();
  }

  get ready(): boolean {
    return !!this.ctx && this.ctx.state === 'running';
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    this.applyMaster();
    if (!on) {
      this.rainTarget = 0;
      this.nightTarget = 0;
      this.ramp(this.rainNode?.gain.gain, 0, 0.4);
      this.ramp(this.riverNode?.gain.gain, 0, 0.4);
      this.ramp(this.nightNode?.gain.gain, 0, 0.4);
    } else if (this.ctx) {
      this.rainTarget = this.isRain ? 0.5 : 0;
      this.nightTarget = this.isNight ? 0.32 : 0;
      this.ramp(this.rainNode?.gain.gain, this.rainTarget, 0.8);
      this.ramp(this.nightNode?.gain.gain, this.nightTarget, 1.2);
      this.ramp(this.riverNode?.gain.gain, 0.05, 0.8);
    }
  }

  setVolume(v: number): void {
    this.volume = Math.min(1, Math.max(0, v));
    this.applyMaster();
  }

  private applyMaster(): void {
    if (!this.ctx || !this.master) return;
    const target = this.enabled ? this.volume * 0.9 : 0;
    this.master.gain.setTargetAtTime(target, this.ctx.currentTime, 0.08);
  }

  private ensure(): boolean {
    if (this.ctx) return true;
    const Ctor =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return false;
    try {
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.enabled ? this.volume * 0.9 : 0;
      this.master.connect(this.ctx.destination);
      this.noise = this.createNoiseBuffer(this.ctx);
      this.buildAmbience();
      // 上下文创建得比天气变化晚时，把当前天气 / 昼夜的环境声补上
      this.ramp(this.rainNode?.gain.gain, this.isRain && this.enabled ? 0.42 : 0, 0.2);
      this.ramp(this.nightNode?.gain.gain, this.isNight && this.enabled ? 0.3 : 0, 0.2);
      this.applyScene();
      return true;
    } catch {
      this.ctx = null;
      return false;
    }
  }

  private createNoiseBuffer(ctx: Ctx): AudioBuffer {
    const len = Math.floor(ctx.sampleRate * 2);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      // 轻微低通，让噪声更接近自然水声
      last = last * 0.72 + white * 0.28;
      data[i] = last;
    }
    return buf;
  }

  /** 构建常驻环境声：河流 + 雨 + 夜晚 */
  private buildAmbience(): void {
    if (!this.ctx || !this.master || !this.noise) return;
    const ctx = this.ctx;

    // 河流：低沉的持续水声，永远保持很轻
    const riverSrc = ctx.createBufferSource();
    riverSrc.buffer = this.noise;
    riverSrc.loop = true;
    const riverFilter = ctx.createBiquadFilter();
    riverFilter.type = 'bandpass';
    riverFilter.frequency.value = 620;
    riverFilter.Q.value = 0.7;
    const riverGain = ctx.createGain();
    riverGain.gain.value = 0;
    riverSrc.connect(riverFilter).connect(riverGain).connect(this.master);
    riverSrc.start();
    this.riverNode = { src: riverSrc, gain: riverGain };
    this.ramp(riverGain.gain, 0.05, 1.5);

    // 雨声：高频噪声 + 低通，雨量渐入渐出
    const rainSrc = ctx.createBufferSource();
    rainSrc.buffer = this.noise;
    rainSrc.loop = true;
    const rainFilter = ctx.createBiquadFilter();
    rainFilter.type = 'lowpass';
    rainFilter.frequency.value = 2400;
    const rainGain = ctx.createGain();
    rainGain.gain.value = 0;
    rainSrc.connect(rainFilter).connect(rainGain).connect(this.master);
    rainSrc.start();
    this.rainNode = { src: rainSrc, gain: rainGain };

    // 区域环境声底噪：一处常驻的噪声，靠滤波器与音量区分场景
    const sceneSrc = ctx.createBufferSource();
    sceneSrc.buffer = this.noise;
    sceneSrc.loop = true;
    const sceneFilter = ctx.createBiquadFilter();
    sceneFilter.type = 'bandpass';
    sceneFilter.frequency.value = 500;
    sceneFilter.Q.value = 0.5;
    const sceneGain = ctx.createGain();
    sceneGain.gain.value = 0;
    sceneSrc.connect(sceneFilter).connect(sceneGain).connect(this.master);
    sceneSrc.start();
    this.sceneNode = { src: sceneSrc, filter: sceneFilter, gain: sceneGain };
    this.applyScene();

    // 夜晚：极轻的柔和和声
    const nightGain = ctx.createGain();
    nightGain.gain.value = 0;
    nightGain.connect(this.master);
    const oscs: OscillatorNode[] = [];
    [174, 261, 349].forEach((f, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = f;
      const g = ctx.createGain();
      g.gain.value = i === 0 ? 0.5 : 0.25;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.06 + i * 0.03;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.12;
      lfo.connect(lfoGain).connect(g.gain);
      osc.connect(g).connect(nightGain);
      osc.start();
      lfo.start();
      oscs.push(osc);
    });
    this.nightNode = { oscs, gain: nightGain };
  }

  /** 天气变化：雨声渐入 / 渐出 */
  setRain(on: boolean): void {
    this.isRain = on;
    this.rainTarget = on ? 0.42 : 0;
    if (!this.enabled) return;
    this.ramp(this.rainNode?.gain.gain, this.rainTarget, on ? 2.2 : 2.6);
  }

  /** 昼夜变化：夜晚环境声渐入 */
  setNight(on: boolean): void {
    this.isNight = on;
    this.nightTarget = on ? 0.3 : 0;
    if (!this.enabled) return;
    this.ramp(this.nightNode?.gain.gain, this.nightTarget, 2);
  }

  /** 切换区域环境声：森林的叶声、农场的风、海边的浪…… */
  setScene(kind: string): void {
    if (this.sceneKind === kind) return;
    this.sceneKind = kind;
    this.applyScene();
  }

  private applyScene(): void {
    if (!this.sceneNode) return;
    const conf: Record<string, { freq: number; q: number; gain: number; type: BiquadFilterType }> = {
      forest: { freq: 520, q: 0.6, gain: 0.032, type: 'bandpass' },
      farm: { freq: 760, q: 0.4, gain: 0.026, type: 'lowpass' },
      sea: { freq: 900, q: 0.35, gain: 0.05, type: 'lowpass' },
      town: { freq: 320, q: 0.5, gain: 0.022, type: 'bandpass' },
      site: { freq: 420, q: 0.45, gain: 0.028, type: 'lowpass' },
      water: { freq: 360, q: 0.4, gain: 0.045, type: 'lowpass' },
      air: { freq: 1400, q: 0.3, gain: 0.02, type: 'highpass' },
    };
    const c = conf[this.sceneKind] ?? conf.forest;
    this.sceneNode.filter.type = c.type;
    this.ramp(this.sceneNode.filter.frequency, c.freq, 1.2);
    this.ramp(this.sceneNode.gain.gain, this.enabled ? c.gain : 0, 1.4);
  }

  private ramp(param: AudioParam | undefined | null, value: number, time: number): void {
    if (!param || !this.ctx) return;
    param.cancelScheduledValues(this.ctx.currentTime);
    param.setTargetAtTime(value, this.ctx.currentTime, Math.max(0.05, time / 3));
  }

  /** 环境点缀：白天的鸟鸣、夜晚的虫鸣 */
  private startAmbienceScheduler(): void {
    if (this.ambTimer !== null) return;
    this.ambTimer = window.setInterval(() => {
      if (!this.enabled || !this.ready) return;
      if (this.isRain) {
        // 雨天偶尔的远处水滴
        if (Math.random() < 0.5) this.play('water');
        return;
      }
      if (this.isNight) {
        if (Math.random() < 0.75) this.cricket();
      } else if (Math.random() < 0.6) {
        this.play('bird');
      }
    }, 4200);
  }

  dispose(): void {
    if (this.ambTimer !== null) {
      clearInterval(this.ambTimer);
      this.ambTimer = null;
    }
  }

  // ---------------------------------------------------------------- 音效实现

  /**
   * 敲音阶（0..4）：五声音阶，怎么敲都不难听。
   *
   * 五声音阶（do re mi sol la）而不是十二平均律，是因为 3 岁孩子会乱敲——
   * 乱敲也得能听。这五个音随便组合都不会出现刺耳的二度冲突。
   */
  playNote(i: number): void {
    if (!this.ensure() || !this.enabled) return;
    if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume();
    const f = PENTATONIC[Math.max(0, Math.min(PENTATONIC.length - 1, Math.round(i)))];
    // 石头/玻璃/贝壳的音色：一个干净的基频 + 两个很快衰减的泛音
    this.tone({ freq: f, dur: 1.15, type: 'triangle', peak: 0.13, attack: 0.004 });
    this.tone({ freq: f * 2, dur: 0.45, type: 'sine', peak: 0.036, attack: 0.003 });
    this.tone({ freq: f * 3.02, dur: 0.22, type: 'sine', peak: 0.014, attack: 0.002 });
  }

  private tone(opts: {
    freq: number;
    to?: number;
    dur: number;
    type?: OscillatorType;
    peak?: number;
    attack?: number;
    delay?: number;
    detune?: number;
  }): void {
    if (!this.ctx || !this.master || !this.enabled) return;
    const ctx = this.ctx;
    const t0 = ctx.currentTime + (opts.delay ?? 0);
    const osc = ctx.createOscillator();
    osc.type = opts.type ?? 'sine';
    osc.frequency.setValueAtTime(opts.freq, t0);
    if (opts.to !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.to), t0 + opts.dur);
    }
    if (opts.detune) osc.detune.value = opts.detune;
    const g = ctx.createGain();
    const peak = (opts.peak ?? 0.18) * 0.9;
    const attack = opts.attack ?? 0.015;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(peak, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur);
    osc.connect(g).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + opts.dur + 0.05);
  }

  private noiseBurst(opts: {
    dur: number;
    freq: number;
    q?: number;
    peak?: number;
    type?: BiquadFilterType;
    sweepTo?: number;
    delay?: number;
  }): void {
    if (!this.ctx || !this.master || !this.noise || !this.enabled) return;
    const ctx = this.ctx;
    const t0 = ctx.currentTime + (opts.delay ?? 0);
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    src.playbackRate.value = 0.8 + Math.random() * 0.4;
    const filter = ctx.createBiquadFilter();
    filter.type = opts.type ?? 'bandpass';
    filter.frequency.setValueAtTime(opts.freq, t0);
    if (opts.sweepTo) {
      filter.frequency.exponentialRampToValueAtTime(Math.max(60, opts.sweepTo), t0 + opts.dur);
    }
    filter.Q.value = opts.q ?? 1;
    const g = ctx.createGain();
    const peak = opts.peak ?? 0.12;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(peak, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur);
    src.connect(filter).connect(g).connect(this.master);
    src.start(t0);
    src.stop(t0 + opts.dur + 0.05);
  }

  private cricket(): void {
    const base = 2600 + Math.random() * 700;
    for (let i = 0; i < 3; i++) {
      this.tone({
        freq: base,
        dur: 0.06,
        type: 'triangle',
        peak: 0.035,
        attack: 0.004,
        delay: i * 0.13,
      });
    }
  }

  play(name: SoundName): void {
    if (!this.ensure() || !this.enabled) return;
    if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume();

    switch (name) {
      case 'sun':
        this.tone({ freq: 660, to: 990, dur: 0.7, peak: 0.14 });
        this.tone({ freq: 1320, dur: 0.5, peak: 0.05, delay: 0.06 });
        break;
      case 'sparkle':
        [1174, 1568, 2093].forEach((f, i) =>
          this.tone({ freq: f, dur: 0.35, type: 'triangle', peak: 0.05, delay: i * 0.07 }),
        );
        break;
      case 'cloud':
        this.noiseBurst({ dur: 0.5, freq: 700, sweepTo: 320, q: 0.6, peak: 0.07 });
        break;
      case 'leaf':
        this.noiseBurst({ dur: 0.34, freq: 2600, q: 0.8, peak: 0.05 });
        this.noiseBurst({ dur: 0.28, freq: 1900, q: 0.8, peak: 0.035, delay: 0.09 });
        break;
      case 'bloom':
        [523, 659, 784].forEach((f, i) =>
          this.tone({ freq: f, dur: 0.55, type: 'sine', peak: 0.075, delay: i * 0.08 }),
        );
        break;
      case 'water':
        this.tone({ freq: 880, to: 320, dur: 0.28, type: 'sine', peak: 0.09 });
        break;
      case 'splash':
        this.noiseBurst({ dur: 0.45, freq: 1600, sweepTo: 400, q: 0.7, peak: 0.1 });
        this.tone({ freq: 300, to: 160, dur: 0.3, peak: 0.06 });
        break;
      case 'bird':
        this.tone({ freq: 2200, to: 3100, dur: 0.1, type: 'sine', peak: 0.06 });
        this.tone({ freq: 2600, to: 2050, dur: 0.11, type: 'sine', peak: 0.05, delay: 0.13 });
        if (Math.random() < 0.5) {
          this.tone({ freq: 2400, to: 3000, dur: 0.09, type: 'sine', peak: 0.045, delay: 0.3 });
        }
        break;
      case 'rabbit':
        this.tone({ freq: 420, to: 720, dur: 0.16, type: 'sine', peak: 0.1 });
        break;
      case 'frog':
        this.tone({ freq: 150, to: 118, dur: 0.16, type: 'sawtooth', peak: 0.05, attack: 0.02 });
        this.tone({ freq: 140, to: 112, dur: 0.14, type: 'sawtooth', peak: 0.04, delay: 0.2 });
        break;
      case 'door':
        this.noiseBurst({ dur: 0.6, freq: 420, sweepTo: 900, q: 3, peak: 0.06 });
        this.tone({ freq: 180, to: 230, dur: 0.5, type: 'sine', peak: 0.05 });
        break;
      case 'eat':
        this.noiseBurst({ dur: 0.12, freq: 1200, q: 1.2, peak: 0.07 });
        this.noiseBurst({ dur: 0.1, freq: 900, q: 1.2, peak: 0.05, delay: 0.16 });
        this.noiseBurst({ dur: 0.09, freq: 1100, q: 1.2, peak: 0.045, delay: 0.32 });
        break;
      case 'plant':
        this.tone({ freq: 260, to: 330, dur: 0.4, type: 'sine', peak: 0.08 });
        this.noiseBurst({ dur: 0.22, freq: 900, q: 0.7, peak: 0.05, delay: 0.05 });
        break;
      case 'stone':
        this.noiseBurst({ dur: 0.09, freq: 2400, q: 2, peak: 0.05 });
        this.tone({ freq: 900, to: 700, dur: 0.08, type: 'triangle', peak: 0.03 });
        break;
      case 'whoosh':
        this.noiseBurst({ dur: 0.5, freq: 500, sweepTo: 1600, q: 0.5, peak: 0.055 });
        break;
      case 'pop':
        this.tone({ freq: 520, to: 900, dur: 0.14, type: 'sine', peak: 0.09 });
        break;
      case 'moo':
        this.tone({ freq: 150, to: 118, dur: 0.5, type: 'sawtooth', peak: 0.045, attack: 0.09 });
        this.tone({ freq: 225, to: 176, dur: 0.42, type: 'sine', peak: 0.03, attack: 0.08 });
        break;
      case 'cluck':
        [880, 660, 740].forEach((f, i) =>
          this.tone({ freq: f, to: f * 0.82, dur: 0.07, type: 'triangle', peak: 0.05, delay: i * 0.09 }),
        );
        break;
      case 'quack':
        this.tone({ freq: 420, to: 320, dur: 0.14, type: 'sawtooth', peak: 0.04, attack: 0.02 });
        this.tone({ freq: 400, to: 300, dur: 0.12, type: 'sawtooth', peak: 0.03, delay: 0.17 });
        break;
      case 'oink':
        this.tone({ freq: 260, to: 190, dur: 0.16, type: 'square', peak: 0.028, attack: 0.03 });
        break;
      case 'neigh':
        this.tone({ freq: 520, to: 300, dur: 0.42, type: 'sawtooth', peak: 0.035, attack: 0.05 });
        break;
      case 'meow':
        this.tone({ freq: 640, to: 460, dur: 0.34, type: 'triangle', peak: 0.06, attack: 0.06 });
        this.tone({ freq: 480, to: 560, dur: 0.2, type: 'triangle', peak: 0.03, delay: 0.3 });
        break;
      case 'chirp':
        this.tone({ freq: 3000, to: 3600, dur: 0.06, type: 'sine', peak: 0.04 });
        this.tone({ freq: 3200, to: 2900, dur: 0.05, type: 'sine', peak: 0.032, delay: 0.09 });
        break;
      case 'buzz':
        this.tone({ freq: 190, to: 230, dur: 0.4, type: 'sawtooth', peak: 0.022, attack: 0.08 });
        break;
      case 'wave':
        this.noiseBurst({ dur: 1.6, freq: 700, sweepTo: 1400, q: 0.3, peak: 0.055 });
        break;
      case 'hammer':
        this.noiseBurst({ dur: 0.1, freq: 1500, q: 2.4, peak: 0.06 });
        this.tone({ freq: 420, to: 300, dur: 0.12, type: 'triangle', peak: 0.04 });
        break;
      case 'beep':
        this.tone({ freq: 900, dur: 0.1, type: 'sine', peak: 0.04 });
        this.tone({ freq: 1180, dur: 0.1, type: 'sine', peak: 0.035, delay: 0.13 });
        break;
      case 'dig':
        this.noiseBurst({ dur: 0.3, freq: 620, sweepTo: 320, q: 0.8, peak: 0.06 });
        break;
      default:
        break;
    }
  }
}

export const audio = new AudioSystem();
