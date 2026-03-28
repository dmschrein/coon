"use client";

import type { ContentScores } from "@/types";

interface ScoreDetailProps {
  scores: ContentScores;
}

const dimensions = [
  { key: "engagementPotential" as const, label: "Engagement Potential" },
  { key: "brandVoiceAlignment" as const, label: "Brand Voice" },
  { key: "platformFit" as const, label: "Platform Fit" },
];

function ScoreBar({ label, value }: { label: string; value: number }) {
  const color =
    value >= 8 ? "bg-green-500" : value >= 5 ? "bg-yellow-500" : "bg-red-500";

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span>{label}</span>
        <span className="font-medium">{value}/10</span>
      </div>
      <div className="bg-muted h-2 rounded-full">
        <div
          className={`h-2 rounded-full ${color}`}
          style={{ width: `${value * 10}%` }}
        />
      </div>
    </div>
  );
}

export function ScoreDetail({ scores }: ScoreDetailProps) {
  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium">Quality Score</h4>

      <div className="space-y-3">
        {dimensions.map((d) => (
          <ScoreBar key={d.key} label={d.label} value={scores[d.key]} />
        ))}
      </div>

      {scores.feedback.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-medium">Feedback</p>
          <ul className="text-muted-foreground list-disc space-y-1 pl-4 text-xs">
            {scores.feedback.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        </div>
      )}

      {scores.suggestions.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-medium">Suggestions</p>
          <ul className="text-muted-foreground list-disc space-y-1 pl-4 text-xs">
            {scores.suggestions.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
