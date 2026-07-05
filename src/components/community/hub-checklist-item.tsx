"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ResolvedHubItem } from "@/lib/community/hub-progress";

interface HubChecklistItemProps {
  item: ResolvedHubItem;
  /** 1-based position, shown as the step number badge. */
  position: number;
}

export function HubChecklistItem({ item, position }: HubChecklistItemProps) {
  const { key, title, description, href, done, locked, lockMessage } = item;
  const [showLock, setShowLock] = useState(false);

  return (
    <li
      data-testid={`hub-item-${key}`}
      className={cn(
        "flex flex-col gap-2 rounded-lg border p-4",
        done && "border-green-600/40 bg-green-600/5",
        locked && "opacity-70"
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
            done ? "bg-green-600 text-white" : "bg-muted text-muted-foreground"
          )}
        >
          {done ? <Check className="h-4 w-4" /> : position}
        </span>

        <div className="min-w-0 flex-1">
          <h3 className="font-semibold">{title}</h3>
          <p className="text-muted-foreground text-sm">{description}</p>
        </div>

        {done ? (
          <Link
            href={href}
            className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline"
          >
            {title}
            <span className="sr-only"> — edit</span>
          </Link>
        ) : (
          <Link
            href={href}
            aria-disabled={locked}
            onClick={
              locked
                ? (e) => {
                    e.preventDefault();
                    setShowLock(true);
                  }
                : undefined
            }
            className={cn(
              "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium",
              locked
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            )}
          >
            {locked ? (
              <Lock data-testid="hub-item-lock" className="h-4 w-4" />
            ) : null}
            <span>
              {title}
              <span className="sr-only"> — get started</span>
            </span>
            {!locked ? <ArrowRight className="h-4 w-4" /> : null}
          </Link>
        )}
      </div>

      {locked && showLock ? (
        <p role="alert" className="text-destructive pl-11 text-sm">
          {lockMessage}
        </p>
      ) : null}
    </li>
  );
}
