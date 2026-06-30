"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Mail, MessageCircle, Bell, Smartphone } from "lucide-react";
import type { OnboardingStep, OnboardingChannel } from "@/types";
import { ONBOARDING_TIMING_LABELS } from "@/lib/core/domain/onboarding-schedule";
import { cn } from "@/lib/utils";

const CHANNEL_ICONS: Record<
  OnboardingChannel,
  React.ComponentType<{ className?: string }>
> = {
  email: Mail,
  discord_dm: MessageCircle,
  in_app: Bell,
  sms: Smartphone,
};

const CHANNEL_LABELS: Record<OnboardingChannel, string> = {
  email: "Email",
  discord_dm: "Discord DM",
  in_app: "In-App",
  sms: "SMS",
};

interface OnboardingStepRowProps {
  step: OnboardingStep;
  onChange: (patch: Partial<OnboardingStep>) => void;
  /** Drag grip rendered by the sortable wrapper (listeners + attributes). */
  dragHandle?: React.ReactNode;
  className?: string;
}

export function OnboardingStepRow({
  step,
  onChange,
  dragHandle,
  className,
}: OnboardingStepRowProps) {
  const ChannelIcon = CHANNEL_ICONS[step.channel];

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: "Write this step's message…" }),
    ],
    content: step.content,
    immediatelyRender: false,
    onUpdate: ({ editor }) => onChange({ content: editor.getHTML() }),
  });

  return (
    <Card className={cn("relative", className)}>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center gap-2">
          {dragHandle}
          <Badge variant="secondary">
            {ONBOARDING_TIMING_LABELS[step.triggerTiming]}
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <ChannelIcon className="h-3 w-3" />
            {CHANNEL_LABELS[step.channel]}
          </Badge>
          <span className="text-muted-foreground ml-auto text-xs">
            Step {step.stepNumber}
          </span>
        </div>

        {step.channel === "email" && (
          <Input
            value={step.subject ?? ""}
            placeholder="Subject line"
            aria-label="Subject line"
            onChange={(e) => onChange({ subject: e.target.value })}
          />
        )}

        <div className="prose prose-sm min-h-[80px] max-w-none rounded-md border p-3">
          <EditorContent editor={editor} />
        </div>
      </CardContent>
    </Card>
  );
}
