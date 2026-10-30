import {
  AtSign,
  Briefcase,
  Camera,
  CalendarDays,
  Globe,
  Link as LinkIcon,
  type LucideProps,
} from "lucide-react";
import type { LinkKind } from "@/lib/card-schema";

/** Icônes Lucide (section 10). Lucide ne fournit pas de logos de marques : icônes génériques + libellé. */
const ICONS: Record<LinkKind, (p: LucideProps) => React.ReactNode> = {
  linkedin: (p) => <Briefcase {...p} />,
  x: (p) => <AtSign {...p} />,
  instagram: (p) => <Camera {...p} />,
  calendar: (p) => <CalendarDays {...p} />,
  website: (p) => <Globe {...p} />,
  custom: (p) => <LinkIcon {...p} />,
};

export function LinkIconFor({ kind, ...props }: { kind: LinkKind } & LucideProps) {
  const Icon = ICONS[kind] ?? ICONS.custom;
  return <Icon aria-hidden="true" size={20} strokeWidth={1.6} {...props} />;
}
