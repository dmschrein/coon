"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Users, Megaphone } from "lucide-react";

export function QuickActions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3">
        <Button asChild variant="default" size="sm">
          <Link href="/dashboard/campaign/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            New Campaign
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard/audience">
            <Users className="mr-2 h-4 w-4" />
            View Audience
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard/campaign">
            <Megaphone className="mr-2 h-4 w-4" />
            All Campaigns
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
