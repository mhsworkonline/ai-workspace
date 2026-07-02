import {
  ClipboardList,
  FileText,
  Megaphone,
  Microscope,
  PenLine,
  Rocket,
  Sparkles,
  Video,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  "pen-line": PenLine,
  rocket: Rocket,
  youtube: Video,
  microscope: Microscope,
  megaphone: Megaphone,
  "clipboard-list": ClipboardList,
  "file-text": FileText,
};

interface TemplateIconProps {
  icon: string | null;
  className?: string;
}

export function TemplateIcon({ icon, className }: TemplateIconProps): JSX.Element {
  const Icon = (icon && ICONS[icon]) || Sparkles;
  return <Icon className={className} aria-hidden />;
}
