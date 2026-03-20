"use client";

import { useState, useEffect } from "react";
import { X, MessageCircle, Phone, Mail, Send } from "lucide-react";

// ─── Типы каналов ────────────────────────────────────────────────────────────
export type ChannelConfig = {
  id: string;
  label: string;
  icon: React.ReactNode;
  href: string;
  color: string;       // bg colour
  textColor: string;   // text/icon colour
};

// ─── Иконки мессенджеров (SVG inline — не зависят от lucide) ─────────────────
const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const TelegramIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
  </svg>
);

const VkIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
    <path d="M15.684 0H8.316C1.592 0 0 1.592 0 8.316v7.368C0 22.408 1.592 24 8.316 24h7.368C22.408 24 24 22.408 24 15.684V8.316C24 1.592 22.391 0 15.684 0zm3.692 17.123h-1.744c-.66 0-.864-.525-2.05-1.727-1.033-1-1.49-1.135-1.744-1.135-.356 0-.458.102-.458.593v1.575c0 .424-.135.678-1.253.678-1.846 0-3.896-1.118-5.335-3.202C4.624 10.857 4.03 8.57 4.03 8.096c0-.254.102-.491.593-.491h1.744c.44 0 .61.203.78.677.863 2.49 2.303 4.675 2.896 4.675.22 0 .322-.102.322-.66V9.721c-.068-1.186-.695-1.287-.695-1.71 0-.204.17-.407.44-.407h2.743c.373 0 .508.203.508.643v3.473c0 .372.17.508.271.508.22 0 .407-.136.813-.542 1.254-1.406 2.151-3.574 2.151-3.574.119-.254.322-.491.763-.491h1.744c.525 0 .644.27.525.643-.22 1.017-2.354 4.031-2.354 4.031-.186.305-.254.44 0 .78.186.254.796.779 1.203 1.253.745.847 1.32 1.558 1.473 2.05.17.49-.085.744-.576.744z"/>
  </svg>
);

// ─── Карточка канала ──────────────────────────────────────────────────────────
function ChannelButton({ channel, onClick }: { channel: ChannelConfig; onClick?: () => void }) {
  return (
    <a
      href={channel.href}
      target={channel.href.startsWith("tel:") || channel.href.startsWith("mailto:") ? undefined : "_blank"}
      rel="noopener noreferrer"
      onClick={onClick}
      className={`flex items-center gap-3 w-full px-4 py-3 rounded-2xl transition-all duration-150 hover:scale-[1.02] active:scale-[0.98] shadow-sm ${channel.color} ${channel.textColor}`}
    >
      <span className="shrink-0">{channel.icon}</span>
      <span className="font-medium text-sm">{channel.label}</span>
    </a>
  );
}

// ─── Основной виджет ──────────────────────────────────────────────────────────
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

  // Появляется через 2 сек после загрузки
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 2000);
    return () => clearTimeout(t);
  }, []);

  // Закрывать при клике вне виджета
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const el = document.getElementById("contact-widget");
      if (el && !el.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (!widgetEnabled) return null;

  // Формируем список активных каналов
  const channels: ChannelConfig[] = [];

  if (phoneLink || phone) {
    channels.push({
      id: "phone",
      label: phone || phoneLink!,
      icon: <Phone className="w-5 h-5" />,
      href: `tel:${phoneLink || phone}`,
      color: "bg-emerald-500 hover:bg-emerald-600",
      textColor: "text-white",
    });
  }

  if (whatsapp) {
    const waNum = whatsapp.replace(/\D/g, "");
    channels.push({
      id: "whatsapp",
      label: "WhatsApp",
      icon: <WhatsAppIcon />,
      href: `https://wa.me/${waNum}`,
      color: "bg-[#25D366] hover:bg-[#20bd5a]",
      textColor: "text-white",
    });
  }

  if (telegram) {
    const tg = telegram.startsWith("@") ? telegram.slice(1) : telegram;
    const tgLink = tg.startsWith("http") ? tg : `https://t.me/${tg}`;
    channels.push({
      id: "telegram",
      label: "Telegram",
      icon: <TelegramIcon />,
      href: tgLink,
      color: "bg-[#2AABEE] hover:bg-[#229ed9]",
      textColor: "text-white",
    });
  }

  if (vk) {
    channels.push({
      id: "vk",
      label: "ВКонтакте",
      icon: <VkIcon />,
      href: vk.startsWith("http") ? vk : `https://vk.com/${vk}`,
      color: "bg-[#0077FF] hover:bg-[#0066dd]",
      textColor: "text-white",
    });
  }

  if (email) {
    channels.push({
      id: "email",
      label: email,
      icon: <Mail className="w-5 h-5" />,
      href: `mailto:${email}`,
      color: "bg-muted hover:bg-muted/80 border border-border",
      textColor: "text-foreground",
    });
  }

  const positionClass = widgetPosition === "left"
    ? "left-4 lg:left-6"
    : "right-4 lg:right-6";

  return (
    <div
      id="contact-widget"
      className={`fixed bottom-20 lg:bottom-8 z-50 flex flex-col items-end gap-3 transition-all duration-500 pointer-events-none ${positionClass} ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      } ${widgetPosition === "left" ? "items-start" : "items-end"}`}
    >
      {/* Popup with channels */}
      <div className={`transition-all duration-300 origin-bottom-right pointer-events-auto ${
        widgetPosition === "left" ? "origin-bottom-left" : "origin-bottom-right"
      } ${
        open
          ? "opacity-100 scale-100 translate-y-0"
          : "opacity-0 scale-95 translate-y-2 pointer-events-none"
      }`}>
        <div className="bg-card border border-border rounded-3xl shadow-2xl p-3 w-64 space-y-2">
          {/* Header */}
          <div className="px-2 py-1.5 mb-1">
            <p className="font-display font-bold text-base">Свяжитесь с нами</p>
            <p className="text-xs text-muted-foreground mt-0.5">Выберите удобный способ</p>
          </div>

          {/* Channels */}
          {channels.map((ch) => (
            <ChannelButton
              key={ch.id}
              channel={ch}
              onClick={() => setOpen(false)}
            />
          ))}

          {channels.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Каналы связи не настроены
            </p>
          )}
        </div>

        {/* Notch pointer */}
        <div className={`w-4 h-4 bg-card border-r border-b border-border rotate-45 mx-auto mt-[-9px] ${
          widgetPosition === "left" ? "ml-6 mr-auto" : "mr-6 ml-auto"
        }`} />
      </div>

      {/* Main FAB button */}
      <button
        onClick={() => setOpen(!open)}
        className={`pointer-events-auto group flex items-center gap-2.5 shadow-xl transition-all duration-300 hover:shadow-2xl active:scale-95 ${
          open
            ? "bg-muted border border-border text-foreground px-4 py-3 rounded-2xl"
            : "bg-brand-orange text-white px-5 py-3.5 rounded-2xl hover:bg-brand-orange/90"
        }`}
        aria-label="Связаться с нами"
      >
        {open ? (
          <>
            <X className="w-5 h-5 shrink-0" />
            <span className="text-sm font-medium">Закрыть</span>
          </>
        ) : (
          <>
            <MessageCircle className="w-5 h-5 shrink-0" />
            <span className="text-sm font-semibold">{widgetLabel}</span>
          </>
        )}
      </button>
    </div>
  );
}
