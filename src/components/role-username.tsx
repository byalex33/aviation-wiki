import { BadgeCheck, Shield, ShieldCheck } from "lucide-react";

import { cn } from "@/lib/utils";

type DisplayRole =
  | "contributor"
  | "trusted_contributor"
  | "moderator"
  | "admin";

const roleStyles = {
  trusted_contributor: {
    Icon: BadgeCheck,
    label: "Trusted contributor",
    className: "text-emerald-600 dark:text-emerald-400",
  },
  moderator: {
    Icon: ShieldCheck,
    label: "Moderator",
    className: "text-blue-600 dark:text-blue-400",
  },
  admin: {
    Icon: Shield,
    label: "Administrator",
    className: "text-red-600 dark:text-red-400",
  },
} as const;

export function RoleUsername({
  name,
  role,
  className,
}: {
  name: string;
  role: DisplayRole | string | null | undefined;
  className?: string;
}) {
  const treatment = roleStyles[role as keyof typeof roleStyles];
  if (!treatment) return <span className={className}>{name}</span>;
  const Icon = treatment.Icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-semibold",
        treatment.className,
        className,
      )}
    >
      <Icon className="size-[1em] shrink-0" aria-hidden="true" />
      <span>{name}</span>
      <span className="sr-only"> ({treatment.label})</span>
    </span>
  );
}
