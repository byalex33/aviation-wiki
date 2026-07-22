import type { Metadata } from "next";
import Image from "next/image";
import { ShieldCheck, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { RoleUsername } from "@/components/role-username";
import { formatDisplayLabel } from "@/lib/display";
import { listPublicStaffUsers } from "@/lib/staff-users";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Staff",
  description: "Meet the administrators and moderators who look after aviation.wiki.",
};

export default async function StaffPage() {
  const staff = await listPublicStaffUsers();

  return (
    <main className="mx-auto w-full max-w-[1000px] px-5 py-14 sm:px-6 sm:py-20">
      <header className="max-w-2xl">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.12em] text-primary">The team</p>
        <h1 className="mt-3 text-4xl font-bold tracking-[-0.04em] sm:text-5xl">Staff</h1>
        <p className="mt-4 text-base leading-7 text-muted-foreground">
          Meet the administrators and moderators who maintain the encyclopedia, review contributions, and help keep aviation.wiki accurate.
        </p>
      </header>

      {staff.length ? (
        <section className="mt-10 grid gap-4 sm:grid-cols-2" aria-label="aviation.wiki staff">
          {staff.map((member) => (
            <article key={member.id} className="flex items-center gap-4 rounded-xl border bg-card p-5 shadow-xs">
              <Image
                src={member.imageUrl}
                alt=""
                width={64}
                height={64}
                className="size-16 rounded-full border object-cover"
              />
              <div className="min-w-0">
                <h2 className="truncate text-lg tracking-tight">
                  <RoleUsername name={member.name} role={member.role} />
                </h2>
                <Badge variant="outline" className="mt-2">
                  <ShieldCheck className="size-3.5" aria-hidden="true" />
                  {formatDisplayLabel(member.role)}
                </Badge>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <section className="mt-10 rounded-xl border bg-card px-6 py-12 text-center shadow-xs">
          <Users className="mx-auto size-8 text-muted-foreground" aria-hidden="true" />
          <h2 className="mt-4 font-semibold">Staff profiles are not available</h2>
          <p className="mt-2 text-sm text-muted-foreground">No public staff roles are currently assigned in Clerk.</p>
        </section>
      )}
    </main>
  );
}
