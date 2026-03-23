"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ContentPillar } from "@/types";

interface CampaignOverviewProps {
  strategySummary: string | null;
  contentPillars: ContentPillar[] | null;
  selectedPlatforms: string[];
  status: string;
}

export function CampaignOverview({
  strategySummary,
  contentPillars,
  selectedPlatforms,
  status,
}: CampaignOverviewProps) {
  return (
    <div className="space-y-6">
      {strategySummary && (
        <Card>
          <CardHeader>
            <CardTitle>Strategy Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{strategySummary}</p>
          </CardContent>
        </Card>
      )}

      {contentPillars && contentPillars.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Content Pillars</CardTitle>
            <CardDescription>
              Core themes guiding your campaign content
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {contentPillars.map((pillar, idx) => (
                <div key={idx} className="space-y-2 rounded-lg border p-4">
                  <h4 className="font-semibold">{pillar.theme}</h4>
                  <p className="text-muted-foreground text-sm">
                    {pillar.description}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {pillar.sampleTopics.map((topic, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {topic}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-muted-foreground text-xs">
                    Addresses: {pillar.targetedPainPoint}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Platforms</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {selectedPlatforms.map((platform) => (
              <Badge key={platform} variant="outline">
                {platform}
              </Badge>
            ))}
          </div>
          <div className="mt-3">
            <Badge variant={status === "complete" ? "default" : "secondary"}>
              {status.replace(/_/g, " ")}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
