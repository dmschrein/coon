"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  SetupGuideModal,
  SETUP_GUIDE_PLATFORMS,
} from "@/components/community/setup-guide-modal";
import { useSetupGuides } from "@/hooks/use-setup-guide";
import type { SetupGuidePlatform } from "@/types";

export default function SetupPage() {
  const { data: setupGuides } = useSetupGuides();
  const [setupOpen, setSetupOpen] = useState(false);
  const [setupPlatform, setSetupPlatform] =
    useState<SetupGuidePlatform>("discord");

  const openSetupGuide = (platform: SetupGuidePlatform) => {
    setSetupPlatform(platform);
    setSetupOpen(true);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Platform Setup</h1>
        <p className="text-muted-foreground text-sm">
          Step-by-step checklists to launch your community on each platform.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {SETUP_GUIDE_PLATFORMS.map((p) => (
          <div
            key={p.value}
            className="flex items-center justify-between rounded-lg border p-3"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{p.label}</span>
              {setupGuides?.[p.value]?.completed ? (
                <Badge className="border-transparent bg-green-600 text-white">
                  Completed
                </Badge>
              ) : null}
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => openSetupGuide(p.value)}
            >
              Open Setup Guide
            </Button>
          </div>
        ))}
      </div>

      <SetupGuideModal
        open={setupOpen}
        onOpenChange={setSetupOpen}
        initialPlatform={setupPlatform}
      />
    </div>
  );
}
