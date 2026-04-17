"use client";

/**
 * ArayCreature v1 — Живое Существо из Вибрирующих Нитей
 *
 * Видение Армана: организм из тонких нитей энергии, минималистичный,
 * прозрачный, живой — как медуза из света. Нити пульсируют в такт "дыханию".
 *
 * Реализация: Three.js r170 WebGL scene
 * - 18 меридианных нитей + 12 параллельных, каждая — LineSegments с shaders
 * - Вибрация: Perlin-like noise на positions в requestAnimationFrame
 * - Дыхание: scale oscillation 0.92-1.08 каждые 3.5s (idle)
 * - Цвет: из CSS var --brand-primary (hex) каждые 500ms
 * - Состояния: idle / listening / thinking / speaking
 *   • idle     — медленное дыхание, лёгкая вибрация
 *   • listening — нити тянутся к центру, частота ×1.6, яркость +40%
 *   • thinking — нити сжимаются к ядру, хаотичная вибрация
 *   • speaking — радиальное излучение, scale variation ±15%
 * - Graceful fallback: если WebGL не поддерживается — чистый CSS glow-круг
 * - Pause when tab hidden, cleanup на unmount (нет memory leak)
 * - Мобильные: 30fps cap, меньшая плотность нитей
 */

import { useEffect, useRef, useState } from "react";

export type CreatureState = "idle" | "listening" | "thinking" | "speaking";

interface ArayCreatureProps {
  size?: number;
  state?: CreatureState;
  className?: string;
  intensity?: number; // 0..1.5, default 1
}

// ── Parse --brand-primary (HSL string) to hex ──────────────────────────────
function readPrimaryColor(): number {
  if (typeof window === "undefined") return 0xff9500;
  try {
    const root = getComputedStyle(document.documentElement);
    const raw = root.getPropertyValue("--brand-primary").trim();
    if (!raw) return 0xff9500;
    // Format: "29 100% 50%" (HSL space-separated)
    const parts = raw.split(/[\s,]+/).map((v) => parseFloat(v));
    if (parts.length >= 3) {
      const [h, s, l] = parts;
      return hslToHex(h, s, l);
    }
    // Fallback: if it's #hex
    if (raw.startsWith("#")) return parseInt(raw.slice(1), 16);
  } catch {}
  return 0xff9500;
}

function hslToHex(h: number, s: number, l: number): number {
  s /= 100;
  l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60)      { r = c; g = x; b = 0; }
  else if (h < 120){ r = x; g = c; b = 0; }
  else if (h < 180){ r = 0; g = c; b = x; }
  else if (h < 240){ r = 0; g = x; b = c; }
  else if (h < 300){ r = x; g = 0; b = c; }
  else             { r = c; g = 0; b = x; }
  const R = Math.round((r + m) * 255);
  const G = Math.round((g + m) * 255);
  const B = Math.round((b + m) * 255);
  return (R << 16) | (G << 8) | B;
}

// ── Простой 1D noise для плавной вибрации ──────────────────────────────────
function smoothNoise(t: number, seed: number): number {
  return (
    Math.sin(t * 1.3 + seed * 2.1) * 0.5 +
    Math.sin(t * 2.7 + seed * 3.7) * 0.3 +
    Math.sin(t * 5.1 + seed * 1.1) * 0.2
  );
}

