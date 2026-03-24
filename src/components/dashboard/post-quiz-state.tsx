"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ConfidenceBadge } from "@/components/audience/confidence-badge";
import { Users, Megaphone, ArrowRight } from "lucide-react";
import type { AudienceProfile, ConfidenceLevel } from "@/types";

interface PostQuizStateProps {
  profile: {
    profileData: AudienceProfile;
    confidenceLevel: ConfidenceLevel;
  };
}

export function PostQuizState({ profile }: PostQuizStateProps) {
  const { profileData, confidenceLevel } = profile;
  const personaCount = profileData.primaryPersonas?.length ?? 0;
  const platformCount =
    profileData.behavioralPatterns?.contentConsumption?.length ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Your audience profile is ready — time to create your first campaign
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              <CardTitle>Audience Profile</CardTitle>
            </div>
            <ConfidenceBadge level={confidenceLevel} />
          </div>
          <CardDescription>
            {personaCount} persona{personaCount !== 1 ? "s" : ""} identified
            {platformCount > 0 && ` · ${platformCount} content channels mapped`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {profileData.primaryPersonas?.slice(0, 2).map((persona) => (
            <div key={persona.name} className="rounded-md border p-3 text-sm">
              <div className="font-medium">{persona.name}</div>
              <div className="text-muted-foreground mt-1">
                {persona.description}
              </div>
            </div>
          ))}
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/audience">
              View Full Profile
              <ArrowRight className="ml-2 h-3 w-3" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Megaphone className="text-primary h-5 w-5" />
            <CardTitle>Ready to Reach Your Audience?</CardTitle>
          </div>
          <CardDescription>
            Create a campaign to generate targeted content, schedule posts, and
            track performance across platforms.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild size="lg">
            <Link href="/dashboard/campaign/new">
              Create Your First Campaign
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
