"use client";

import Link from "next/link";
import { useAudienceProfile } from "@/hooks/use-audience-profile";
import { useContentList } from "@/hooks/use-content";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Circle, Loader2, ArrowRight } from "lucide-react";

export default function DashboardPage() {
  const { data: audienceProfile, isLoading: isLoadingProfile } = useAudienceProfile();
  const { data: contentResponse, isLoading: isLoadingContent } = useContentList();

  const hasProfile = !!audienceProfile;
  const hasContent = contentResponse && contentResponse.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Track your community-building progress
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Quiz Status */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <CardTitle className="text-lg">Quiz Complete</CardTitle>
            </div>
            <CardDescription>
              You've completed the onboarding quiz
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href="/quiz">
                Retake Quiz
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Audience Profile Status */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              {isLoadingProfile ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : hasProfile ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground" />
              )}
              <CardTitle className="text-lg">Audience Analysis</CardTitle>
            </div>
            <CardDescription>
              {hasProfile
                ? "Your audience profile is ready"
                : "Generate your target audience profile"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant={hasProfile ? "outline" : "default"} className="w-full">
              <Link href="/dashboard/audience">
                {hasProfile ? "View Profile" : "Generate Profile"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Content Status */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              {isLoadingContent ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : hasContent ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground" />
              )}
              <CardTitle className="text-lg">Content Generation</CardTitle>
            </div>
            <CardDescription>
              {hasContent
                ? `${contentResponse.length} content items generated`
                : "Generate content for your audience"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              asChild
              variant={hasContent ? "outline" : "default"}
              className="w-full"
              disabled={!hasProfile}
            >
              <Link href="/dashboard/content">
                {hasContent ? "View Content" : "Generate Content"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            {!hasProfile && (
              <p className="mt-2 text-xs text-muted-foreground">
                Complete audience analysis first
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Start Guide */}
      <Card>
        <CardHeader>
          <CardTitle>Next Steps</CardTitle>
          <CardDescription>
            Follow these steps to build your pre-launch community
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-700">
              1
            </div>
            <div className="flex-1">
              <h3 className="font-medium">Complete the Quiz</h3>
              <p className="text-sm text-muted-foreground">
                Already done! Your product and market insights are saved.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full ${
                hasProfile
                  ? "bg-green-100 text-green-700"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              2
            </div>
            <div className="flex-1">
              <h3 className="font-medium">Generate Audience Profile</h3>
              <p className="text-sm text-muted-foreground">
                AI analyzes your quiz to create detailed audience personas.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full ${
                hasContent
                  ? "bg-green-100 text-green-700"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              3
            </div>
            <div className="flex-1">
              <h3 className="font-medium">Generate Content</h3>
              <p className="text-sm text-muted-foreground">
                Get AI-generated content tailored to your audience and platforms.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
              4
            </div>
            <div className="flex-1">
              <h3 className="font-medium">Copy and Share</h3>
              <p className="text-sm text-muted-foreground">
                Copy content drafts and start building your audience on social platforms.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
