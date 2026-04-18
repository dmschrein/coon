"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Rocket, ArrowRight } from "lucide-react";

export function PreQuizState() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <Card className="max-w-lg text-center">
        <CardHeader>
          <div className="bg-primary/10 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
            <Rocket className="text-primary h-8 w-8" />
          </div>
          <CardTitle className="text-2xl">
            Welcome to Community Builder
          </CardTitle>
          <CardDescription className="text-base">
            Build an engaged community before your product launch. Start by
            telling us about your product and audience — our AI will map out
            your strategy.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild size="lg" className="w-full">
            <Link href="/quiz">
              Take the Quiz
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
