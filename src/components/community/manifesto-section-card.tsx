"use client";

import { Loader2, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ManifestoSectionCardProps {
  title: string;
  value: string;
  onChange: (value: string) => void;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
  rows?: number;
}

export function ManifestoSectionCard({
  title,
  value,
  onChange,
  onRegenerate,
  isRegenerating = false,
  rows = 3,
}: ManifestoSectionCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-base">{title}</CardTitle>
        {onRegenerate ? (
          <Button
            variant="outline"
            size="sm"
            onClick={onRegenerate}
            disabled={isRegenerating}
          >
            {isRegenerating ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Regenerating...
              </>
            ) : (
              <>
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                Regenerate
              </>
            )}
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>
        <Textarea
          aria-label={title}
          value={value}
          rows={rows}
          onChange={(e) => onChange(e.target.value)}
        />
      </CardContent>
    </Card>
  );
}
