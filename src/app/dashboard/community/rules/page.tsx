"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Gavel, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RulesEditor } from "@/components/community/rules-editor";
import { useManifesto } from "@/hooks/use-manifesto";
import { useRules, useGenerateRules, useSaveRules } from "@/hooks/use-rules";
import { rulesToneValues } from "@/lib/validations/community";
import type { RulesTone } from "@/types";

export default function RulesPage() {
  const { data: manifesto } = useManifesto();
  const { data: rules } = useRules();
  const generateRules = useGenerateRules();
  const saveRules = useSaveRules();
  const [rulesTone, setRulesTone] = useState<RulesTone>("professional");

  const handleGenerateRules = () => {
    generateRules.mutate(
      { tone: rulesTone },
      {
        onSuccess: () => toast.success("Rules generated"),
        onError: (err) => toast.error(err.message),
      }
    );
  };

  const handleSaveRules = (next: Parameters<typeof saveRules.mutate>[0]) => {
    saveRules.mutate(next, {
      onSuccess: () => toast.success("Rules saved"),
      onError: (err) => toast.error(err.message),
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Community Rules</h1>
          <p className="text-muted-foreground text-sm">
            Positively-framed ground rules tailored to your niche.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            aria-label="Rules tone"
            className="border-input bg-background h-9 rounded-md border px-2 text-sm capitalize"
            value={rulesTone}
            onChange={(e) => setRulesTone(e.target.value as RulesTone)}
          >
            {rulesToneValues.map((t) => (
              <option key={t} value={t} className="capitalize">
                {t}
              </option>
            ))}
          </select>
          <Button
            onClick={handleGenerateRules}
            disabled={generateRules.isPending}
          >
            {generateRules.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Gavel className="mr-2 h-4 w-4" />
            )}
            {rules && rules.length > 0 ? "Regenerate Rules" : "Generate Rules"}
          </Button>
        </div>
      </div>

      {rules && rules.length > 0 ? (
        <RulesEditor
          communityName={manifesto?.nameSuggestions?.[0] ?? ""}
          rules={rules}
          onSave={handleSaveRules}
          isSaving={saveRules.isPending}
        />
      ) : (
        <div className="text-muted-foreground rounded-lg border border-dashed py-12 text-center text-sm">
          No rules yet. Generate a set tailored to your community.
        </div>
      )}
    </div>
  );
}
