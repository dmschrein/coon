"use client";

import { type ReactNode, useState } from "react";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { CommunityRule } from "@/types";

interface RulesEditorRowProps {
  rule: CommunityRule;
  number: number;
  dragHandle?: ReactNode;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onChange: (patch: Partial<CommunityRule>) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
}

export function RulesEditorRow({
  rule,
  number,
  dragHandle,
  canMoveUp,
  canMoveDown,
  onChange,
  onMoveUp,
  onMoveDown,
  onDelete,
}: RulesEditorRowProps) {
  const [showExample, setShowExample] = useState(false);

  return (
    <div data-rule-row className="rounded-lg border p-3">
      <div className="flex items-start gap-2">
        <div className="flex flex-col items-center gap-1 pt-1">
          {dragHandle}
          <span
            data-rule-number
            className="bg-muted text-muted-foreground flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold"
          >
            {number}
          </span>
        </div>

        <div className="flex-1 space-y-2">
          <Input
            aria-label={`Rule ${number} title`}
            placeholder="Rule title"
            value={rule.title}
            onChange={(e) => onChange({ title: e.target.value })}
          />
          <Textarea
            aria-label={`Rule ${number} description`}
            placeholder="What is this rule about?"
            value={rule.description}
            rows={2}
            onChange={(e) => onChange({ description: e.target.value })}
          />

          <button
            type="button"
            className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs"
            onClick={() => setShowExample((s) => !s)}
            aria-expanded={showExample}
          >
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 transition-transform",
                showExample && "rotate-180"
              )}
            />
            Example violation
          </button>
          {showExample ? (
            <Textarea
              aria-label={`Rule ${number} example violation`}
              placeholder="A concrete example of breaking this rule"
              value={rule.exampleViolation}
              rows={2}
              onChange={(e) => onChange({ exampleViolation: e.target.value })}
            />
          ) : null}
        </div>

        <div className="flex flex-col gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Move rule up"
            disabled={!canMoveUp}
            onClick={onMoveUp}
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Move rule down"
            disabled={!canMoveDown}
            onClick={onMoveDown}
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Delete rule"
            onClick={onDelete}
          >
            <Trash2 className="text-destructive h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
