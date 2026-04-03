import { type LucideIcon } from "lucide-react";

interface AdminSectionTitleProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  className?: string;
  action?: React.ReactNode;
}

/**
 * Секционный заголовок — стеклянная пилюля с иконкой.
 * Иконка крупнее обычных навигационных, БЕЗ hover-анимации.
 * Автоматически адаптируется к палитре через .aray-section-title CSS.
 */
export function AdminSectionTitle({
  icon: Icon,
  title,
  subtitle,
  className = "",
  action,
}: AdminSectionTitleProps) {
  return (
    <div className={`flex items-center justify-between mb-3 ${className}`}>
      <span className="aray-section-title">
        <Icon />
        {title}
      </span>
      {subtitle && (
        <span className="text-[10px] text-muted-foreground">{subtitle}</span>
      )}
      {action}
    </div>
  );
}
