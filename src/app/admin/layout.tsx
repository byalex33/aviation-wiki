import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BookCheck,
  FileClock,
  Gauge,
  Library,
  ScrollText,
  DatabaseZap,
  BellRing,
  ShieldCheck,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { getStaffUser } from "@/lib/wiki-auth";
import { formatDisplayLabel } from "@/lib/display";

const links = [
  ["/admin", "Dashboard", Gauge],
  ["/admin/moderation", "Moderation", FileClock],
  ["/admin/articles", "Articles", Library, "admin"],
  ["/admin/contributors", "Contributors", Users, "admin"],
  ["/admin/sources", "Sources", BookCheck],
  ["/admin/import", "Data import", DatabaseZap, "admin"],
  ["/admin/audit", "Audit log", ScrollText, "admin"],
  ["/admin/notifications", "Notifications", BellRing, "admin"],
] as const;

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const staff = await getStaffUser();
  if (!staff) notFound();
  return (
    <div className="mx-auto max-w-[1500px] px-5 pb-20 pt-6 sm:px-6">
      <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-lg bg-primary text-primary-foreground">
            <ShieldCheck className="size-5" />
          </span>
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              aviation.wiki
            </p>
            <h1 className="text-xl font-bold">Administration</h1>
          </div>
        </div>
        <Badge variant="outline">{formatDisplayLabel(staff.role)}</Badge>
      </div>
      <nav
        className="mb-8 flex gap-1 overflow-x-auto rounded-xl border bg-card p-1.5"
        aria-label="Admin navigation"
      >
        {links
          .filter(
            ([, , , requiredRole]) =>
              !requiredRole || staff.role === requiredRole,
          )
          .map(([href, label, Icon]) => (
            <Link
              key={href}
              href={href}
              className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Icon className="size-4" />
              {label}
            </Link>
          ))}
      </nav>
      {children}
    </div>
  );
}
