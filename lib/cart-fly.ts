"use client";

export function flyToCart(fromElement: HTMLElement, _imageUrl?: string | null) {
  const cartIcon = document.querySelector("[data-cart-icon]") as HTMLElement;
  if (!cartIcon) return;

  const fromRect = fromElement.getBoundingClientRect();
  const toRect = cartIcon.getBoundingClientRect();

  // Read current brand color from CSS variable (supports theme switching)
  const hsl = getComputedStyle(document.documentElement)
    .getPropertyValue("--brand-primary")
    .trim();
  const brandColor = hsl ? `hsl(${hsl})` : "#E8700A";

  const size = 40;
  const startX = fromRect.left + fromRect.width / 2 - size / 2;
  const startY = fromRect.top + fromRect.height / 2 - size / 2;
  const endX = toRect.left + toRect.width / 2 - size / 2;
  const endY = toRect.top + toRect.height / 2 - size / 2;

  // Branded bubble — color follows active palette
  const el = document.createElement("div");
  el.style.cssText = `
    position: fixed;
    z-index: 9999;
    pointer-events: none;
    width: ${size}px;
    height: ${size}px;
    border-radius: 50%;
    left: ${startX}px;
    top: ${startY}px;
    background: ${brandColor};
    box-shadow: 0 4px 20px ${brandColor}99, 0 0 0 0 ${brandColor}4D;
    display: flex;
    align-items: center;
    justify-content: center;
  `;
  el.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>`;
  document.body.appendChild(el);

  const duration = 600;
  const start = performance.now();

  function animate(time: number) {
    const elapsed = time - start;
    const t = Math.min(elapsed / duration, 1);

    // ease-in cubic for natural feel
    const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    // parabolic arc upward
    const arcHeight = Math.min(130, Math.abs(startY - endY) * 0.7 + 60);
    const x = startX + (endX - startX) * eased;
    const y = startY + (endY - startY) * eased - arcHeight * Math.sin(Math.PI * t);

    const scale = 1 - 0.6 * eased;
    const opacity = t > 0.8 ? 1 - (t - 0.8) / 0.2 : 1;

    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.transform = `scale(${scale})`;
    el.style.opacity = `${opacity}`;

    if (t < 1) {
      requestAnimationFrame(animate);
    } else {
      el.remove();
      // Burst particles at cart
      spawnBurst(toRect);
      // Bounce the cart icon
      cartIcon.animate(
        [
          { transform: "scale(1)" },
          { transform: "scale(1.5)" },
          { transform: "scale(0.85)" },
          { transform: "scale(1.15)" },
          { transform: "scale(1)" },
        ],
        { duration: 400, easing: "ease-out" }
      );
    }
  }

  requestAnimationFrame(animate);
}

function spawnBurst(toRect: DOMRect) {
  const cx = toRect.left + toRect.width / 2;
  const cy = toRect.top + toRect.height / 2;
  const count = 6;

  const hsl = getComputedStyle(document.documentElement)
    .getPropertyValue("--brand-primary")
    .trim();
  const brandColor = hsl ? `hsl(${hsl})` : "#E8700A";

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const p = document.createElement("div");
    p.style.cssText = `
      position: fixed;
      z-index: 9998;
      pointer-events: none;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: ${brandColor};
      left: ${cx - 3}px;
      top: ${cy - 3}px;
      opacity: 1;
    `;
    document.body.appendChild(p);

    const dx = Math.cos(angle) * 22;
    const dy = Math.sin(angle) * 22;
    const dur = 320;
    const pStart = performance.now();

    function animParticle(time: number) {
      const pt = Math.min((time - pStart) / dur, 1);
      p.style.left = `${cx - 3 + dx * pt}px`;
      p.style.top = `${cy - 3 + dy * pt}px`;
      p.style.opacity = `${1 - pt}`;
      p.style.transform = `scale(${1 - pt * 0.5})`;
      if (pt < 1) requestAnimationFrame(animParticle);
      else p.remove();
    }
    requestAnimationFrame(animParticle);
  }
}
