import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Hash } from "lucide-react";

interface KeywordsDisplayProps {
  keywords: string[];
}

export function KeywordsDisplay({ keywords }: KeywordsDisplayProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Hash className="h-5 w-5" />
          Keywords & Hashtags
        </CardTitle>
        <CardDescription>
          Recommended keywords for content and social media
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {keywords.map((keyword, idx) => (
            <Badge key={idx} variant="outline" className="text-sm">
              #{keyword}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
