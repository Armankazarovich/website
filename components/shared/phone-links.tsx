import { Phone } from "lucide-react";

export interface PhoneItem {
  display: string;
  tel: string;
}

interface PhoneLinksProps {
  phones: PhoneItem[];
  variant?: "footer" | "mobile-menu" | "inline" | "sidebar";
}

export function PhoneLinks({ phones, variant = "footer" }: PhoneLinksProps) {
  if (!phones.length) return null;

  if (variant === "footer") {
    return (
      <>
        {phones.map((p, i) => (
          <li key={p.tel} className="flex items-center gap-3">
            {i === 0 ? (
              <Phone className="w-4 h-4 text-brand-orange shrink-0" />
            ) : (
              <span className="w-4 h-4 shrink-0" />
            )}
            <a href={`tel:${p.tel}`} className="hover:text-brand-orange transition-colors">
              {p.display}
            </a>
          </li>
        ))}
      </>
    );
  }

  if (variant === "mobile-menu") {
    const [first, ...rest] = phones;
    return (
      <>
        <a
          href={`tel:${first.tel}`}
          className="flex items-center gap-2 font-display font-bold text-base text-brand-orange hover:text-brand-orange/80 transition-colors"
        >
          <div className="w-7 h-7 rounded-lg bg-brand-orange/15 flex items-center justify-center shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path
                d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 11a19.79 19.79 0 01-3.07-8.67A2 2 0 012 .27h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1-1.06a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          {first.display}
        </a>
        {rest.map((p) => (
          <a
            key={p.tel}
            href={`tel:${p.tel}`}
            className="flex items-center gap-2 font-medium text-sm text-muted-foreground hover:text-foreground transition-colors mt-1.5 ml-9"
          >
            {p.display}
          </a>
        ))}
      </>
    );
  }

  if (variant === "inline") {
    return (
      <span className="inline-flex flex-wrap gap-x-3 gap-y-1">
        {phones.map((p) => (
          <a key={p.tel} href={`tel:${p.tel}`} className="text-primary font-medium hover:underline whitespace-nowrap">
            {p.display}
          </a>
        ))}
      </span>
    );
  }

  if (variant === "sidebar") {
    const [first, ...rest] = phones;
    return (
      <>
        <a
          href={`tel:${first.tel}`}
          className="block bg-primary text-primary-foreground rounded-lg py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          📞 {first.display}
        </a>
        {rest.map((p) => (
          <a
            key={p.tel}
            href={`tel:${p.tel}`}
            className="block mt-1.5 text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {p.display}
          </a>
        ))}
      </>
    );
  }

  return null;
}
