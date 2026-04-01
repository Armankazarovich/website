"use client";

import { useState, useEffect, useRef } from "react";
import { X, Phone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const TelegramIcon = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
  </svg>
);

// ─── Types ────────────────────────────────────────────────────────────────────
interface Channel {
  id: string;
  label: string;
  icon: React.ReactNode;
  href: string;
  bg: string;
  shadow: string;
}

interface ContactWidgetProps {
  phone?: string;
  phoneLink?: string;
  email?: string;
  whatsapp?: string;
  telegram?: string;
  vk?: string;
  widgetEnabled?: boolean;
  widgetPosition?: "left" | "right";
  widgetLabel?: string;
}

// ─── Working hours check ──────────────────────────────────────────────────────
function useIsOnline() {
  const [online, setOnline] = useState(false);
  useEffect(() => {
    const check = () => {
      const now = new Date();
      // Moscow time offset
      const msk = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Moscow" }));
      const h = msk.getHours();
      const d = msk.getDay(); // 0=Sun, 6=Sat
      const isWeekday = d >= 1 && d <= 5;
      const isSat = d === 6;
      if (isWeekday && h >= 9 && h < 20) { setOnline(true); return; }
      if (isSat && h >= 9 && h < 18) { setOnline(true); return; }
      setOnline(false);
    };
    check();
    const t = setInterval(check, 60000);
    return () => clearInterval(t);
  }, []);
  return online;
}

