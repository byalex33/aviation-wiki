import Image from "next/image";
import { Users } from "lucide-react";
import { notFound } from "next/navigation";

import { updateContributorAction } from "@/app/admin/actions";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { listAdminUsers } from "@/lib/admin-users";
import { getStaffUser, wikiRoles } from "@/lib/wiki-auth";
import { formatDisplayLabel } from "@/lib/display";

export default async function AdminContributorsPage() {
  const staff = await getStaffUser();
  if (staff?.role !== "admin") notFound();
  const users = await listAdminUsers();
  return (
    <main>
      <p className="text-sm text-muted-foreground">
        Real Clerk accounts and database contribution totals
      </p>
      <h2 className="mt-1 text-3xl font-bold">Contributor management</h2>
      <div className="mt-7 space-y-4">
        {users.length ? (
          users.map((user) => (
            <Card key={user.id}>
              <CardContent>
                <div className="flex flex-wrap items-start gap-4">
                  <Image
                    src={user.imageUrl}
                    alt=""
                    width={44}
                    height={44}
                    className="rounded-full"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{user.name}</h3>
                      <Badge variant="outline">
                        {formatDisplayLabel(user.role)}
                      </Badge>
                      {user.trusted && (
                        <Badge variant="secondary">Trusted</Badge>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {user.email}
                    </p>
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
                {staff?.role === "admin" && (
                  <form
                    action={updateContributorAction}
                    className="mt-5 grid gap-3 border-t pt-5 lg:grid-cols-[180px_180px_1fr_auto_auto]"
                  >
                    <input type="hidden" name="userId" value={user.id} />
                    <select
                      name="role"
                      defaultValue={user.role}
                      className="h-9 rounded-lg border bg-background px-3 text-sm"
                    >
                      {wikiRoles.map((role) => (
                        <option key={role} value={role}>
                          {formatDisplayLabel(role)}
                        </option>
                      ))}
                    </select>
                    <select
                      name="restriction"
                      defaultValue={user.restriction}
                      className="h-9 rounded-lg border bg-background px-3 text-sm"
                    >
                      <option value="none">No restriction</option>
                      <option value="read_only">Read only</option>
                      <option value="suspended">Suspended</option>
                    </select>
                    <Input
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
                    <ConfirmSubmitButton
                      size="sm"
                      confirmation="Apply this user role and account restriction change?"
                    >
                      Update user
                    </ConfirmSubmitButton>
                  </form>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <Users className="mx-auto size-8 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">
                No Clerk users were returned.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
