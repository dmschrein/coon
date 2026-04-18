"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb, TrendingUp } from "lucide-react";

interface AiRecommendationsProps {
  insights: string[];
  recommendations: string[];
}

export function AiRecommendations({
  insights,
  recommendations,
}: AiRecommendationsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            Key Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          {insights.length > 0 ? (
            <ul className="space-y-2">
              {insights.map((insight, i) => (
                <li
                  key={i}
                  className="flex gap-2 rounded-md border px-3 py-2 text-sm"
                >
                  <span className="text-muted-foreground font-mono">
                    {i + 1}.
                  </span>
                  {insight}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">
              Generate insights to see AI analysis.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-500" />
            Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recommendations.length > 0 ? (
            <ul className="space-y-2">
              {recommendations.map((rec, i) => (
                <li
                  key={i}
                  className="flex gap-2 rounded-md border px-3 py-2 text-sm"
                >
                  <span className="text-muted-foreground font-mono">
                    {i + 1}.
                  </span>
                  {rec}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">
              Generate insights to see recommendations.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
