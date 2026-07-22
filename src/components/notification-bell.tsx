"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Menu } from "@base-ui/react/menu";
import { Bell } from "lucide-react";

import type { NotificationRecord } from "@/lib/notification-types";

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState<NotificationRecord[]>([]);

  const refresh = useCallback(async () => {
    const response = await fetch("/api/notifications", { cache: "no-store" });
    if (!response.ok) return;
    const data = (await response.json()) as {
      unreadCount: number;
      items: NotificationRecord[];
    };
    setUnreadCount(data.unreadCount);
    setItems(data.items);
  }, []);

  useEffect(() => {
    const events = new EventSource("/api/notifications?stream=1");
    events.addEventListener("notifications", (event) => {
      const data = JSON.parse((event as MessageEvent).data) as {
        unreadCount: number;
      };
      setUnreadCount(data.unreadCount);
      void refresh();
    });
    return () => events.close();
  }, [refresh]);

  return (
    <Menu.Root onOpenChange={(open) => open && void refresh()}>
      <Menu.Trigger
        className="relative grid size-9 place-items-center rounded-md outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={
          unreadCount ? `${unreadCount} unread notifications` : "Notifications"
        }
      >
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span className="absolute right-0 top-0 grid min-w-4 -translate-y-1/4 translate-x-1/4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold leading-4 text-primary-foreground">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner
          side="bottom"
          align="end"
          sideOffset={8}
          className="z-[100] outline-none"
        >
          <Menu.Popup className="w-[min(92vw,390px)] overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-xl outline-none">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <p className="font-semibold">Notifications</p>
              <Link
                href="/notifications"
                className="text-xs font-medium text-primary hover:underline"
              >
                View all
              </Link>
            </div>
            <div className="max-h-[420px] overflow-y-auto">
              {items.length ? (
                items.map((item) => (
                  <Menu.Item key={item.id} className="outline-none">
                    <Link
                      href={item.href}
                      className={`block border-b px-4 py-3 text-sm last:border-b-0 ${!item.readAt ? "bg-primary/[0.04]" : ""}`}
                    >
                      <span className="font-medium">{item.title}</span>
                      <span className="mt-1 line-clamp-2 block text-xs leading-5 text-muted-foreground">
                        {item.message}
                      </span>
                    </Link>
                  </Menu.Item>
                ))
              ) : (
                <p className="px-5 py-10 text-center text-sm text-muted-foreground">
                  You have no notifications yet.
                </p>
              )}
            </div>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
