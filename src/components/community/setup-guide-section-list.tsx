"use client";

import { cn } from "@/lib/utils";
import type { SetupGuideSection } from "@/types";

interface SetupGuideSectionListProps {
  sections: SetupGuideSection[];
  activeIndex: number;
  onSelect: (index: number) => void;
}

export function SetupGuideSectionList({
  sections,
  activeIndex,
  onSelect,
}: SetupGuideSectionListProps) {
  return (
    <nav className="flex flex-col gap-1">
      {sections.map((section, index) => (
        <button
          key={section.section}
          type="button"
          onClick={() => onSelect(index)}
          className={cn(
            "rounded-md px-3 py-2 text-left text-sm transition-colors",
            index === activeIndex
              ? "bg-primary text-primary-foreground"
              : "hover:bg-accent hover:text-accent-foreground"
          )}
        >
          {section.section}
        </button>
      ))}
    </nav>
  );
}
