"use client";

import { useRouter } from "next/navigation";
import { useClerk, useUser } from "@clerk/nextjs";
import { Menu } from "@base-ui/react/menu";
import { BookOpen, KeyRound, LogOut, Settings, ShieldCheck, UserRound } from "lucide-react";

import { RoleUsername } from "@/components/role-username";

export function AccountMenu() {
  const router = useRouter();
  const { openUserProfile, signOut } = useClerk();
  const { isLoaded, user } = useUser();
  const displayName = user?.username || user?.fullName || "Your account";
  const email = user?.primaryEmailAddress?.emailAddress;
  const role = String(user?.publicMetadata.role || "contributor");

  return (
    <Menu.Root>
      <Menu.Trigger
        className="grid size-10 place-items-center overflow-hidden rounded-full border bg-muted outline-none transition-shadow hover:ring-2 hover:ring-primary/20 focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Open profile menu"
        disabled={!isLoaded}
      >
        {user?.imageUrl ? (
          <span className="size-full bg-cover bg-center" style={{ backgroundImage: `url(${user.imageUrl})` }} />
        ) : (
          <UserRound className="size-4 text-muted-foreground" />
        )}
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Positioner side="bottom" align="end" sideOffset={8} className="z-[100] outline-none">
          <Menu.Popup className="w-64 origin-[var(--transform-origin)] rounded-lg border bg-popover p-1.5 text-popover-foreground shadow-xl outline-none transition-[transform,scale,opacity] data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0">
            <div className="px-2.5 py-2">
              <p className="truncate text-sm">
                <RoleUsername name={displayName} role={role} />
              </p>
              {email && <p className="mt-0.5 truncate text-xs text-muted-foreground">{email}</p>}
            </div>
            <Menu.Separator className="my-1 h-px bg-border" />
            {user?.username && (
              <Menu.Item onClick={() => router.push(`/profile/${encodeURIComponent(user.username!)}`)} className="flex cursor-default items-center gap-2.5 rounded-md px-2.5 py-2 text-sm outline-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground">
                <UserRound className="size-4 text-muted-foreground" />
                Public profile
              </Menu.Item>
            )}
            <Menu.Item onClick={() => router.push("/contribute")} className="flex cursor-default items-center gap-2.5 rounded-md px-2.5 py-2 text-sm outline-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground">
              <BookOpen className="size-4 text-muted-foreground" />
              Your contributions
            </Menu.Item>
            {(user?.publicMetadata.role === "moderator" || user?.publicMetadata.role === "admin") && <Menu.Item onClick={() => router.push("/admin")} className="flex cursor-default items-center gap-2.5 rounded-md px-2.5 py-2 text-sm outline-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground"><ShieldCheck className="size-4 text-muted-foreground" />Administration</Menu.Item>}
            <Menu.Item onClick={() => router.push("/settings/api-keys")} className="flex cursor-default items-center gap-2.5 rounded-md px-2.5 py-2 text-sm outline-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground">
              <KeyRound className="size-4 text-muted-foreground" />
              API Keys
            </Menu.Item>
            <Menu.Item onClick={() => openUserProfile()} className="flex cursor-default items-center gap-2.5 rounded-md px-2.5 py-2 text-sm outline-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground">
              <Settings className="size-4 text-muted-foreground" />
              Manage account
            </Menu.Item>
            <Menu.Separator className="my-1 h-px bg-border" />
            <Menu.Item onClick={() => void signOut({ redirectUrl: "/" })} className="flex cursor-default items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-destructive outline-none data-[highlighted]:bg-destructive/10">
              <LogOut className="size-4" />
              Sign out
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
