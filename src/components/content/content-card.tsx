"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface ContentCardProps {
  id: string;
  platform: string;
  contentType: string;
  pillar: string | null;
  title: string | null;
  body: string;
  hashtags: string[] | null;
  cta: string | null;
  createdAt: string;
}

export function ContentCard(props: ContentCardProps) {
  const handleCopy = () => {
    const fullContent = [
      props.title,
      props.body,
      props.hashtags?.map((tag) => `#${tag}`).join(" "),
      props.cta,
    ]
      .filter(Boolean)
      .join("\n\n");

    navigator.clipboard.writeText(fullContent);
    toast.success("Content copied to clipboard");
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="mb-2 flex flex-wrap gap-2">
              <Badge variant="secondary">{props.platform}</Badge>
              <Badge variant="outline">{props.contentType}</Badge>
              {props.pillar && <Badge>{props.pillar}</Badge>}
            </div>
            {props.title && <CardTitle className="text-lg">{props.title}</CardTitle>}
            <CardDescription className="mt-1">
              {new Date(props.createdAt).toLocaleDateString()}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={handleCopy}>
              <Copy className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" asChild>
              <Link href={`/dashboard/content/${props.id}`}>
                <ExternalLink className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-4">
          {props.body}
        </p>
        {props.hashtags && props.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {props.hashtags.map((tag, idx) => (
              <span key={idx} className="text-xs text-muted-foreground">
                #{tag}
              </span>
            ))}
          </div>
        )}
        {props.cta && (
          <p className="text-sm font-medium text-primary">{props.cta}</p>
        )}
      </CardContent>
    </Card>
  );
}
