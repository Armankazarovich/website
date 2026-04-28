"use client";

/**
 * flyIconToHeader — анимация «иконка раздела летит в хедер».
 *
 * Видение Армана из чата 28.04 вечер: "анимация как корзина в пилорусе —
 * нажимаю раздел, иконка летит в хедер и меняется раздел". Это наша фича
 * для перехода между разделами админки.
 *
 * Алгоритм:
 *  1) Берём position иконки источника (кнопка из popup / Quick Action / пункт меню)
 *  2) Берём position целевой иконки в хедере (data-header-icon)
 *  3) Создаём круглый "пузырёк" в primary-цвете с белым SVG иконки
 *  4) Анимируем по параболической дуге с easing (как cart-fly)
 *  5) При прибытии — bounce-эффект на header iconе + burst частицами
 *  6) Удаляем элемент
 *
 * Использование:
 *   <button onClick={(e) => {
 *     flyIconToHeader(e.currentTarget, iconSvg, () => router.push("/admin/orders"));
 *   }}>...</button>
 *
 * iconSvg — строка с SVG path (16-24px viewBox), которую вставим в "пузырёк".
 * onArrive — callback когда анимация дошла до хедера (там делаем navigate).
 */

const DEFAULT_ICON_SVG = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/></svg>`;

export interface FlyIconOptions {
  /** Селектор целевой иконки в шапке (по умолчанию [data-header-icon]) */
  targetSelector?: string;
  /** SVG-разметка для пузырька (innerHTML). По умолчанию — кружок. */
  iconSvg?: string;
  /** Размер пузырька в px (по умолчанию 40) */
  size?: number;
  /** Длительность мс (по умолчанию 520) */
  duration?: number;
  /** Колбэк когда пузырёк прилетел в шапку (тут обычно делаем navigate) */
  onArrive?: () => void;
  /** Колбэк когда анимация полностью завершена (после burst) */
  onComplete?: () => void;
}

export function flyIconToHeader(fromElement: HTMLElement, options: FlyIconOptions = {}): boolean {
  const {
    targetSelector = "[data-header-icon]",
    iconSvg = DEFAULT_ICON_SVG,
    size = 40,
    duration = 520,
    onArrive,
    onComplete,
  } = options;

  if (typeof window === "undefined") return false;

  // Respect prefers-reduced-motion
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    onArrive?.();
    onComplete?.();
    return true;
  }

  const targetEl = document.querySelector(targetSelector) as HTMLElement | null;
  if (!targetEl || !fromElement) {
    onArrive?.();
    onComplete?.();
    return false;
  }

  const fromRect = fromElement.getBoundingClientRect();
  const toRect = targetEl.getBoundingClientRect();

  // Skip animation if elements off-screen
  if (fromRect.width === 0 || fromRect.height === 0 || toRect.width === 0) {
    onArrive?.();
    onComplete?.();
    return false;
  }

  // Read current brand color from CSS variable
  const hsl = getComputedStyle(document.documentElement)
    .getPropertyValue("--brand-primary")
    .trim() || getComputedStyle(document.documentElement)
    .getPropertyValue("--primary")
    .trim();
  const brandColor = hsl ? `hsl(${hsl})` : "#3b82f6";

  const startX = fromRect.left + fromRect.width / 2 - size / 2;
  const startY = fromRect.top + fromRect.height / 2 - size / 2;
  const endX = toRect.left + toRect.width / 2 - size / 2;
  const endY = toRect.top + toRect.height / 2 - size / 2;

  // Bubble element
  const el = document.createElement("div");
  el.setAttribute("aria-hidden", "true");
  el.style.cssText = `
    position: fixed;
    z-index: 9999;
    pointer-events: none;
    width: ${size}px;
    height: ${size}px;
    border-radius: 14px;
    left: ${startX}px;
    top: ${startY}px;
    background: ${brandColor};
    color: white;
    box-shadow: 0 8px 24px ${brandColor}66, 0 0 0 1px ${brandColor}33;
    display: flex;
    align-items: center;
    justify-content: center;
    will-change: transform, opacity, left, top;
  `;
  el.innerHTML = iconSvg;
  document.body.appendChild(el);

  const start = performance.now();
  let arrived = false;

  function animate(time: number) {
    const elapsed = time - start;
    const t = Math.min(elapsed / duration, 1);

    // Smooth cubic in-out
    const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    // Parabolic arc — small lift up before landing
    const arcHeight = Math.min(80, Math.abs(startX - endX) * 0.18 + 30);
    const x = startX + (endX - startX) * eased;
    const y = startY + (endY - startY) * eased - arcHeight * Math.sin(Math.PI * t);

    const scale = 1 - 0.45 * eased;
    const opacity = t > 0.85 ? 1 - (t - 0.85) / 0.15 : 1;

    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.transform = `scale(${scale})`;
    el.style.opacity = `${opacity}`;

    // ~70% полёта = "прибыл" — пора вызывать navigate
    if (!arrived && t > 0.7) {
      arrived = true;
      onArrive?.();
    }

    if (t < 1) {
      requestAnimationFrame(animate);
    } else {
      el.remove();
      // Bounce + burst on header icon (targetEl может быть unmounted к этому моменту)
      const targetNow = document.querySelector(targetSelector) as HTMLElement | null;
      try {
        targetNow?.animate(
          [
            { transform: "scale(1)" },
            { transform: "scale(1.18)" },
            { transform: "scale(0.92)" },
            { transform: "scale(1.06)" },
            { transform: "scale(1)" },
          ],
          { duration: 380, easing: "ease-out" }
        );
      } catch {/* ignore */}
      spawnBurst(toRect, brandColor);
      onComplete?.();
    }
  }

  requestAnimationFrame(animate);
  return true;
}

function spawnBurst(toRect: DOMRect, brandColor: string) {
  const cx = toRect.left + toRect.width / 2;
  const cy = toRect.top + toRect.height / 2;
  const count = 5;

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + Math.PI / 4;
    const p = document.createElement("div");
    p.setAttribute("aria-hidden", "true");
    p.style.cssText = `
      position: fixed;
      z-index: 9998;
      pointer-events: none;
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: ${brandColor};
      left: ${cx - 2.5}px;
      top: ${cy - 2.5}px;
      opacity: 0.85;
      will-change: transform, opacity;
    `;
    document.body.appendChild(p);

    const dx = Math.cos(angle) * 18;
    const dy = Math.sin(angle) * 18;
    const dur = 280;
    const pStart = performance.now();

    function animParticle(time: number) {
      const pt = Math.min((time - pStart) / dur, 1);
      p.style.left = `${cx - 2.5 + dx * pt}px`;
      p.style.top = `${cy - 2.5 + dy * pt}px`;
      p.style.opacity = `${0.85 * (1 - pt)}`;
      p.style.transform = `scale(${1 - pt * 0.7})`;
      if (pt < 1) requestAnimationFrame(animParticle);
      else p.remove();
    }
    requestAnimationFrame(animParticle);
  }
}

/** Получить SVG-разметку для lucide иконки по её отрендеренному <svg> */
export function getIconSvgFromElement(el: HTMLElement): string {
  const svg = el.querySelector("svg");
  if (!svg) return DEFAULT_ICON_SVG;
  // Клонируем и нормализуем для пузырька (white stroke, fixed size)
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("width", "20");
  clone.setAttribute("height", "20");
  clone.setAttribute("stroke", "white");
  clone.setAttribute("fill", "none");
  clone.setAttribute("stroke-width", "2");
  clone.setAttribute("stroke-linecap", "round");
  clone.setAttribute("stroke-linejoin", "round");
  return clone.outerHTML;
}
