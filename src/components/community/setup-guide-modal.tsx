"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useSetupGuides,
  useGenerateSetupGuide,
  useUpdateSetupProgress,
} from "@/hooks/use-setup-guide";
import {
  countSetupGuideSteps,
  setupGuideStepKey,
} from "@/lib/community/setup-guide-progress";
import { SetupGuideSectionList } from "./setup-guide-section-list";
import { SetupGuideStepList } from "./setup-guide-step-list";
import type { SetupGuidePlatform } from "@/types";

export const SETUP_GUIDE_PLATFORMS: {
  value: SetupGuidePlatform;
  label: string;
}[] = [
  { value: "discord", label: "Discord" },
  { value: "reddit", label: "Reddit" },
  { value: "slack", label: "Slack" },
  { value: "circle", label: "Circle" },
  { value: "whatsapp", label: "WhatsApp" },
];

interface SetupGuideModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPlatform?: SetupGuidePlatform;
}

export function SetupGuideModal({
  open,
  onOpenChange,
  initialPlatform = "discord",
}: SetupGuideModalProps) {
  const [platform, setPlatform] = useState<SetupGuidePlatform>(initialPlatform);
  const [activeSection, setActiveSection] = useState(0);
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const { data: setupGuides, isLoading } = useSetupGuides();
  const generate = useGenerateSetupGuide();
  const updateProgress = useUpdateSetupProgress();

  const progress = setupGuides?.[platform];
  const guide = progress?.guide;

  useEffect(() => {
    if (open) setPlatform(initialPlatform);
  }, [open, initialPlatform]);

  // Generate the guide the first time a platform is opened without one.
  useEffect(() => {
    if (!open || isLoading || guide || generate.isPending) return;
    generate.mutate(platform, { onSuccess: () => setActiveSection(0) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, platform, isLoading, guide]);

  // Seed the checkboxes from persisted progress whenever the guide (re)loads.
  useEffect(() => {
    setChecked(new Set(progress?.completedSteps ?? []));
    setActiveSection(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platform, guide]);

  const toggle = (key: string) => {
    const next = new Set(checked);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setChecked(next);
    updateProgress.mutate({ platform, completedSteps: [...next] });
  };

  const handlePlatformChange = (value: string) =>
    setPlatform(value as SetupGuidePlatform);

  const section = guide?.checklist[activeSection];
  const totalSteps = guide ? countSetupGuideSteps(guide) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Platform Setup Guide</DialogTitle>
        </DialogHeader>

        <Select value={platform} onValueChange={handlePlatformChange}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SETUP_GUIDE_PLATFORMS.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(isLoading || generate.isPending) && !guide ? (
          <div className="text-muted-foreground flex items-center gap-2 py-16">
            <Loader2 className="h-4 w-4 animate-spin" />
            Building your {platform} setup guide…
          </div>
        ) : guide ? (
          <div className="grid grid-cols-[14rem_1fr] gap-4">
            <div className="border-r pr-2">
              <SetupGuideSectionList
                sections={guide.checklist}
                activeIndex={activeSection}
                onSelect={setActiveSection}
              />
              <p className="text-muted-foreground mt-3 px-3 text-xs">
                {checked.size}/{totalSteps} steps · ~
                {guide.estimatedTotalMinutes} min total
              </p>
            </div>
            <div className="max-h-[70vh] min-h-96 overflow-y-auto pr-1">
              {section ? (
                <>
                  <h3 className="mb-3 text-sm font-semibold">
                    {section.section}
                  </h3>
                  <SetupGuideStepList
                    steps={section.steps}
                    stepKey={(i) => setupGuideStepKey(activeSection, i)}
                    checked={checked}
                    onToggle={toggle}
                  />
                </>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="text-muted-foreground py-16 text-center text-sm">
            Could not load a guide. Close and try again.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