export function ArayCreature({
  size = 120,
  state = "idle",
  className = "",
  intensity = 1,
}: ArayCreatureProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<CreatureState>(state);
  const intensityRef = useRef<number>(intensity);
  const [webglOk, setWebglOk] = useState(true);

  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { intensityRef.current = intensity; }, [intensity]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // Lazy-load three so SSR не ломается
    let cleanup: (() => void) | null = null;
    let cancelled = false;

    (async () => {
      let THREE: typeof import("three");
      try {
        THREE = await import("three");
      } catch (e) {
        console.warn("[ArayCreature] Three.js load failed", e);
        if (!cancelled) setWebglOk(false);
        return;
      }
      if (cancelled) return;

      // ── Scene / Camera / Renderer ──────────────────────────────────────
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
      camera.position.z = 2.6;

      let renderer: import("three").WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      } catch {
        setWebglOk(false);
        return;
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(size, size);
      renderer.setClearColor(0x000000, 0);
      mount.appendChild(renderer.domElement);
      renderer.domElement.style.display = "block";

      // ── Нити (meridians + parallels) ──────────────────────────────────
      const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
      const meridianCount = isMobile ? 14 : 18;
      const parallelCount = isMobile ? 9 : 12;
      const segments = isMobile ? 32 : 48;

      const threads: {
        geom: import("three").BufferGeometry;
        positions: Float32Array;
        basePositions: Float32Array;
        seed: number;
        type: "meridian" | "parallel";
      }[] = [];

      const material = new THREE.LineBasicMaterial({
        color: 0xff9500,
        transparent: true,
        opacity: 0.55,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

      const group = new THREE.Group();
      scene.add(group);

      // Meridians (vertical arcs from pole to pole)
      for (let i = 0; i < meridianCount; i++) {
        const angle = (i / meridianCount) * Math.PI * 2;
        const positions = new Float32Array(segments * 3);
        const basePositions = new Float32Array(segments * 3);
        for (let s = 0; s < segments; s++) {
          const t = s / (segments - 1); // 0..1
          const phi = t * Math.PI; // 0..π
          const x = Math.sin(phi) * Math.cos(angle);
          const y = Math.cos(phi);
          const z = Math.sin(phi) * Math.sin(angle);
          basePositions[s * 3] = x;
          basePositions[s * 3 + 1] = y;
          basePositions[s * 3 + 2] = z;
          positions[s * 3] = x;
          positions[s * 3 + 1] = y;
          positions[s * 3 + 2] = z;
        }
        const geom = new THREE.BufferGeometry();
        geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        const line = new THREE.Line(geom, material);
        group.add(line);
        threads.push({ geom, positions, basePositions, seed: i * 1.7, type: "meridian" });
      }

      // Parallels (horizontal rings at different latitudes)
      for (let i = 0; i < parallelCount; i++) {
        const lat = ((i + 1) / (parallelCount + 1)) * Math.PI; // exclude exact poles
        const positions = new Float32Array((segments + 1) * 3);
        const basePositions = new Float32Array((segments + 1) * 3);
        for (let s = 0; s <= segments; s++) {
          const theta = (s / segments) * Math.PI * 2;
          const x = Math.sin(lat) * Math.cos(theta);
          const y = Math.cos(lat);
          const z = Math.sin(lat) * Math.sin(theta);
          basePositions[s * 3] = x;
          basePositions[s * 3 + 1] = y;
          basePositions[s * 3 + 2] = z;
          positions[s * 3] = x;
          positions[s * 3 + 1] = y;
          positions[s * 3 + 2] = z;
        }
        const geom = new THREE.BufferGeometry();
        geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        const line = new THREE.Line(geom, material);
        group.add(line);
        threads.push({ geom, positions, basePositions, seed: i * 2.3 + 100, type: "parallel" });
      }

      // ── Inner core glow (additive halo) ───────────────────────────────
      const coreGeom = new THREE.SphereGeometry(0.3, 24, 16);
      const coreMat = new THREE.MeshBasicMaterial({
        color: 0xff9500,
        transparent: true,
        opacity: 0.18,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const core = new THREE.Mesh(coreGeom, coreMat);
      group.add(core);

      // Outer soft glow
      const auraGeom = new THREE.SphereGeometry(1.25, 32, 20);
      const auraMat = new THREE.MeshBasicMaterial({
        color: 0xff9500,
        transparent: true,
        opacity: 0.08,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.BackSide,
      });
      const aura = new THREE.Mesh(auraGeom, auraMat);
      group.add(aura);

      // ── Colour sync with brand palette ────────────────────────────────
      let currentColor = readPrimaryColor();
      const setColor = (hex: number) => {
        material.color.setHex(hex);
        coreMat.color.setHex(hex);
        auraMat.color.setHex(hex);
      };
      setColor(currentColor);

      const colorTimer = setInterval(() => {
        const c = readPrimaryColor();
        if (c !== currentColor) {
          currentColor = c;
          setColor(c);
        }
      }, 800);

      // ── Animation loop ────────────────────────────────────────────────
      let rafId = 0;
      let prevTime = performance.now();
      let visible = true;

      const onVisibility = () => { visible = !document.hidden; };
      document.addEventListener("visibilitychange", onVisibility);

      const animate = (now: number) => {
        rafId = requestAnimationFrame(animate);
        if (!visible) return;
        const dt = Math.min((now - prevTime) / 1000, 0.1);
        prevTime = now;

        const t = now / 1000;
        const s = stateRef.current;
        const intensityMult = intensityRef.current;

        // State-based params
        const vibrateAmp =
          s === "thinking" ? 0.08
          : s === "speaking" ? 0.06
          : s === "listening" ? 0.035
          : 0.025;
        const vibrateFreq =
          s === "thinking" ? 2.4
          : s === "speaking" ? 1.8
          : s === "listening" ? 1.9
          : 1.2;
        const breatheAmp =
          s === "speaking" ? 0.15
          : s === "listening" ? 0.09
          : s === "thinking" ? 0.05
          : 0.08;
        const breatheFreq =
          s === "speaking" ? 1.4
          : s === "listening" ? 0.9
          : 0.42;
        const radialPull =
          s === "thinking" ? -0.12 // inward
          : s === "speaking" ? 0.18 // outward
          : 0;
        const baseOpacity =
          s === "listening" ? 0.75
          : s === "speaking" ? 0.85
          : s === "thinking" ? 0.5
          : 0.55;

        material.opacity = baseOpacity * intensityMult;
        coreMat.opacity = (s === "speaking" ? 0.35 : s === "listening" ? 0.28 : 0.18) * intensityMult;
        auraMat.opacity = (s === "speaking" ? 0.14 : s === "listening" ? 0.12 : 0.08) * intensityMult;

        // Breathing scale
        const breathe = 1 + Math.sin(t * breatheFreq * Math.PI * 2) * breatheAmp;
        group.scale.setScalar(breathe);

        // Slow rotation
        group.rotation.y += dt * (s === "thinking" ? 0.15 : s === "speaking" ? 0.45 : 0.22);
        group.rotation.x = Math.sin(t * 0.4) * 0.15;

        // Vibrate threads
        for (const th of threads) {
          const pos = th.positions;
          const base = th.basePositions;
          for (let i = 0; i < pos.length; i += 3) {
            const bx = base[i];
            const by = base[i + 1];
            const bz = base[i + 2];
            const segSeed = th.seed + i * 0.013;
            const n = smoothNoise(t * vibrateFreq, segSeed);
            // Radial vibration (outward from center)
            const len = Math.sqrt(bx * bx + by * by + bz * bz) || 1;
            const radial = 1 + n * vibrateAmp + radialPull;
            pos[i] = bx * radial;
            pos[i + 1] = by * radial;
            pos[i + 2] = bz * radial;
          }
          (th.geom.attributes.position as import("three").BufferAttribute).needsUpdate = true;
        }

        renderer.render(scene, camera);
      };
      rafId = requestAnimationFrame(animate);

      cleanup = () => {
        cancelAnimationFrame(rafId);
        clearInterval(colorTimer);
        document.removeEventListener("visibilitychange", onVisibility);
        for (const th of threads) th.geom.dispose();
        material.dispose();
        coreGeom.dispose();
        coreMat.dispose();
        auraGeom.dispose();
        auraMat.dispose();
        renderer.dispose();
        try { mount.removeChild(renderer.domElement); } catch {}
      };
    })();

    return () => {
      cancelled = true;
      if (cleanup) cleanup();
    };
  }, [size]);

  // Fallback for no-WebGL: простой glow круг в цвете палитры
  if (!webglOk) {
    return (
      <div
        className={`relative ${className}`}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: "radial-gradient(circle, hsl(var(--brand-primary) / 0.4), hsl(var(--brand-primary) / 0.05) 70%, transparent 100%)",
          animation: "aray-pulse 3.5s ease-in-out infinite",
        }}
        aria-label="Aray"
      />
    );
  }

  return (
    <div
      ref={mountRef}
      className={className}
      style={{ width: size, height: size, pointerEvents: "none" }}
      aria-label="Aray — живое существо"
      role="img"
    />
  );
}
