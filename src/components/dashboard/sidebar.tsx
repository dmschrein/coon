"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Megaphone,
  Inbox,
  Settings,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useUnreadCount } from "@/hooks/use-inbox";

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Audience",
    href: "/dashboard/audience",
    icon: Users,
  },
  {
    name: "Campaigns",
    href: "/dashboard/campaign",
    icon: Megaphone,
  },
  {
    name: "Engagement",
    href: "/dashboard/engagement",
    icon: Sparkles,
  },
  {
    name: "Members",
    href: "/dashboard/members",
    icon: UserCheck,
  },
  {
    name: "Inbox",
    href: "/dashboard/inbox",
    icon: Inbox,
  },
  {
    name: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: unreadCount } = useUnreadCount();

  return (
    <div className="bg-muted/40 flex h-full w-64 flex-col border-r">
      <div className="flex h-16 items-center border-b px-6">
        <h1 className="text-xl font-bold">Community Builder</h1>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive =
            pathname === item.href || pathname?.startsWith(item.href + "/");
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
              {item.name === "Inbox" && unreadCount ? (
                <Badge
                  variant="destructive"
                  className="ml-auto h-5 min-w-5 px-1 text-xs"
                >
                  {unreadCount > 99 ? "99+" : unreadCount}
                </Badge>
              ) : null}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