// ─── Single channel bubble ────────────────────────────────────────────────────
function ChannelBubble({
  channel, index, total, open,
}: {
  channel: Channel;
  index: number;
  total: number;
  open: boolean;
}) {
  const [tooltip, setTooltip] = useState(false);

  return (
    <motion.div
      initial={false}
      animate={open
        ? { opacity: 1, y: 0, scale: 1 }
        : { opacity: 0, y: 20, scale: 0.6 }
      }
      transition={{
        delay: open ? index * 0.06 : (total - 1 - index) * 0.04,
        type: "spring", stiffness: 400, damping: 28,
      }}
      className="relative flex items-center group"
    >
      {/* Tooltip */}
      <AnimatePresence>
        {tooltip && (
          <motion.div
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            className="absolute right-full mr-3 whitespace-nowrap bg-gray-900 text-white text-xs font-medium px-3 py-1.5 rounded-xl pointer-events-none shadow-lg"
          >
            {channel.label}
            <div className="absolute right-[-4px] top-1/2 -translate-y-1/2 w-2 h-2 bg-gray-900 rotate-45" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Button */}
      <a
        href={channel.href}
        target={channel.href.startsWith("tel:") ? undefined : "_blank"}
        rel="noopener noreferrer"
        onMouseEnter={() => setTooltip(true)}
        onMouseLeave={() => setTooltip(false)}
        className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform duration-150 hover:scale-110 active:scale-95 ${channel.bg}`}
        style={{ boxShadow: channel.shadow }}
      >
        {channel.icon}
      </a>
    </motion.div>
  );
}

// ─── Main widget ──────────────────────────────────────────────────────────────
export function ContactWidget({
  phone = "8-985-970-71-33",
  phoneLink = "+79859707133",
  email,
  whatsapp,
  telegram,
  vk,
  widgetEnabled = true,
  widgetPosition = "right",
  widgetLabel = "Связаться",
}: ContactWidgetProps) {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [pulse, setPulse] = useState(false);
  const isOnline = useIsOnline();
  const ref = useRef<HTMLDivElement>(null);

  // Появляется через 1.5 сек
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 1500);
    return () => clearTimeout(t);
  }, []);

  // Пульс каждые 8 секунд для привлечения внимания
  useEffect(() => {
    if (!visible) return;
    const pulse = () => {
      setPulse(true);
      setTimeout(() => setPulse(false), 1000);
    };
    pulse(); // сразу
    const t = setInterval(pulse, 8000);
    return () => clearInterval(t);
  }, [visible]);

  // Закрыть при клике вне
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  if (!widgetEnabled) return null;

  // Channels
  const channels: Channel[] = [];

  if (whatsapp) {
    const n = whatsapp.replace(/\D/g, "");
    channels.push({
      id: "whatsapp", label: "WhatsApp",
      icon: <WhatsAppIcon />,
      href: `https://wa.me/${n}?text=Здравствуйте! Хочу узнать о пиломатериалах`,
      bg: "bg-[#25D366] hover:bg-[#20bd5a]",
      shadow: "0 4px 16px rgba(37,211,102,0.45)",
    });
  }

  if (telegram) {
    const tg = telegram.startsWith("@") ? telegram.slice(1) : telegram;
    const link = tg.startsWith("http") ? tg : `https://t.me/${tg}`;
    channels.push({
      id: "telegram", label: "Telegram",
      icon: <TelegramIcon />,
      href: link,
      bg: "bg-[#2AABEE] hover:bg-[#229ed9]",
      shadow: "0 4px 16px rgba(42,171,238,0.45)",
    });
  }

  if (phoneLink || phone) {
    channels.push({
      id: "phone", label: isOnline ? "Позвонить — сейчас работаем" : "Позвонить",
      icon: <Phone className="w-6 h-6" />,
      href: `tel:${phoneLink || phone}`,
      bg: "bg-emerald-500 hover:bg-emerald-600",
      shadow: "0 4px 16px rgba(16,185,129,0.45)",
    });
  }

  const side = widgetPosition === "left" ? "left-3 lg:left-5" : "right-3 lg:right-5";

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: widgetPosition === "left" ? -30 : 30 }}
      animate={visible ? { opacity: 1, x: 0 } : {}}
      transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.2 }}
      className={`fixed z-50 flex flex-col items-end gap-3 ${side}`}
      style={{ bottom: "calc(5rem + env(safe-area-inset-bottom, 0px))" }}
    >
      {/* Channel bubbles */}
      <div className="flex flex-col items-end gap-2.5">
        {channels.map((ch, i) => (
          <ChannelBubble
            key={ch.id}
            channel={ch}
            index={i}
            total={channels.length}
            open={open}
          />
        ))}
      </div>

      {/* Main FAB */}
      <motion.button
        onClick={() => setOpen(!open)}
        whileTap={{ scale: 0.88 }}
        aria-label={open ? "Закрыть" : "Связаться с нами"}
        className="relative w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-xl focus:outline-none overflow-visible"
        style={{
          background: open
            ? "hsl(var(--muted))"
            : "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary)) 60%, hsl(var(--primary) / 0.8))",
          boxShadow: open
            ? "0 4px 20px rgba(0,0,0,0.15)"
            : "0 4px 24px hsl(var(--primary) / 0.5), 0 0 0 0 hsl(var(--primary) / 0.4)",
          color: open ? "hsl(var(--foreground))" : "white",
        }}
      >
        {/* Pulse ring */}
        {!open && pulse && (
          <motion.span
            className="absolute inset-0 rounded-2xl"
            initial={{ opacity: 0.6, scale: 1 }}
            animate={{ opacity: 0, scale: 1.6 }}
            transition={{ duration: 0.9, ease: "easeOut" }}
            style={{ background: "hsl(var(--primary))", zIndex: -1 }}
          />
        )}

        {/* Online indicator */}
        {!open && (
          <span
            className={`absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white transition-colors duration-500 ${
              isOnline ? "bg-emerald-400" : "bg-gray-400"
            }`}
          />
        )}

        {/* Icon */}
        <AnimatePresence mode="wait">
          {open ? (
            <motion.span
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              <X className="w-6 h-6" />
            </motion.span>
          ) : (
            <motion.span
              key="chat"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              {/* Custom chat icon */}
              <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Status label — только когда закрыт */}
      <AnimatePresence>
        {!open && visible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ delay: 0.6, type: "spring", stiffness: 400, damping: 30 }}
            className="pointer-events-none"
          >
            <div className="bg-card border border-border rounded-xl px-2.5 py-1 shadow-md text-center">
              <p className="text-[10px] font-bold text-foreground leading-none">{widgetLabel}</p>
              <p className={`text-[9px] font-medium mt-0.5 leading-none ${isOnline ? "text-emerald-500" : "text-muted-foreground"}`}>
                {isOnline ? "● Онлайн" : "○ Офлайн"}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
