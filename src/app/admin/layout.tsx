import { notFound } from "next/navigation";

import { AdminNav, type AdminNavGroup } from "@/components/admin/admin-nav";
import { AdminToaster } from "@/components/admin/admin-toaster";
import { getStaffUser } from "@/lib/wiki-auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const staff = await getStaffUser();
  if (!staff) notFound();
  const { countAdminQueueByStatus } = process.env.DATABASE_URL
    ? await import("@/lib/wiki-public-db")
    : await import("@/lib/admin-db");
  const pending = (await countAdminQueueByStatus()).pending_review ?? 0;
  const isAdmin = staff.role === "admin";
  const groups: AdminNavGroup[] = [
    {
      label: "Review",
      items: [
        { href: "/admin", label: "Dashboard", icon: "dashboard" },
        { href: "/admin/moderation", label: "Moderation", icon: "moderation", count: pending },
        { href: "/admin/sources", label: "Sources", icon: "sources" },
      ],
    },
    ...(isAdmin
      ? ([
          {
            label: "Content",
            items: [
              { href: "/admin/articles", label: "Articles", icon: "articles" },
              { href: "/admin/import", label: "Data import", icon: "import" },
            ],
          },
          {
            label: "Community",
            items: [
              { href: "/admin/users", label: "Users", icon: "users" },
              { href: "/admin/notifications", label: "Notifications", icon: "notifications" },
            ],
          },
          { label: "System", items: [{ href: "/admin/audit", label: "Audit log", icon: "audit" }] },
        ] satisfies AdminNavGroup[])
      : []),
  ];
  return (
    <div className="flex min-h-[calc(100vh-60px)] min-w-0 flex-col items-stretch lg:flex-row">
      <AdminNav groups={groups} roleLabel={isAdmin ? "Admin" : "Moderator"} />
      <div className="min-w-0 flex-1 px-5 pb-20 pt-7 sm:px-8">
        <div className="mx-auto w-full max-w-[1240px]">{children}</div>
      </div>
      <AdminToaster />
    </div>
  );
}
