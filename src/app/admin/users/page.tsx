import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";

import { updateUserAction } from "@/app/admin/actions";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { listAdminUsers } from "@/lib/admin-users";
import { getStaffUser, wikiRoles } from "@/lib/wiki-auth";
import { formatDisplayLabel } from "@/lib/display";

export default async function AdminUsersPage({ searchParams }: {
  searchParams: Promise<{ view?: string }>;
}) {
  const staff = await getStaffUser();
  if (staff?.role !== "admin") notFound();
  const users = await listAdminUsers();
  const contributors = users.filter((user) => user.submittedCount > 0);
  const showContributors = (await searchParams).view === "contributors";
  const visibleUsers = showContributors ? contributors : users;
  return (
    <main>
      <p className="text-sm text-muted-foreground">
        Manage accounts, access, and contribution activity.
      </p>
      <h2 className="mt-1 text-3xl font-bold">Users</h2>
      <nav aria-label="User filters" className="mt-7 flex flex-wrap gap-6 border-b pb-3 text-sm">
        <Link href="/admin/users" aria-current={!showContributors ? "page" : undefined} className={!showContributors ? "font-semibold underline underline-offset-8" : "text-muted-foreground"}>All users {users.length}</Link>
        <Link href="/admin/users?view=contributors" aria-current={showContributors ? "page" : undefined} className={showContributors ? "font-semibold underline underline-offset-8" : "text-muted-foreground"}>Contributors {contributors.length}</Link>
      </nav>
      <p className="my-4 text-sm text-muted-foreground">Contributors have submitted an article or page revision, including submissions awaiting review. Private drafts do not count.</p>
      <div className="divide-y border-y">
        {visibleUsers.length ? (
          visibleUsers.map((user) => (
            <section key={user.id} aria-label={user.name} className="py-5">
                <div className="flex flex-wrap items-start gap-4">
                  <Image
                    src={user.imageUrl}
                    alt=""
                    width={44}
                    height={44}
                    className="shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3>
                        <span className="font-semibold">{user.name}</span>
                      </h3>
                      <Badge variant="outline">
                        {user.role === "contributor" ? "User" : user.role === "trusted_contributor" ? "Trusted user" : formatDisplayLabel(user.role)}
                      </Badge>
                      {user.trusted && (
                        <Badge variant="secondary">Trusted</Badge>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {user.email}
                    </p>
                    {user.submittedCount > 0 && <p className="mt-2 text-xs font-medium">Contributor · {user.submittedCount} submitted</p>}
                    <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
                      <span>{user.approvedCount} approved</span>
                      <span>{user.rejectedCount} rejected</span>
                      <span>{user.pendingCount} pending</span>
                      <span>
                        Joined {new Date(user.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <details className="mt-4">
                  <summary className="w-fit cursor-pointer text-sm font-medium">Manage account</summary>
                  <form
                    action={updateUserAction}
                    className="mt-5 grid gap-3 border-t pt-5 lg:grid-cols-[180px_180px_1fr_auto_auto]"
                  >
                    <input type="hidden" name="userId" value={user.id} />
                    <select
                      aria-label="Account role"
                      name="role"
                      defaultValue={user.role}
                      className="h-9 border bg-background px-3 text-sm"
                    >
                      {wikiRoles.map((role) => (
                        <option key={role} value={role}>
                          {role === "contributor" ? "User" : role === "trusted_contributor" ? "Trusted user" : formatDisplayLabel(role)}
                        </option>
                      ))}
                    </select>
                    <select
                      aria-label="Account restriction"
                      name="restriction"
                      defaultValue={user.restriction}
                      className="h-9 border bg-background px-3 text-sm"
                    >
                      <option value="none">No restriction</option>
                      <option value="read_only">Read only</option>
                      <option value="suspended">Suspended</option>
                    </select>
                    <Input
                      aria-label="Internal moderator notes"
                      className="rounded-none shadow-none"
                      name="moderatorNotes"
                      defaultValue={user.moderatorNotes}
                      placeholder="Internal moderator notes"
                    />
                    <label className="flex items-center gap-2 whitespace-nowrap text-sm">
                      <input
                        type="checkbox"
                        name="trusted"
                        defaultChecked={user.trusted}
                      />
                      Trusted
                    </label>
                    <label className="flex items-center gap-2 whitespace-nowrap text-sm">
                      <input type="checkbox" name="pro" defaultChecked={user.pro} />Pro supporter
                    </label>
                    <ConfirmSubmitButton
                      className="rounded-none shadow-none"
                      size="sm"
                      confirmation="Apply this user role and account restriction change?"
                    >
                      Update user
                    </ConfirmSubmitButton>
                  </form>
                </details>
            </section>
          ))
        ) : (
          <div className="p-12 text-center">
              <p className="mt-3 text-sm text-muted-foreground">
                {showContributors ? "No users have submitted content yet." : "No users found."}
              </p>
          </div>
        )}
      </div>
    </main>
  );
}
