import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { AudienceProfile } from "@/types";
import { Users, TrendingUp, Target } from "lucide-react";

interface AudienceProfileCardProps {
  profile: AudienceProfile;
}

export function AudienceProfileCard({ profile }: AudienceProfileCardProps) {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {/* Psychographics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5" />
            Psychographics
          </CardTitle>
          <CardDescription>Values, interests, and behaviors</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="mb-2 text-sm font-medium">Values</h4>
            <div className="flex flex-wrap gap-2">
              {profile.psychographics.values.map((value, idx) => (
                <Badge key={idx} variant="secondary">
                  {value}
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <h4 className="mb-2 text-sm font-medium">Motivations</h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {profile.psychographics.motivations.map((motivation, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>{motivation}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="mb-2 text-sm font-medium">Frustrations</h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {profile.psychographics.frustrations.map((frustration, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-destructive">•</span>
                  <span>{frustration}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="mb-2 text-sm font-medium">Goals</h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {profile.psychographics.goals.map((goal, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-green-500">•</span>
                  <span>{goal}</span>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Demographics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5" />
            Demographics
          </CardTitle>
          <CardDescription>Audience characteristics</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="mb-1 text-sm font-medium">Age Range</h4>
            <p className="text-sm text-muted-foreground">
              {profile.demographics.ageRange[0]} - {profile.demographics.ageRange[1]} years
            </p>
          </div>
          <div>
            <h4 className="mb-1 text-sm font-medium">Job Titles</h4>
            <div className="flex flex-wrap gap-2">
              {profile.demographics.jobTitles.map((jobTitle, idx) => (
                <Badge key={idx} variant="outline">
                  {jobTitle}
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <h4 className="mb-1 text-sm font-medium">Locations</h4>
            <div className="flex flex-wrap gap-2">
              {profile.demographics.locations.map((location, idx) => (
                <Badge key={idx} variant="secondary">
                  {location}
                </Badge>
              ))}
            </div>
          </div>
          {profile.demographics.incomeRange && (
            <div>
              <h4 className="mb-1 text-sm font-medium">Income Range</h4>
              <p className="text-sm text-muted-foreground">
                {profile.demographics.incomeRange}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Behavioral Patterns */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className="h-5 w-5" />
            Behavior
          </CardTitle>
          <CardDescription>How your audience behaves</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="mb-2 text-sm font-medium">Content Consumption</h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {profile.behavioralPatterns.contentConsumption.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="mb-2 text-sm font-medium">Purchase Drivers</h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {profile.behavioralPatterns.purchaseDrivers.map((driver, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-green-500">•</span>
                  <span>{driver}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="mb-2 text-sm font-medium">Decision Making</h4>
            <p className="text-sm text-muted-foreground">
              {profile.behavioralPatterns.decisionMakingProcess}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
