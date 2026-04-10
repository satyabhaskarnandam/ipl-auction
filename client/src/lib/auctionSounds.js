/**
 * Lightweight Web Audio beeps — no asset files required.
 * Browsers may block audio until a user gesture; first interaction unlocks.
 */

let audioCtx;
const channelLastPlayedAt = new Map();
const activeSources = new Map();
const MASTER_GAIN = 2.2;
const EXTERNAL_HAMMER_SRCS = [
  "/sounds/auction-hammer-real.mp3",
  "/sounds/auction-hammer-real.mp3.mp3",
];
let hammerAudio;
let hammerSrcIndex = 0;

function initHammerAudio() {
  if (typeof window === "undefined" || typeof Audio === "undefined") return;
  if (hammerAudio) return;
  try {
    hammerAudio = new Audio(EXTERNAL_HAMMER_SRCS[hammerSrcIndex]);
    hammerAudio.preload = "auto";
    hammerAudio.src = EXTERNAL_HAMMER_SRCS[hammerSrcIndex];
    hammerAudio.addEventListener(
      "canplaythrough",
      () => {},
      { once: true }
    );
    hammerAudio.addEventListener("error", () => {
      if (hammerSrcIndex < EXTERNAL_HAMMER_SRCS.length - 1) {
        hammerSrcIndex += 1;
        hammerAudio.src = EXTERNAL_HAMMER_SRCS[hammerSrcIndex];
        hammerAudio.load();
      }
    });
    hammerAudio.load();
  } catch {
    hammerAudio = undefined;
  }
}

function playExternalHammer() {
  initHammerAudio();
  if (!hammerAudio) return false;
  try {
    hammerAudio.currentTime = 0;
    const playPromise = hammerAudio.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {});
    }
    return true;
  } catch {
    return false;
  }
}

function getCtx() {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    audioCtx = new AC();
  }
  return audioCtx;
}

function playToneOnChannel(channel, opts, minGapMs = 40) {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    if (ctx.state !== "running") {
      void ctx.resume().then(() => {
        playToneOnChannel(channel, opts, minGapMs);
      }).catch(() => {});
      return;
    }

    const now = Date.now();
    const last = channelLastPlayedAt.get(channel) || 0;
    if (now - last < minGapMs) return;
    channelLastPlayedAt.set(channel, now);

    const prev = activeSources.get(channel);
    if (prev) {
      try {
        prev.stop();
      } catch {
        /* noop */
      }
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = opts.frequency;
    osc.type = opts.type || "sine";
    const t0 = ctx.currentTime;
    const volume = Math.min(0.25, Math.max(0.0001, (opts.volume || 0.05) * MASTER_GAIN));
    gain.gain.setValueAtTime(volume, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.duration);
    osc.start(t0);
    osc.stop(t0 + opts.duration + 0.03);
    activeSources.set(channel, osc);
    osc.onended = () => {
      if (activeSources.get(channel) === osc) {
        activeSources.delete(channel);
      }
    };
  } catch {
    /* ignore */
  }
}

function playGavelOnChannel(channel, minGapMs = 120) {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    if (ctx.state !== "running") {
      void ctx.resume().then(() => {
        playGavelOnChannel(channel, minGapMs);
      }).catch(() => {});
      return;
    }

    const now = Date.now();
    const last = channelLastPlayedAt.get(channel) || 0;
    if (now - last < minGapMs) return;
    channelLastPlayedAt.set(channel, now);

    const t0 = ctx.currentTime;

    // Short filtered noise burst for wood impact texture.
    const noiseBuffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.04), ctx.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseData.length; i += 1) {
      noiseData[i] = (Math.random() * 2 - 1) * 0.9;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = "bandpass";
    noiseFilter.frequency.value = 920;
    noiseFilter.Q.value = 0.8;

    const noiseGain = ctx.createGain();
    const impactVol = Math.min(0.22, 0.09 * MASTER_GAIN);
    noiseGain.gain.setValueAtTime(impactVol, t0);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.045);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start(t0);
    noise.stop(t0 + 0.05);

    // Low resonances to mimic wooden block/body ring.
    const resonances = [
      { frequency: 170, duration: 0.2, volume: 0.085, type: "triangle" },
      { frequency: 220, duration: 0.22, volume: 0.07, type: "sine" },
      { frequency: 300, duration: 0.16, volume: 0.045, type: "sine" },
    ];

    resonances.forEach((r) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 1200;

      osc.type = r.type;
      osc.frequency.value = r.frequency;

      const vol = Math.min(0.2, r.volume * MASTER_GAIN);
      gain.gain.setValueAtTime(vol, t0);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + r.duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + r.duration + 0.03);
    });
  } catch {
    /* ignore */
  }
}

export const auctionSounds = {
  _MUTED: false,
  preload: () => {
    if (auctionSounds._MUTED) return;
    initHammerAudio();
    const ctx = getCtx();
    if (!ctx) return;
    if (ctx.state !== "running") {
      void ctx.resume().catch(() => {});
    }
  },
  countdownTick: () => {
    if (auctionSounds._MUTED) return;
    playToneOnChannel("countdown", { frequency: 830, duration: 0.08, volume: 0.09 }, 120);
  },
  countdownGo: () => {
    if (auctionSounds._MUTED) return;
    playToneOnChannel("countdown", { frequency: 1200, duration: 0.18, volume: 0.12 }, 120);
  },
  roomFull: () => {
    if (auctionSounds._MUTED) return;
    playToneOnChannel("room", { frequency: 660, duration: 0.14, volume: 0.1 }, 120);
  },
  auctionStart: () => {
    if (auctionSounds._MUTED) return;
    playToneOnChannel("auction", { frequency: 523, duration: 0.16, volume: 0.12 }, 120);
  },
  newPlayer: () => {
    if (auctionSounds._MUTED) return;
    playToneOnChannel("entry", { frequency: 698, duration: 0.12, volume: 0.12 }, 80);
  },
  bid: () => {
    if (auctionSounds._MUTED) return;
    playToneOnChannel("bid", { frequency: 440, duration: 0.08, type: "triangle", volume: 0.11 }, 35);
  },
  sold: () => {
    if (auctionSounds._MUTED) return;
    playToneOnChannel("result", { frequency: 392, duration: 0.14, volume: 0.16 }, 80);
    setTimeout(
      () => { if (!auctionSounds._MUTED) playToneOnChannel("result", { frequency: 587, duration: 0.22, volume: 0.17 }, 1); },
      110
    );
  },
  hammer: () => {
    if (auctionSounds._MUTED) return;
    if (!playExternalHammer()) {
      playGavelOnChannel("hammer-real", 120);
    }
  },
  celebration: () => {
    if (auctionSounds._MUTED) return;
    playToneOnChannel("celebration", { frequency: 988, duration: 0.12, volume: 0.15 }, 80);
    setTimeout(
      () => { if (!auctionSounds._MUTED) playToneOnChannel("celebration", { frequency: 1318, duration: 0.12, volume: 0.15 }, 1); },
      80
    );
  },
  unsold: () => {
    if (auctionSounds._MUTED) return;
    playToneOnChannel("result", { frequency: 180, duration: 0.24, type: "triangle", volume: 0.16 }, 80);
  },
  bidClick: () => {
    if (auctionSounds._MUTED) return;
    playToneOnChannel("ui", { frequency: 520, duration: 0.05, volume: 0.1 }, 20);
  },
  timerUrgent: () => {
    if (auctionSounds._MUTED) return;
    playToneOnChannel("countdown", { frequency: 980, duration: 0.07, volume: 0.11 }, 240);
  },
};
