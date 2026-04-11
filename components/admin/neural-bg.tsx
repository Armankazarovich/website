"use client";

import { useEffect, useRef, useCallback } from "react";

/**
 * NeuralBg — живые тонкие нейросети на фоне админки (классический режим).
 *
 * ✦ Узлы медленно плывут, соединяются тонкими линиями
 * ✦ Реагируют на курсор — узлы притягиваются к мыши
 * ✦ Цвет берётся из CSS --brand-primary (подстраивается под тему)
 * ✦ Стеклянный overlay даже в светлой теме
 * ✦ На мобильных — меньше узлов (экономия батареи)
 * ✦ Page Visibility API — пауза при скрытой вкладке
 */

interface Props {
  enabled?: boolean;
}

// ── Настройки сети ───────────────────────────────────────────────────────────
const NODE_COUNT_DESKTOP = 65;
const NODE_COUNT_MOBILE = 28;
const MAX_LINK_DIST = 180;       // макс расстояние для линии между узлами
const CURSOR_RADIUS = 220;       // радиус притяжения к курсору
const CURSOR_STRENGTH = 0.035;   // сила притяжения (0-1)
const NODE_SPEED = 0.25;         // скорость дрейфа узлов
const LINE_WIDTH = 0.6;          // толщина линий
const NODE_RADIUS = 1.5;         // радиус точки узла
const PULSE_NODES = 4;           // сколько узлов "пульсируют" одновременно

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseX: number;
  baseY: number;
  pulse: number;  // 0-1, для пульсации
}

function hslToRgba(hslStr: string, alpha: number): string {
  // Парсим "27 91% 48%" или "27 91% 55%"
  const parts = hslStr.trim().split(/\s+/);
  if (parts.length < 3) return `rgba(232, 112, 10, ${alpha})`;
  return `hsla(${parts[0]}, ${parts[1]}, ${parts[2]}, ${alpha})`;
}

export function NeuralBg({ enabled = true }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<Node[]>([]);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const rafRef = useRef(0);
  const pausedRef = useRef(false);
  const sizeRef = useRef({ w: 0, h: 0 });

  // ── Инициализация узлов ──────────────────────────────────────────────────
  const initNodes = useCallback((w: number, h: number) => {
    const isMobile = w < 1024;
    const count = isMobile ? NODE_COUNT_MOBILE : NODE_COUNT_DESKTOP;
    const nodes: Node[] = [];
    for (let i = 0; i < count; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      nodes.push({
        x, y,
        vx: (Math.random() - 0.5) * NODE_SPEED * 2,
        vy: (Math.random() - 0.5) * NODE_SPEED * 2,
        baseX: x,
        baseY: y,
        pulse: i < PULSE_NODES ? Math.random() : 0,
      });
    }
    nodesRef.current = nodes;
  }, []);

  // ── Главный цикл анимации ────────────────────────────────────────────────
  const animate = useCallback(() => {
    if (pausedRef.current) {
      rafRef.current = requestAnimationFrame(animate);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { w, h } = sizeRef.current;
    ctx.clearRect(0, 0, w, h);

    // Получаем цвет бренда
    const brandHSL = getComputedStyle(document.documentElement)
      .getPropertyValue("--brand-primary").trim() || "27 91% 48%";
    const isDark = document.documentElement.classList.contains("dark");

    const nodes = nodesRef.current;
    const mx = mouseRef.current.x;
    const my = mouseRef.current.y;

    // ── Обновляем позиции ────────────────────────────────────────────────
    for (const node of nodes) {
      // Дрейф
      node.x += node.vx;
      node.y += node.vy;

      // Отражение от стен
      if (node.x < 0 || node.x > w) node.vx *= -1;
      if (node.y < 0 || node.y > h) node.vy *= -1;
      node.x = Math.max(0, Math.min(w, node.x));
      node.y = Math.max(0, Math.min(h, node.y));

      // Притяжение к курсору
      const dx = mx - node.x;
      const dy = my - node.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < CURSOR_RADIUS && dist > 1) {
        const force = (1 - dist / CURSOR_RADIUS) * CURSOR_STRENGTH;
        node.x += dx * force;
        node.y += dy * force;
      }

      // Пульсация (медленно нарастает и убывает)
      if (node.pulse > 0) {
        node.pulse += 0.008;
        if (node.pulse > 1) node.pulse = 0;
      } else if (Math.random() < 0.0003) {
        node.pulse = 0.01; // случайно запускаем пульс
      }
    }

    // ── Рисуем линии между близкими узлами ──────────────────────────────
    const lineAlphaBase = isDark ? 0.15 : 0.10;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MAX_LINK_DIST) {
          const alpha = lineAlphaBase * (1 - dist / MAX_LINK_DIST);

          // Линии ярче рядом с курсором
          const midX = (nodes[i].x + nodes[j].x) / 2;
          const midY = (nodes[i].y + nodes[j].y) / 2;
          const cursorDist = Math.sqrt((mx - midX) ** 2 + (my - midY) ** 2);
          const cursorBoost = cursorDist < CURSOR_RADIUS
            ? 1 + (1 - cursorDist / CURSOR_RADIUS) * 2
            : 1;

          ctx.beginPath();
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.strokeStyle = hslToRgba(brandHSL, Math.min(alpha * cursorBoost, isDark ? 0.35 : 0.22));
          ctx.lineWidth = LINE_WIDTH;
          ctx.stroke();
        }
      }
    }

    // ── Рисуем узлы ─────────────────────────────────────────────────────
    for (const node of nodes) {
      const cursorDist = Math.sqrt((mx - node.x) ** 2 + (my - node.y) ** 2);
      const isNearCursor = cursorDist < CURSOR_RADIUS;

      // Размер: больше у курсора + пульсация
      const pulseScale = node.pulse > 0 ? 1 + Math.sin(node.pulse * Math.PI) * 0.8 : 0;
      const cursorScale = isNearCursor ? 1 + (1 - cursorDist / CURSOR_RADIUS) * 1.2 : 0;
      const radius = NODE_RADIUS + cursorScale + pulseScale;

      // Альфа: ярче у курсора
      const baseAlpha = isDark ? 0.35 : 0.25;
      const alpha = Math.min(baseAlpha + cursorScale * 0.3 + pulseScale * 0.2, isDark ? 0.9 : 0.6);

      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = hslToRgba(brandHSL, alpha);
      ctx.fill();

      // Свечение у пульсирующих узлов
      if (pulseScale > 0.3 || isNearCursor) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius * 3, 0, Math.PI * 2);
        ctx.fillStyle = hslToRgba(brandHSL, (isDark ? 0.08 : 0.05) * (pulseScale + cursorScale * 0.3));
        ctx.fill();
      }
    }

    rafRef.current = requestAnimationFrame(animate);
  }, []);

  // ── Lifecycle ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio, 2);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.scale(dpr, dpr);
      sizeRef.current = { w, h };
      if (nodesRef.current.length === 0 || Math.abs(w - nodesRef.current[0]?.baseX) > w * 0.3) {
        initNodes(w, h);
      }
    };

    const handleMouse = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
    };

    const handleVisibility = () => {
      pausedRef.current = document.hidden;
    };

    resize();
    rafRef.current = requestAnimationFrame(animate);

    window.addEventListener("resize", resize, { passive: true });
    document.addEventListener("mousemove", handleMouse, { passive: true });
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      document.removeEventListener("mousemove", handleMouse);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [enabled, animate, initNodes]);

  if (!enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}
