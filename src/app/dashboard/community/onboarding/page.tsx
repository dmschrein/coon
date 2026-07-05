"use client";

import { OnboardingBuilder } from "@/components/community/onboarding-builder";

export default function OnboardingPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Member Onboarding</h1>
        <p className="text-muted-foreground text-sm">
          Build and activate a welcome sequence for new members.
        </p>
      </div>
      <OnboardingBuilder />
    </div>
  );
}
