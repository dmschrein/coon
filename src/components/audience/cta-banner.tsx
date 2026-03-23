"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function CtaBanner() {
  const router = useRouter();

  return (
    <div className="bg-muted/40 flex items-center justify-between gap-4 rounded-lg border p-6">
      <div>
        <p className="font-semibold">Ready to reach this audience?</p>
        <p className="text-muted-foreground mt-1 text-sm">
          Create your first campaign to start building your community.
        </p>
      </div>
      <Button onClick={() => router.push("/dashboard/campaign/new")}>
        Create Campaign
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}
