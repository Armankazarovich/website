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
            <Phone className="w-3.5 h-3.5" />
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
          className="inline-flex w-full items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Phone className="w-4 h-4" />
          {first.display}
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
