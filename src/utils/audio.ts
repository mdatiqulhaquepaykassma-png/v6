// Live Casino Sound & Voice Audio Engine
// Web Audio API Synthesis + Web Speech API Dealer Voice

class CasinoAudioEngine {
  private ctx: AudioContext | null = null;
  public sfxEnabled: boolean = true;
  public voiceEnabled: boolean = true;
  public dealerVoiceVol: number = 1.0;
  public sfxVol: number = 0.8;
  public bgmVol: number = 0.5;
  public masterMute: boolean = false;
  private voice: SpeechSynthesisVoice | null = null;
  private voicesLoaded: boolean = false;
  private bgmGainNode: GainNode | null = null;
  private bgmOscs: OscillatorNode[] = [];

  constructor() {
    if (typeof window !== "undefined") {
      this.initVoice();
      try {
        const stored = localStorage.getItem("apex_audio_mixer");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.dealerVoice !== undefined) this.dealerVoiceVol = parsed.dealerVoice / 100;
          if (parsed.sfx !== undefined) this.sfxVol = parsed.sfx / 100;
          if (parsed.bgm !== undefined) this.bgmVol = parsed.bgm / 100;
          if (parsed.masterMute !== undefined) this.masterMute = parsed.masterMute;
        }
      } catch {}
    }
  }

  public setMixerVolumes(config: { dealerVoice: number; sfx: number; bgm: number; masterMute: boolean }) {
    this.dealerVoiceVol = config.dealerVoice;
    this.sfxVol = config.sfx;
    this.bgmVol = config.bgm;
    this.masterMute = config.masterMute;

    if (this.bgmGainNode && this.ctx) {
      this.bgmGainNode.gain.setValueAtTime(this.masterMute ? 0 : this.bgmVol * 0.1, this.ctx.currentTime);
    }
  }

  public toggleBgm(play: boolean) {
    if (!play || this.masterMute) {
      this.stopBgm();
      return;
    }
    this.startBgm();
  }

  public startBgm() {
    this.stopBgm();
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      this.bgmGainNode = ctx.createGain();
      this.bgmGainNode.gain.setValueAtTime(this.masterMute ? 0 : this.bgmVol * 0.1, ctx.currentTime);
      this.bgmGainNode.connect(ctx.destination);

      // Create a smooth ambient chord pad (C minor 9)
      const freqs = [130.81, 155.56, 196.00, 246.94]; // C3, Eb3, G3, B3
      this.bgmOscs = freqs.map((freq) => {
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        osc.connect(this.bgmGainNode!);
        osc.start();
        return osc;
      });
    } catch {}
  }

  public stopBgm() {
    this.bgmOscs.forEach((osc) => {
      try {
        osc.stop();
        osc.disconnect();
      } catch {}
    });
    this.bgmOscs = [];
  }

  private getContext(): AudioContext | null {
    if (!this.sfxEnabled) return null;
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
    return this.ctx;
  }

  private initVoice() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        this.voicesLoaded = true;
        // Find best English croupier voice (prioritize UK or natural US female/male dealer voices)
        const preferred =
          voices.find((v) => v.lang.startsWith("en") && (v.name.includes("UK") || v.name.includes("British") || v.name.includes("Female") || v.name.includes("Samantha") || v.name.includes("Natural"))) ||
          voices.find((v) => v.lang.startsWith("en")) ||
          voices[0];
        if (preferred) this.voice = preferred;
      }
    };

    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }

  // ==========================================================================
  // LIVE CASINO CROUPIER VOICE ANNOUNCEMENTS
  // ==========================================================================
  public speak(text: string, force = false) {
    if (!this.voiceEnabled) return;
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    try {
      if (force) {
        window.speechSynthesis.cancel();
      }
      const utter = new SpeechSynthesisUtterance(text);
      if (this.voice) utter.voice = this.voice;
      utter.pitch = 1.08; // Professional, bright croupier pitch
      utter.rate = 1.04;  // Crisp, fast casino pacing
      utter.volume = this.masterMute ? 0 : Math.max(0, Math.min(1, this.dealerVoiceVol));
      if (utter.volume > 0) {
        window.speechSynthesis.speak(utter);
      }
    } catch {
      // Speech blocked by browser
    }
  }

  public announcePlaceBets() {
    const lines = [
      "Place your bets please!",
      "New round started, make your wagers!",
      "Place your stakes on Dragon or Tiger!",
    ];
    this.speak(lines[Math.floor(Math.random() * lines.length)], true);
  }

  public announceLastBets() {
    this.speak("Final bets! Five seconds remaining!", true);
  }

  public announceBetsClosed() {
    this.speak("Bets are closed! Dealing the cards now.", true);
  }

  public announceWinner(winner: "DRAGON" | "TIGER" | "TIE") {
    if (winner === "DRAGON") {
      this.speak("Dragon wins.", true);
    } else if (winner === "TIGER") {
      this.speak("Tiger wins.", true);
    } else {
      this.speak("It's a tie.", true);
    }
  }

  public announcePlayerWin(amount: number) {
    setTimeout(() => {
      const phrases = [
        `Congratulations! You've won ${amount.toLocaleString()}!`,
        `Amazing win! ${amount.toLocaleString()} credited to your balance.`,
        `A sensational victory! Payout of ${amount.toLocaleString()} is yours!`,
      ];
      this.speak(phrases[Math.floor(Math.random() * phrases.length)]);
    }, 1500);
  }

  public announcePlayerLoss(amount?: number) {
    setTimeout(() => {
      const phrases = [
        "Unlucky this time. Better luck in the next round!",
        "Tiger takes it. Let's try again!",
        "Dragon takes it. Don't give up!",
      ];
      this.speak(phrases[Math.floor(Math.random() * phrases.length)]);
    }, 1500);
  }

  public announcePlayerBet(amount: number, side: string) {
    this.speak(`Bet confirmed! Total bet amount: ${amount.toLocaleString()} Taka on ${side}.`, true);
  }

  public announceTotalBet(totalStaged: number, side: string) {
    this.speak(`Total bet amount: ${totalStaged.toLocaleString()} Taka on ${side}.`, true);
  }

  public announceMatchingPhase(dragonPool: number, tigerPool: number, matchedAmount: number, returnedAmount: number) {
    if (returnedAmount > 0) {
      this.speak(`Matching complete! Total matched bet amount: ${matchedAmount.toLocaleString()} Taka. Unmatched ${returnedAmount.toLocaleString()} Taka returned to players.`);
    } else {
      this.speak(`All bets fully matched! Total matched amount: ${matchedAmount.toLocaleString()} Taka.`);
    }
  }

  public announceUserRefund(refundAmount: number) {
    this.speak(`Unmatched refund! ${refundAmount.toLocaleString()} Taka returned to your balance.`, true);
  }

  public announceTieRefund(refundAmount: number) {
    this.speak(`It is a Tie! 50% refund of ${refundAmount.toLocaleString()} Taka returned to your wallet. 50% retained in company fund.`, true);
  }

  public announceDetailedCardsAndResult(
    winner: "DRAGON" | "TIGER" | "TIE",
    dragonRank: string,
    tigerRank: string,
    userPayout?: number,
    tieRefund?: number
  ) {
    let msg = `Dragon ${dragonRank}. Tiger ${tigerRank}. ${winner === "TIE" ? "Tie." : `${winner} wins!`}`;
    if (userPayout && userPayout > 0) {
      msg += ` Congratulations!`;
    }
    this.speak(msg, true);
  }

  // ==========================================================================
  // ADDICTIVE CASINO SOUND EFFECTS (SYNTHESIZED HARMONICS & REVERB)
  // ==========================================================================

  // Ambient Crowd Noise Audio Nodes
  private ambientSource: AudioBufferSourceNode | null = null;
  private ambientGainNode: GainNode | null = null;
  public isAmbientCrowdPlaying: boolean = false;
  private ambientCrowdVolume: number = 0.22;

  public startAmbientCrowdNoise() {
    if (this.isAmbientCrowdPlaying) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      // Generate 4 seconds of realistic casino room ambiance (pink noise + room resonance)
      const bufferSize = ctx.sampleRate * 4;
      const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);
      const ch0 = buffer.getChannelData(0);
      const ch1 = buffer.getChannelData(1);

      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        // Pink noise filter algorithm
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        const pink = (b0 + b1 + b2 + b3 + b4 + b5 + white * 0.5362) * 0.07;
        // Stereo decorrelation for spacious room acoustics
        ch0[i] = pink * (0.8 + 0.2 * Math.sin((i / bufferSize) * Math.PI * 6));
        ch1[i] = pink * (0.8 + 0.2 * Math.cos((i / bufferSize) * Math.PI * 5));
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      // Bandpass around human vocal murmur range (200Hz - 1800Hz)
      const lowpass = ctx.createBiquadFilter();
      lowpass.type = "lowpass";
      lowpass.frequency.setValueAtTime(1400, ctx.currentTime);

      const highpass = ctx.createBiquadFilter();
      highpass.type = "highpass";
      highpass.frequency.setValueAtTime(180, ctx.currentTime);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(this.ambientCrowdVolume, ctx.currentTime + 1.2);

      source.connect(highpass);
      highpass.connect(lowpass);
      lowpass.connect(gain);
      gain.connect(ctx.destination);

      source.start();
      this.ambientSource = source;
      this.ambientGainNode = gain;
      this.isAmbientCrowdPlaying = true;
    } catch {
      // Audio context error
    }
  }

  public stopAmbientCrowdNoise() {
    if (!this.isAmbientCrowdPlaying) return;
    const ctx = this.getContext();
    if (this.ambientGainNode && ctx) {
      try {
        this.ambientGainNode.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        setTimeout(() => {
          if (this.ambientSource) {
            try {
              this.ambientSource.stop();
              this.ambientSource.disconnect();
            } catch {}
            this.ambientSource = null;
          }
          this.isAmbientCrowdPlaying = false;
        }, 450);
      } catch {
        this.isAmbientCrowdPlaying = false;
      }
    } else {
      this.isAmbientCrowdPlaying = false;
    }
  }

  public setAmbientVolume(volume: number) {
    this.ambientCrowdVolume = Math.max(0, Math.min(1, volume));
    if (this.ambientGainNode && this.ctx) {
      this.ambientGainNode.gain.setValueAtTime(this.ambientCrowdVolume, this.ctx.currentTime);
    }
  }

  // Realistic metallic casino coins clinking
  public playCoinsClinking() {
    const ctx = this.getContext();
    if (!ctx) return;

    // 4 quick metallic clinks with rich ring frequencies
    const clinks = [
      { f1: 3200, f2: 4400, delay: 0 },
      { f1: 2900, f2: 3950, delay: 0.05 },
      { f1: 3500, f2: 4800, delay: 0.11 },
      { f1: 3100, f2: 4200, delay: 0.18 },
    ];

    clinks.forEach((c) => {
      setTimeout(() => {
        try {
          const osc = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = "sine";
          osc.frequency.setValueAtTime(c.f1, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(c.f1 * 1.15, ctx.currentTime + 0.08);

          osc2.type = "triangle";
          osc2.frequency.setValueAtTime(c.f2, ctx.currentTime);
          osc2.frequency.exponentialRampToValueAtTime(c.f2 * 0.9, ctx.currentTime + 0.06);

          gain.gain.setValueAtTime(0.18, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);

          osc.connect(gain);
          osc2.connect(gain);
          gain.connect(ctx.destination);

          osc.start();
          osc2.start();
          osc.stop(ctx.currentTime + 0.09);
          osc2.stop(ctx.currentTime + 0.09);
        } catch {}
      }, c.delay * 1000);
    });
  }

  // 1. Ceramic Casino Chip Click with realistic acoustic body resonance
  public playChip(multiplier = 1) {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const baseFreq = 1600 + Math.random() * 400;
      const osc = ctx.createOscillator();
      const oscHarmonic = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.8, ctx.currentTime + 0.04);

      oscHarmonic.type = "triangle";
      oscHarmonic.frequency.setValueAtTime(baseFreq * 2.2, ctx.currentTime);
      oscHarmonic.frequency.exponentialRampToValueAtTime(baseFreq * 0.8, ctx.currentTime + 0.04);

      gain.gain.setValueAtTime(0.22 * Math.min(1.5, multiplier), ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);

      osc.connect(gain);
      oscHarmonic.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      oscHarmonic.start();
      osc.stop(ctx.currentTime + 0.06);
      oscHarmonic.stop(ctx.currentTime + 0.06);
    } catch {
      // Audio context error ignored
    }
  }

  // 2. Chip Stacking Cascade (rapid 3-clink cluster)
  public playChipStack() {
    this.playChip(1.0);
    setTimeout(() => this.playChip(1.2), 40);
    setTimeout(() => this.playChip(0.9), 90);
  }

  // 3. Card sliding from shoe
  public playCardSlide() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      // White noise burst filtered like sliding felt
      const bufferSize = ctx.sampleRate * 0.12;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(900, ctx.currentTime);
      filter.frequency.linearRampToValueAtTime(400, ctx.currentTime + 0.12);
      filter.Q.setValueAtTime(2.0, ctx.currentTime);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start();
    } catch {}
  }

  // 4. Card Snap on Felt
  public playCardSnap() {
    this.playGranularCardSnap("7", "CENTER");
  }

  /**
   * High-Fidelity Granular Synthesis Card Snap SFX
   * Deconstructs card impact into micro-grains:
   * - Grain 1: Transient impulse & flick crack
   * - Grain 2: Plastic/linen card body flex tension (pitch mapped to card rank 1-13)
   * - Grain 3: Low-mid felt absorption resonance (heavier on face cards)
   * - Grain 4: High Rank Royalty Harmonic Shimmer (for 10, J, Q, K, A)
   */
  public playGranularCardSnap(cardRank?: string | number, position: "DRAGON" | "TIGER" | "CENTER" = "CENTER") {
    const ctx = this.getContext();
    if (!ctx || this.masterMute || !this.sfxEnabled) return;

    try {
      const now = ctx.currentTime;
      const baseGain = this.sfxVol * 0.42;

      // Calculate rank numeric value (1 to 13)
      let rankVal = 7;
      if (typeof cardRank === "number") {
        rankVal = Math.max(1, Math.min(13, cardRank));
      } else if (typeof cardRank === "string") {
        const cleanRank = cardRank.toUpperCase().trim();
        if (cleanRank.startsWith("A")) rankVal = 1;
        else if (cleanRank.startsWith("K")) rankVal = 13;
        else if (cleanRank.startsWith("Q")) rankVal = 12;
        else if (cleanRank.startsWith("J")) rankVal = 11;
        else if (cleanRank.startsWith("10")) rankVal = 10;
        else {
          const num = parseInt(cleanRank.replace(/\D/g, ""), 10);
          if (!isNaN(num)) rankVal = Math.max(1, Math.min(13, num));
        }
      }

      // Pitch variation based on rank (pentatonic micro-steps from 340Hz up to 680Hz)
      const rankPitchMultiplier = 0.82 + (rankVal / 13) * 0.52;
      const primaryFreq = 430 * rankPitchMultiplier;
      const secondaryFreq = primaryFreq * 1.85;

      // Spatial stereo panning based on table position (Dragon on left, Tiger on right)
      const panValue = position === "DRAGON" ? -0.42 : position === "TIGER" ? 0.42 : 0;
      const dest = (ctx as AudioContext).destination;

      let targetNode: AudioNode = dest;
      if (typeof (ctx as any).createStereoPanner === "function") {
        const panner = (ctx as any).createStereoPanner();
        panner.pan.setValueAtTime(panValue, now);
        panner.connect(dest);
        targetNode = panner;
      }

      // Grain 1: Transient Impulsive Flick Crack (2-5ms noise impulse)
      try {
        const transientSize = Math.floor(ctx.sampleRate * 0.008);
        const buffer = ctx.createBuffer(1, transientSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < transientSize; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (transientSize * 0.22));
        }
        const grain1Src = ctx.createBufferSource();
        grain1Src.buffer = buffer;

        const grain1Filter = ctx.createBiquadFilter();
        grain1Filter.type = "highpass";
        grain1Filter.frequency.setValueAtTime(2200 + rankVal * 90, now);

        const grain1Gain = ctx.createGain();
        grain1Gain.gain.setValueAtTime(baseGain * 0.55, now);
        grain1Gain.gain.exponentialRampToValueAtTime(0.001, now + 0.008);

        grain1Src.connect(grain1Filter);
        grain1Filter.connect(grain1Gain);
        grain1Gain.connect(targetNode);

        grain1Src.start(now);
      } catch {}

      // Grain 2: Card Stock Flex Harmonic Body (15-35ms oscillator grains)
      try {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const grain2Gain = ctx.createGain();

        osc1.type = "triangle";
        osc1.frequency.setValueAtTime(primaryFreq * 1.25, now);
        osc1.frequency.exponentialRampToValueAtTime(primaryFreq * 0.42, now + 0.065);

        osc2.type = "sine";
        osc2.frequency.setValueAtTime(secondaryFreq, now);
        osc2.frequency.exponentialRampToValueAtTime(secondaryFreq * 0.5, now + 0.045);

        grain2Gain.gain.setValueAtTime(0, now);
        grain2Gain.gain.linearRampToValueAtTime(baseGain * 0.78, now + 0.002);
        grain2Gain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);

        osc1.connect(grain2Gain);
        osc2.connect(grain2Gain);
        grain2Gain.connect(targetNode);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.07);
        osc2.stop(now + 0.07);
      } catch {}

      // Grain 3: Felt Slap & Low-End Damping Absorption (35-75ms)
      try {
        const feltOsc = ctx.createOscillator();
        const feltGain = ctx.createGain();

        feltOsc.type = "sine";
        const feltFreq = rankVal >= 10 ? 110 : 155;
        feltOsc.frequency.setValueAtTime(feltFreq, now + 0.004);
        feltOsc.frequency.exponentialRampToValueAtTime(45, now + 0.075);

        feltGain.gain.setValueAtTime(0, now);
        feltGain.gain.setValueAtTime(baseGain * (0.35 + (rankVal >= 10 ? 0.22 : 0)), now + 0.004);
        feltGain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);

        feltOsc.connect(feltGain);
        feltGain.connect(targetNode);

        feltOsc.start(now + 0.004);
        feltOsc.stop(now + 0.08);
      } catch {}

      // Grain 4: Royalty Shimmer (for Ace and Face Cards 10, J, Q, K)
      if (rankVal === 1 || rankVal >= 10) {
        try {
          const shimmerOsc = ctx.createOscillator();
          const shimmerGain = ctx.createGain();

          shimmerOsc.type = "sine";
          shimmerOsc.frequency.setValueAtTime(primaryFreq * 2.4, now + 0.006);
          shimmerOsc.frequency.exponentialRampToValueAtTime(primaryFreq * 1.4, now + 0.05);

          shimmerGain.gain.setValueAtTime(baseGain * 0.24, now + 0.006);
          shimmerGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

          shimmerOsc.connect(shimmerGain);
          shimmerGain.connect(targetNode);

          shimmerOsc.start(now + 0.006);
          shimmerOsc.stop(now + 0.055);
        } catch {}
      }
    } catch {}
  }

  // 4b. High-Fidelity Procedural Card Deck Riffle Shuffle SFX
  public playProceduralDeckShuffle(speedMultiplier = 1.0) {
    const ctx = this.getContext();
    if (!ctx || this.masterMute || !this.sfxEnabled) return;

    try {
      const now = ctx.currentTime;
      const baseGain = (this.sfxVol * 0.28);

      // Phase 1: Initial Card Packet Bend & Friction Noise (~160ms)
      try {
        const noiseBufferSize = Math.floor(ctx.sampleRate * 0.18);
        const noiseBuffer = ctx.createBuffer(1, noiseBufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < noiseBufferSize; i++) {
          output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (noiseBufferSize * 0.5));
        }

        const noiseSrc = ctx.createBufferSource();
        noiseSrc.buffer = noiseBuffer;

        const noiseFilter = ctx.createBiquadFilter();
        noiseFilter.type = "bandpass";
        noiseFilter.frequency.setValueAtTime(1200, now);
        noiseFilter.frequency.exponentialRampToValueAtTime(650, now + 0.16);
        noiseFilter.Q.setValueAtTime(3.2, now);

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(baseGain * 0.45, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

        noiseSrc.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(ctx.destination);

        noiseSrc.start(now);
      } catch {}

      // Phase 2: High-Speed Multi-Card Alternating Riffle Interlace (26-34 cards)
      const totalCards = 28;
      const startTime = now + 0.18;
      const riffleDuration = 1.35 / speedMultiplier;

      for (let i = 0; i < totalCards; i++) {
        // Natural thumb release acceleration curve (eases in, rapid peak, eases into waterfall)
        const progress = i / totalCards;
        const curveOffset = Math.sin(progress * Math.PI); // Peak density in middle
        const timeSpacing = (riffleDuration / totalCards) * (1.3 - curveOffset * 0.6);
        const microJitter = (Math.random() - 0.5) * 0.006;
        const cardReleaseTime = startTime + i * (riffleDuration / totalCards) + microJitter;

        // Alternating Left / Right Packet Panning
        const isLeftPacket = i % 2 === 0;
        const panValue = isLeftPacket ? -0.35 : 0.35;

        // Card Pop Frequency (Sweeps upwards as deck packet thins)
        const baseCardFreq = 380 + progress * 240 + (Math.random() - 0.5) * 60;
        const cardDuration = 0.028 + Math.random() * 0.008;

        try {
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const cardGain = ctx.createGain();

          osc1.type = "triangle";
          osc1.frequency.setValueAtTime(baseCardFreq, cardReleaseTime);
          osc1.frequency.exponentialRampToValueAtTime(baseCardFreq * 0.45, cardReleaseTime + cardDuration);

          osc2.type = "sine";
          osc2.frequency.setValueAtTime(baseCardFreq * 1.8, cardReleaseTime);
          osc2.frequency.exponentialRampToValueAtTime(baseCardFreq * 0.8, cardReleaseTime + cardDuration);

          cardGain.gain.setValueAtTime(0, cardReleaseTime);
          cardGain.gain.linearRampToValueAtTime(baseGain * (0.35 + curveOffset * 0.3), cardReleaseTime + 0.003);
          cardGain.gain.exponentialRampToValueAtTime(0.0001, cardReleaseTime + cardDuration);

          const dest = (ctx as AudioContext).destination;
          // Connect with Stereo Panner if supported
          if (typeof (ctx as any).createStereoPanner === "function") {
            const panner = (ctx as any).createStereoPanner();
            panner.pan.setValueAtTime(panValue, cardReleaseTime);
            osc1.connect(cardGain);
            osc2.connect(cardGain);
            cardGain.connect(panner);
            panner.connect(dest);
          } else {
            osc1.connect(cardGain);
            osc2.connect(cardGain);
            cardGain.connect(dest);
          }

          osc1.start(cardReleaseTime);
          osc2.start(cardReleaseTime);
          osc1.stop(cardReleaseTime + cardDuration + 0.005);
          osc2.stop(cardReleaseTime + cardDuration + 0.005);
        } catch {}
      }

      // Phase 3: Waterfall Cascade & Clean Deck Square-Up Tap on Felt (~1.65s)
      const tapTime = startTime + riffleDuration + 0.12;
      try {
        const tapOsc = ctx.createOscillator();
        const tapGain = ctx.createGain();

        tapOsc.type = "sine";
        tapOsc.frequency.setValueAtTime(260, tapTime);
        tapOsc.frequency.exponentialRampToValueAtTime(75, tapTime + 0.08);

        tapGain.gain.setValueAtTime(baseGain * 0.6, tapTime);
        tapGain.gain.exponentialRampToValueAtTime(0.001, tapTime + 0.08);

        tapOsc.connect(tapGain);
        tapGain.connect(ctx.destination);

        tapOsc.start(tapTime);
        tapOsc.stop(tapTime + 0.09);
      } catch {}
    } catch {}
  }

  // Alias for backward compatibility
  public playDeckShuffle() {
    this.playProceduralDeckShuffle(1.0);
  }

  // 5. Addictive Coin Cascade / Payout Drop (Slot machine style shower)
  public playCoinCascade() {
    const ctx = this.getContext();
    if (!ctx) return;

    const coinCount = 16;
    for (let i = 0; i < coinCount; i++) {
      const delay = i * 0.06 + Math.random() * 0.03;
      setTimeout(() => {
        try {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const freq = 1800 + Math.random() * 1600;

          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(freq * 1.5, ctx.currentTime + 0.08);

          gain.gain.setValueAtTime(0.15, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start();
          osc.stop(ctx.currentTime + 0.09);
        } catch {}
      }, delay * 1000);
    }
  }

  // 6. Win Fanfare (Harmonic C-Major 9th chord + Bell Shimmer)
  public playWinFanfare() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const frequencies = [523.25, 659.25, 783.99, 987.77, 1174.66, 1318.51]; // C5, E5, G5, B5, D6, E6
      frequencies.forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = ctx.currentTime + idx * 0.08;

        osc.type = idx % 2 === 0 ? "sine" : "triangle";
        osc.frequency.setValueAtTime(f, start);

        gain.gain.setValueAtTime(0.18, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.55);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(start);
        osc.stop(start + 0.55);
      });

      // Coin shower alongside fanfare
      setTimeout(() => this.playCoinCascade(), 250);
    } catch {}
  }

  // 7. Big Win Celebration (Dramatic 8-note crescendo + coin rain)
  public playBigWin() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const arpeggio = [261.63, 329.63, 392.0, 523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98];
      arpeggio.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startTime = ctx.currentTime + idx * 0.07;

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0.25, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.5);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.5);
      });

      this.playCoinCascade();
      setTimeout(() => this.playCoinCascade(), 600);
    } catch {}
  }

  // 8. Loss Sound Effect (Subtle, classy descending transition with gentle sub-bass)
  public playLossSound() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const chords = [392.0, 329.63, 261.63]; // G4, E4, C4 minor descent
      chords.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startTime = ctx.currentTime + idx * 0.12;

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, startTime);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.9, startTime + 0.35);

        gain.gain.setValueAtTime(0.12, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.35);
      });

      // Low whoosh
      const sub = ctx.createOscillator();
      const subGain = ctx.createGain();
      sub.type = "sine";
      sub.frequency.setValueAtTime(95, ctx.currentTime);
      sub.frequency.exponentialRampToValueAtTime(45, ctx.currentTime + 0.4);
      subGain.gain.setValueAtTime(0.15, ctx.currentTime);
      subGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      sub.connect(subGain);
      subGain.connect(ctx.destination);
      sub.start();
      sub.stop(ctx.currentTime + 0.4);
    } catch {}
  }

  // 9. Countdown Tension Tick & Heartbeat Thump
  public playCountdownTick(secondsLeft: number) {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      // High click
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      const pitch = secondsLeft <= 3 ? 1600 : 1200;
      osc.frequency.setValueAtTime(pitch, ctx.currentTime);

      gain.gain.setValueAtTime(secondsLeft <= 3 ? 0.2 : 0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.05);

      // Low sub-bass heartbeat thump when under 5s
      if (secondsLeft <= 5) {
        const sub = ctx.createOscillator();
        const subGain = ctx.createGain();
        sub.type = "sine";
        sub.frequency.setValueAtTime(75, ctx.currentTime);
        sub.frequency.exponentialRampToValueAtTime(35, ctx.currentTime + 0.12);

        subGain.gain.setValueAtTime(0.25, ctx.currentTime);
        subGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

        sub.connect(subGain);
        subGain.connect(ctx.destination);

        sub.start();
        sub.stop(ctx.currentTime + 0.12);
      }
    } catch {}
  }

  // 10. Deep Bronze Gong / Bell for Round Start
  public playRoundStartGong() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = "sine";
      osc1.frequency.setValueAtTime(440, ctx.currentTime); // A4
      osc1.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 1.2);

      osc2.type = "triangle";
      osc2.frequency.setValueAtTime(880, ctx.currentTime); // A5 chime
      osc2.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.8);

      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 1.2);
      osc2.stop(ctx.currentTime + 1.2);
    } catch {}
  }

  // 11. Tactile UI Click
  public playButtonClick() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(1400, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.03);

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.03);
    } catch {}
  }

  // Compatibility proxies
  public playCardFlip() {
    this.playCardSlide();
    setTimeout(() => this.playCardSnap(), 60);
  }

  public playWin() {
    this.playWinFanfare();
  }

  public playTick() {
    this.playCountdownTick(5);
  }
}

export const sound = new CasinoAudioEngine();
