"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGenerateSeeds } from "@/hooks/use-seeds";
import { campaignPlatformValues } from "@/lib/validations/campaign";
import type { ConversationSeed } from "@/lib/validations/conversation-seed";
import { incrementSeedsThisWeek } from "@/lib/seeds-counter";

interface SeedGeneratorPanelProps {
  campaignId: string | null;
}

const SEED_TYPE_LABELS: Record<ConversationSeed["type"], string> = {
  question: "Question",
  poll: "Poll",
  challenge: "Challenge",
  hot_take: "Hot Take",
};

export function SeedGeneratorPanel({ campaignId }: SeedGeneratorPanelProps) {
  const [platform, setPlatform] = useState<
    (typeof campaignPlatformValues)[number]
  >(campaignPlatformValues[0]);
  const [count, setCount] = useState(5);
  const [seeds, setSeeds] = useState<ConversationSeed[]>([]);
  const generate = useGenerateSeeds(campaignId);
  const noCampaign = !campaignId;

  const handleGenerate = () => {
    if (!campaignId) return;
    generate.mutate(
      { platform, count },
      {
        onSuccess: (data) => {
          setSeeds(data.seeds);
          incrementSeedsThisWeek(campaignId, data.seeds.length);
          toast.success(`Generated ${data.seeds.length} seeds`);
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Could not copy to clipboard");
    }
  };

  return (
    <div className="space-y-4">
      {noCampaign ? (
        <div className="bg-muted/40 text-muted-foreground rounded-lg border border-dashed p-4 text-sm">
          You need an active campaign to generate seeds.{" "}
          <Link
            href="/dashboard/campaign/new"
            className="text-primary underline"
          >
            Create one
          </Link>
          .
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Generate conversation seeds
          </CardTitle>
          <CardDescription>
            Spark community engagement with platform-tuned questions, polls,
            challenges, and hot takes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="seed-platform">Platform</Label>
              <Select
                value={platform}
                onValueChange={(v) =>
                  setPlatform(v as (typeof campaignPlatformValues)[number])
                }
                disabled={noCampaign}
              >
                <SelectTrigger id="seed-platform" className="w-full">
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent>
                  {campaignPlatformValues.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="seed-count">Count</Label>
                <Badge variant="secondary">{count}</Badge>
              </div>
              <input
                id="seed-count"
                type="range"
                min={3}
                max={10}
                step={1}
                value={count}
                onChange={(e) => setCount(Number.parseInt(e.target.value, 10))}
                disabled={noCampaign}
                className="bg-muted h-2 w-full cursor-pointer appearance-none rounded-full accent-current disabled:cursor-not-allowed disabled:opacity-50"
              />
              <div className="text-muted-foreground flex justify-between text-xs">
                <span>3</span>
                <span>10</span>
              </div>
            </div>
          </div>
          <Button
            onClick={handleGenerate}
            disabled={noCampaign || generate.isPending}
          >
            {generate.isPending ? "Generating…" : "Generate Seeds"}
          </Button>
        </CardContent>
      </Card>

      {seeds.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {seeds.map((seed, idx) => (
            <Card key={`${seed.type}-${idx}`} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <Badge variant="secondary">
                    {SEED_TYPE_LABELS[seed.type]}
                  </Badge>
                  {seed.best_time ? (
                    <Badge variant="outline" className="text-xs">
                      {seed.best_time}
                    </Badge>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent className="flex-1 space-y-2 text-sm">
                <p className="font-medium whitespace-pre-line">{seed.text}</p>
                {seed.follow_up ? (
                  <p className="text-muted-foreground text-xs">
                    <span className="font-semibold">Follow-up:</span>{" "}
                    {seed.follow_up}
                  </p>
                ) : null}
                <p className="text-muted-foreground text-xs italic">
                  {seed.rationale}
                </p>
              </CardContent>
              <div className="px-6 pb-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => handleCopy(seed.text)}
                >
                  Copy
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
}
