"use client";

import { Button } from "@/components/ui/button";
import { LayoutGrid, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

interface ViewToggleProps {
  activeView: "board" | "calendar";
  onViewChange: (view: "board" | "calendar") => void;
}

export function ViewToggle({ activeView, onViewChange }: ViewToggleProps) {
  return (
    <div className="flex gap-1 rounded-lg border p-1">
      <Button
        size="sm"
        variant={activeView === "board" ? "default" : "ghost"}
        className={cn(
          "gap-1.5",
          activeView !== "board" && "text-muted-foreground"
        )}
        onClick={() => onViewChange("board")}
      >
        <LayoutGrid className="h-3.5 w-3.5" />
        Board
      </Button>
      <Button
        size="sm"
        variant={activeView === "calendar" ? "default" : "ghost"}
        className={cn(
          "gap-1.5",
          activeView !== "calendar" && "text-muted-foreground"
        )}
        onClick={() => onViewChange("calendar")}
      >
        <CalendarDays className="h-3.5 w-3.5" />
        Calendar
      </Button>
    </div>
  );
}
