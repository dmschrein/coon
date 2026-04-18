"use client";

import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface CampaignCardProps {
  id: string;
  name: string | null;
  status: string;
  selectedPlatforms: string[];
  goal: string | null;
  createdAt: string;
  contentCount?: number;
}

export function CampaignCard({
  id,
  name,
  status,
  selectedPlatforms,
  goal,
  createdAt,
  contentCount,
}: CampaignCardProps) {
  const statusColor =
    status === "complete"
      ? "default"
      : status === "failed"
        ? "destructive"
        : "secondary";

  return (
    <Link href={`/dashboard/campaign/${id}`}>
      <Card className="transition-shadow hover:shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <CardTitle className="text-lg">
              {name ?? "Untitled Campaign"}
            </CardTitle>
            <Badge variant={statusColor}>{status.replace(/_/g, " ")}</Badge>
          </div>
          {goal && (
            <CardDescription className="capitalize">
              {goal.replace(/-/g, " ")}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-1">
            {selectedPlatforms.map((p) => (
              <Badge key={p} variant="outline" className="text-xs">
                {p}
              </Badge>
            ))}
          </div>
          <p className="text-muted-foreground mt-2 text-xs">
            {contentCount !== undefined && `${contentCount} pieces · `}
            Created {new Date(createdAt).toLocaleDateString()}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
