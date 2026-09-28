import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { getStaffUser } from "@/lib/wiki-auth";
import { formatDisplayLabel } from "@/lib/display";

const links = [
  ["/admin", "Dashboard"],
  ["/admin/moderation", "Moderation"],
  ["/admin/articles", "Articles", "admin"],
  ["/admin/users", "Users", "admin"],
  ["/admin/sources", "Sources"],
  ["/admin/import", "Data import", "admin"],
  ["/admin/audit", "Audit log", "admin"],
  ["/admin/notifications", "Notifications", "admin"],
] as const;

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const staff = await getStaffUser();
  if (!staff) notFound();
  return (
    <div className="mx-auto w-full min-w-0 max-w-[1500px] px-5 pb-20 pt-6 sm:px-6">
      <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
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
        className="mb-8 flex max-w-full gap-1 overflow-x-auto border-y bg-muted/30 p-1.5"
        aria-label="Admin navigation"
      >
        {links
          .filter(
            ([, , requiredRole]) =>
              !requiredRole || staff.role === requiredRole,
          )
          .map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className="flex min-h-10 shrink-0 items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {label}
            </Link>
          ))}
      </nav>
      {children}
    </div>
  );
}
