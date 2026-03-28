"use client";

import type { SeoAnalysis } from "@/types";

interface SeoPanelProps {
  seo: SeoAnalysis;
}

function SeoScoreBar({ label, value }: { label: string; value: number }) {
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

export function SeoPanel({ seo }: SeoPanelProps) {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium">SEO Analysis</h4>

      <div className="space-y-2">
        <SeoScoreBar
          label="Meta Description"
          value={seo.metaDescriptionScore}
        />
        <SeoScoreBar
          label="Heading Structure"
          value={seo.headingStructureScore}
        />
        <SeoScoreBar label="Readability" value={seo.readabilityScore} />
      </div>

      {seo.missingKeywords.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-medium">Missing Keywords</p>
          <p className="text-muted-foreground text-xs">
            {seo.missingKeywords.join(", ")}
          </p>
        </div>
      )}

      {seo.suggestions.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-medium">Suggestions</p>
          <ul className="text-muted-foreground list-disc space-y-1 pl-4 text-xs">
            {seo.suggestions.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
