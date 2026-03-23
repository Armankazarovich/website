"use client";

export function flyToCart(fromElement: HTMLElement, imageUrl?: string | null) {
  const cartIcon = document.querySelector("[data-cart-icon]") as HTMLElement;
  if (!cartIcon) return;

  const fromRect = fromElement.getBoundingClientRect();
  const toRect = cartIcon.getBoundingClientRect();

  const size = 44;
  const startX = fromRect.left + fromRect.width / 2 - size / 2;
  const startY = fromRect.top + fromRect.height / 2 - size / 2;
  const endX = toRect.left + toRect.width / 2 - size / 2;
  const endY = toRect.top + toRect.height / 2 - size / 2;

  const el = document.createElement("div");
  el.style.cssText = `
    position: fixed;
    z-index: 9999;
    pointer-events: none;
    width: ${size}px;
    height: ${size}px;
    border-radius: 50%;
    overflow: hidden;
    left: ${startX}px;
    top: ${startY}px;
    box-shadow: 0 4px 16px rgba(232, 112, 10, 0.5);
    border: 2px solid #E8700A;
    background: #1a1a1a center/cover;
    ${imageUrl ? `background-image: url(${imageUrl});` : "background: #E8700A;"}
  `;

  if (!imageUrl) {
    el.innerHTML = `<svg viewBox="0 0 24 24" fill="white" width="${size}" height="${size}" style="padding:10px"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0" stroke="white" stroke-width="2" fill="none" stroke-linecap="round"/></svg>`;
  }

  document.body.appendChild(el);

  const duration = 650;
  const start = performance.now();

  function animate(time: number) {
    const elapsed = time - start;
    const t = Math.min(elapsed / duration, 1);

    // ease-in-out cubic
    const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    // parabolic arc upward
    const arcHeight = Math.min(120, Math.abs(startY - endY) * 0.8 + 60);
    const x = startX + (endX - startX) * eased;
    const y = startY + (endY - startY) * eased - arcHeight * Math.sin(Math.PI * t);

    const scale = 1 - 0.65 * eased;
    const opacity = t > 0.85 ? 1 - (t - 0.85) / 0.15 : 1;

    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.transform = `scale(${scale}) rotate(${eased * 180}deg)`;
    el.style.opacity = `${opacity}`;

    if (t < 1) {
      requestAnimationFrame(animate);
    } else {
      el.remove();
      // Bounce the cart icon
      cartIcon.animate(
        [
          { transform: "scale(1)" },
          { transform: "scale(1.45)" },
          { transform: "scale(0.88)" },
          { transform: "scale(1.15)" },
          { transform: "scale(1)" },
        ],
        { duration: 380, easing: "ease-out" }
      );
    }
  }

  requestAnimationFrame(animate);
}
