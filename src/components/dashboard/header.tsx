"use client";

import { UserButton } from "@clerk/nextjs";
import { NotificationBell } from "./notification-bell";

export function Header() {
  return (
    <header className="flex h-16 items-center justify-between border-b px-6">
      <div>{/* Page title will be inserted here by individual pages */}</div>
      <div className="flex items-center gap-4">
        <NotificationBell />
        <UserButton afterSignOutUrl="/" />
      </div>
    </header>
  );
}
