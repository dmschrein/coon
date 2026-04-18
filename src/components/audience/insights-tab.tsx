import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function InsightsTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Audience Insights</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex min-h-48 items-center justify-center text-center">
          <div className="max-w-sm space-y-2">
            <p className="text-muted-foreground text-sm">
              Insights will appear here once your campaigns start generating
              analytics data.
            </p>
            <p className="text-muted-foreground text-xs">
              Publish content and check back to see how your audience responds.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
