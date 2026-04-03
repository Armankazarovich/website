"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Volume2, VolumeX, X } from "lucide-react";

// ─── Типы ─────────────────────────────────────────────────────────────────────

type SoundId = "rain" | "ocean" | "forest" | "fire" | "wind" | "cafe";

interface Sound {
  id: SoundId;
  label: string;
  emoji: string;
  desc: string;
  color: string;
}

const SOUNDS: Sound[] = [
  { id: "rain",   label: "Дождь",   emoji: "🌧️", desc: "Мелкий дождь по стеклу",  color: "#4a90d9" },
  { id: "ocean",  label: "Океан",   emoji: "🌊", desc: "Волны на берегу",          color: "#0ea5e9" },
  { id: "forest", label: "Лес",     emoji: "🌲", desc: "Птицы и шелест листьев",   color: "#22c55e" },
  { id: "fire",   label: "Костёр",  emoji: "🔥", desc: "Треск огня",               color: "#f97316" },
  { id: "wind",   label: "Ветер",   emoji: "💨", desc: "Горный ветер",             color: "#a78bfa" },
  { id: "cafe",   label: "Кафе",    emoji: "☕", desc: "Тихий шум кофейни",        color: "#b45309" },
];

// ─── Web Audio синтез — все звуки без файлов ──────────────────────────────────

class AmbientAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private nodes: AudioNode[] = [];
  private sources: AudioBufferSourceNode[] = [];
  private oscs: OscillatorNode[] = [];
  private birdTimer: ReturnType<typeof setTimeout> | null = null;

  private getCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);
    }
    return this.ctx;
  }

  // Белый шум буфер
  private makeNoise(ctx: AudioContext, duration = 4): AudioBufferSourceNode {
    const size = ctx.sampleRate * duration;
    const buf = ctx.createBuffer(2, size, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const data = buf.getChannelData(c);
      for (let i = 0; i < size; i++) data[i] = Math.random() * 2 - 1;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    return src;
  }

  // Розовый шум (более натуральный)
  private makePinkNoise(ctx: AudioContext): AudioBufferSourceNode {
    const size = ctx.sampleRate * 6;
    const buf = ctx.createBuffer(2, size, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const data = buf.getChannelData(c);
      let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
      for (let i = 0; i < size; i++) {
        const wn = Math.random() * 2 - 1;
        b0=0.99886*b0+wn*0.0555179; b1=0.99332*b1+wn*0.0750759;
        b2=0.96900*b2+wn*0.1538520; b3=0.86650*b3+wn*0.3104856;
        b4=0.55000*b4+wn*0.5329522; b5=-0.7616*b5-wn*0.0168980;
        data[i]=(b0+b1+b2+b3+b4+b5+b6+wn*0.5362)*0.11;
        b6=wn*0.115926;
      }
    }
    const src = ctx.createBufferSource();
    src.buffer = buf; src.loop = true;
    return src;
  }

  setVolume(v: number) {
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(v, this.getCtx().currentTime, 0.1);
    }
  }

  stop() {
    if (this.birdTimer) { clearTimeout(this.birdTimer); this.birdTimer = null; }
    try { this.sources.forEach(s => s.stop()); } catch {}
    try { this.oscs.forEach(o => o.stop()); } catch {}
    this.nodes = []; this.sources = []; this.oscs = [];
  }

  play(id: SoundId, volume: number) {
    this.stop();
    const ctx = this.getCtx();
    if (ctx.state === "suspended") ctx.resume();
    const master = this.masterGain!;
    master.gain.setValueAtTime(volume, ctx.currentTime);

    if (id === "rain")   this.playRain(ctx, master);
    if (id === "ocean")  this.playOcean(ctx, master);
    if (id === "forest") this.playForest(ctx, master);
    if (id === "fire")   this.playFire(ctx, master);
    if (id === "wind")   this.playWind(ctx, master);
    if (id === "cafe")   this.playCafe(ctx, master);
  }

  private playRain(ctx: AudioContext, out: AudioNode) {
    // Основной шум дождя
    const noise = this.makeNoise(ctx, 3);
    const lpf = ctx.createBiquadFilter();
    lpf.type = "lowpass"; lpf.frequency.value = 2000; lpf.Q.value = 0.8;
    const hpf = ctx.createBiquadFilter();
    hpf.type = "highpass"; hpf.frequency.value = 400;
    const g = ctx.createGain(); g.gain.value = 0.55;

    noise.connect(lpf); lpf.connect(hpf); hpf.connect(g); g.connect(out);
    noise.start(); this.sources.push(noise);

    // Капли — редкий лёгкий тик
    const dropNoise = this.makeNoise(ctx, 2);
    const dropBpf = ctx.createBiquadFilter();
    dropBpf.type = "bandpass"; dropBpf.frequency.value = 3500; dropBpf.Q.value = 2;
    const dropG = ctx.createGain(); dropG.gain.value = 0.12;
    dropNoise.connect(dropBpf); dropBpf.connect(dropG); dropG.connect(out);
    dropNoise.start(); this.sources.push(dropNoise);
  }

  private playOcean(ctx: AudioContext, out: AudioNode) {
    const pink = this.makePinkNoise(ctx);
    const lpf = ctx.createBiquadFilter();
    lpf.type = "lowpass"; lpf.frequency.value = 800; lpf.Q.value = 0.5;
    const waveG = ctx.createGain(); waveG.gain.value = 0.7;

    // LFO — волны ~7 секунд
    const lfo = ctx.createOscillator();
    lfo.type = "sine"; lfo.frequency.value = 0.14;
    const lfoG = ctx.createGain(); lfoG.gain.value = 250;
    lfo.connect(lfoG); lfoG.connect(lpf.frequency);

    // Второй слой — всплески
    const noise2 = this.makeNoise(ctx, 5);
    const lpf2 = ctx.createBiquadFilter();
    lpf2.type = "bandpass"; lpf2.frequency.value = 500; lpf2.Q.value = 0.3;
    const lfo2 = ctx.createOscillator();
    lfo2.type = "sine"; lfo2.frequency.value = 0.09;
    const lfoG2 = ctx.createGain(); lfoG2.gain.value = 0.25;
    lfo2.connect(lfoG2); lfoG2.connect(waveG.gain);
    const g2 = ctx.createGain(); g2.gain.value = 0.35;

    pink.connect(lpf); lpf.connect(waveG); waveG.connect(out);
    noise2.connect(lpf2); lpf2.connect(g2); g2.connect(out);
    pink.start(); noise2.start();
    lfo.start(); lfo2.start();
    this.sources.push(pink, noise2);
    this.oscs.push(lfo, lfo2);
  }

  private playForest(ctx: AudioContext, out: AudioNode) {
    // Фоновый ветерок
    const wind = this.makePinkNoise(ctx);
    const lpf = ctx.createBiquadFilter();
    lpf.type = "lowpass"; lpf.frequency.value = 600;
    const wG = ctx.createGain(); wG.gain.value = 0.15;
    wind.connect(lpf); lpf.connect(wG); wG.connect(out);
    wind.start(); this.sources.push(wind);

    // Шелест листьев
    const leaves = this.makeNoise(ctx, 4);
    const lBpf = ctx.createBiquadFilter();
    lBpf.type = "bandpass"; lBpf.frequency.value = 2000; lBpf.Q.value = 0.4;
    const lG = ctx.createGain(); lG.gain.value = 0.12;
    leaves.connect(lBpf); lBpf.connect(lG); lG.connect(out);
    leaves.start(); this.sources.push(leaves);

    // Птицы — рандомные чирикания
    const chirp = () => {
      if (!this.ctx) return;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      // Рандомная высота птицы
      const baseFreq = 1800 + Math.random() * 1400;
      o.frequency.setValueAtTime(baseFreq, ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(baseFreq * 1.3, ctx.currentTime + 0.06);
      o.frequency.exponentialRampToValueAtTime(baseFreq, ctx.currentTime + 0.12);
      g.gain.setValueAtTime(0, ctx.currentTime);
      g.gain.linearRampToValueAtTime(0.08 + Math.random() * 0.06, ctx.currentTime + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      o.connect(g); g.connect(out);
      o.start(ctx.currentTime); o.stop(ctx.currentTime + 0.18);

      // Иногда двойной чирик
      if (Math.random() > 0.6) {
        const o2 = ctx.createOscillator();
        const g2 = ctx.createGain();
        o2.type = "sine";
        o2.frequency.setValueAtTime(baseFreq * 1.1, ctx.currentTime + 0.22);
        o2.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, ctx.currentTime + 0.28);
        g2.gain.setValueAtTime(0, ctx.currentTime + 0.22);
        g2.gain.linearRampToValueAtTime(0.07, ctx.currentTime + 0.24);
        g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        o2.connect(g2); g2.connect(out);
        o2.start(ctx.currentTime + 0.22); o2.stop(ctx.currentTime + 0.38);
      }

      // Следующая птица через 2–8 сек
      this.birdTimer = setTimeout(chirp, 2000 + Math.random() * 6000);
    };
    this.birdTimer = setTimeout(chirp, 1000 + Math.random() * 2000);
  }

  private playFire(ctx: AudioContext, out: AudioNode) {
    // Основной треск — бурый шум
    const noise = this.makePinkNoise(ctx);
    const lpf = ctx.createBiquadFilter();
    lpf.type = "lowpass"; lpf.frequency.value = 1200;
    const g = ctx.createGain(); g.gain.value = 0.6;

    // LFO — пульсация огня
    const lfo = ctx.createOscillator();
    lfo.type = "sine"; lfo.frequency.value = 0.8;
    const lfoG = ctx.createGain(); lfoG.gain.value = 0.15;
    lfo.connect(lfoG); lfoG.connect(g.gain);

    noise.connect(lpf); lpf.connect(g); g.connect(out);
    noise.start(); lfo.start();
    this.sources.push(noise); this.oscs.push(lfo);

    // Высокочастотный треск
    const crackle = this.makeNoise(ctx, 2);
    const cBpf = ctx.createBiquadFilter();
    cBpf.type = "bandpass"; cBpf.frequency.value = 3000; cBpf.Q.value = 3;
    const cG = ctx.createGain(); cG.gain.value = 0.08;
    crackle.connect(cBpf); cBpf.connect(cG); cG.connect(out);
    crackle.start(); this.sources.push(crackle);
  }

  private playWind(ctx: AudioContext, out: AudioNode) {
    const pink = this.makePinkNoise(ctx);
    const lpf = ctx.createBiquadFilter();
    lpf.type = "lowpass"; lpf.frequency.value = 900;
    const g = ctx.createGain(); g.gain.value = 0.65;

    // Медленный LFO — порывы ветра
    const lfo = ctx.createOscillator();
    lfo.type = "sine"; lfo.frequency.value = 0.05;
    const lfoG = ctx.createGain(); lfoG.gain.value = 0.35;
    lfo.connect(lfoG); lfoG.connect(g.gain);

    // Свист ветра
    const whistle = ctx.createOscillator();
    whistle.type = "sine"; whistle.frequency.value = 380;
    const wG = ctx.createGain(); wG.gain.value = 0.04;
    const lfo2 = ctx.createOscillator();
    lfo2.type = "sine"; lfo2.frequency.value = 0.12;
    const lfoG2 = ctx.createGain(); lfoG2.gain.value = 60;
    lfo2.connect(lfoG2); lfoG2.connect(whistle.frequency);
    const wLfo3 = ctx.createOscillator();
    wLfo3.type = "sine"; wLfo3.frequency.value = 0.07;
    const wLfoG3 = ctx.createGain(); wLfoG3.gain.value = 0.03;
    wLfo3.connect(wLfoG3); wLfoG3.connect(wG.gain);

    pink.connect(lpf); lpf.connect(g); g.connect(out);
    whistle.connect(wG); wG.connect(out);
    pink.start(); whistle.start(); lfo.start(); lfo2.start(); wLfo3.start();
    this.sources.push(pink);
    this.oscs.push(lfo, lfo2, whistle, wLfo3);
  }

  private playCafe(ctx: AudioContext, out: AudioNode) {
    // Фоновый гул кофейни — смешанный шум
    const noise = this.makePinkNoise(ctx);
    const lpf = ctx.createBiquadFilter();
    lpf.type = "lowpass"; lpf.frequency.value = 1800;
    const hpf = ctx.createBiquadFilter();
    hpf.type = "highpass"; hpf.frequency.value = 200;
    const g = ctx.createGain(); g.gain.value = 0.35;
    noise.connect(lpf); lpf.connect(hpf); hpf.connect(g); g.connect(out);
    noise.start(); this.sources.push(noise);

    // Лёгкий говор — несколько случайных тонов
    for (let i = 0; i < 4; i++) {
      const o = ctx.createOscillator();
      o.type = "sine";
      const baseF = 180 + Math.random() * 120;
      o.frequency.value = baseF;
      const oG = ctx.createGain(); oG.gain.value = 0.018;
      const lfo = ctx.createOscillator();
      lfo.type = "sine"; lfo.frequency.value = 0.3 + Math.random() * 0.4;
      const lfoG = ctx.createGain(); lfoG.gain.value = 0.012;
      lfo.connect(lfoG); lfoG.connect(oG.gain);
      o.connect(oG); oG.connect(out);
      o.start(); lfo.start();
      this.oscs.push(o, lfo);
    }

    // Звяканье чашек — редкое
    const clink = () => {
      if (!this.ctx) return;
      const o = ctx.createOscillator();
      o.type = "sine"; o.frequency.value = 1400 + Math.random() * 600;
      const g2 = ctx.createGain();
      g2.gain.setValueAtTime(0.05, ctx.currentTime);
      g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      o.connect(g2); g2.connect(out);
      o.start(ctx.currentTime); o.stop(ctx.currentTime + 0.35);
      this.birdTimer = setTimeout(clink, 4000 + Math.random() * 8000);
    };
    this.birdTimer = setTimeout(clink, 2000 + Math.random() * 4000);
  }

  destroy() {
    this.stop();
    this.ctx?.close();
    this.ctx = null;
    this.masterGain = null;
  }
}

// ─── Компонент ────────────────────────────────────────────────────────────────

export function AdminAmbientSound() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<SoundId | null>(null);
  const [volume, setVolume] = useState(0.35);
  const engineRef = useRef<AmbientAudioEngine | null>(null);

  useEffect(() => {
    engineRef.current = new AmbientAudioEngine();
    return () => { engineRef.current?.destroy(); };
  }, []);

  const play = useCallback((id: SoundId) => {
    if (active === id) {
      // Выключить
      engineRef.current?.stop();
      setActive(null);
    } else {
      engineRef.current?.play(id, volume);
      setActive(id);
    }
  }, [active, volume]);

  const handleVolume = (v: number) => {
    setVolume(v);
    engineRef.current?.setVolume(v);
  };

  const activeSound = SOUNDS.find(s => s.id === active);

  return (
    <>
      {/* ── Кнопка в топбаре ── */}
      <button
        onClick={() => setOpen(o => !o)}
        title="Природные звуки"
        className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-muted/80 transition-colors relative aray-icon-spin"
      >
        {active ? (
          <Volume2 className="w-4 h-4" style={{ color: activeSound?.color || "hsl(var(--primary))" }} />
        ) : (
          <VolumeX className="w-4 h-4 text-muted-foreground" />
        )}
        {active && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full animate-pulse"
            style={{ background: activeSound?.color || "hsl(var(--primary))" }} />
        )}
      </button>

      {/* ── Попап выбора звука ── */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[55]"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.97 }}
              transition={{ type: "spring", damping: 28, stiffness: 400 }}
              className="fixed z-[56]"
              style={{
                top: "60px",
                right: "140px",
                width: "300px",
                borderRadius: "18px",
                background: "linear-gradient(135deg, hsl(var(--primary) / 0.10) 0%, transparent 55%), rgba(8,12,28,0.92)",
                backdropFilter: "blur(32px) saturate(200%)",
                WebkitBackdropFilter: "blur(32px) saturate(200%)",
                border: "1px solid rgba(255,255,255,0.12)",
                boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
              }}
            >
              {/* Шапка */}
              <div className="flex items-center gap-2.5 px-4 py-3.5"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                <span className="text-lg">🎵</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white/90">Природные звуки</p>
                  <p className="text-[10px] text-white/40">
                    {active ? `▶ ${activeSound?.label} играет` : "Выбери атмосферу"}
                  </p>
                </div>
                <button onClick={() => setOpen(false)}
                  className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors">
                  <X className="w-3.5 h-3.5 text-white/40" />
                </button>
              </div>

              {/* Звуки */}
              <div className="p-3 grid grid-cols-3 gap-2">
                {SOUNDS.map(s => {
                  const isActive = active === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => play(s.id)}
                      className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl transition-all"
                      style={{
                        background: isActive
                          ? `${s.color}28`
                          : "rgba(255,255,255,0.05)",
                        border: `1px solid ${isActive ? s.color + "60" : "rgba(255,255,255,0.08)"}`,
                        boxShadow: isActive ? `0 0 16px ${s.color}30` : "none",
                        transform: isActive ? "scale(1.04)" : "scale(1)",
                      }}
                    >
                      {/* Эмодзи с анимацией если активен */}
                      <span className="text-2xl" style={{
                        animation: isActive ? "soundPulse 2s ease-in-out infinite" : "none",
                        display: "block",
                      }}>
                        {s.emoji}
                      </span>
                      <span className="text-[11px] font-medium"
                        style={{ color: isActive ? s.color : "rgba(255,255,255,0.65)" }}>
                        {s.label}
                      </span>
                      {isActive && (
                        <div className="flex gap-0.5 items-end h-3">
                          {[1,2,3,4,3].map((h, i) => (
                            <div key={i} className="w-0.5 rounded-full"
                              style={{
                                height: `${h * 3}px`,
                                background: s.color,
                                animation: `soundBar 0.8s ease-in-out ${i * 0.12}s infinite alternate`,
                              }} />
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Громкость */}
              <div className="px-4 pb-4 pt-1">
                <div className="flex items-center gap-3">
                  <VolumeX className="w-3.5 h-3.5 text-white/30 shrink-0" />
                  <div className="flex-1 relative">
                    <input
                      type="range"
                      min="0" max="1" step="0.01"
                      value={volume}
                      onChange={e => handleVolume(Number(e.target.value))}
                      className="w-full h-1 rounded-full appearance-none cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, hsl(var(--primary)) ${volume * 100}%, rgba(255,255,255,0.15) ${volume * 100}%)`,
                        accentColor: "hsl(var(--primary))",
                      }}
                    />
                  </div>
                  <Volume2 className="w-3.5 h-3.5 text-white/30 shrink-0" />
                </div>
                {active && (
                  <p className="text-[10px] text-white/25 text-center mt-2">
                    Нажми на активный звук чтобы выключить
                  </p>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <style jsx global>{`
        @keyframes soundPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.12); }
        }
        @keyframes soundBar {
          from { transform: scaleY(0.4); }
          to   { transform: scaleY(1); }
        }
      `}</style>
    </>
  );
}
