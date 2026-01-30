"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { fullQuizSchema, type FullQuizResponse } from "@/lib/validations/quiz";
import { useSubmitQuiz } from "@/hooks/use-quiz";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ProductDefinitionStep } from "./product-definition-step";
import { TargetCustomerStep } from "./target-customer-step";
import { CompetitiveLandscapeStep } from "./competitive-landscape-step";
import { CommunityGoalsStep } from "./community-goals-step";

const STEP_FIELDS: Record<number, (keyof FullQuizResponse)[]> = {
  1: [
    "productType",
    "elevatorPitch",
    "problemSolved",
    "uniqueAngle",
    "currentStage",
  ],
  2: [
    "idealCustomer",
    "industryNiche",
    "customerPainPoints",
    "currentSolutions",
    "budgetRange",
    "businessModel",
  ],
  3: [
    "competitors",
    "competitorStrengths",
    "competitorWeaknesses",
    "differentiators",
  ],
  4: [
    "launchTimeline",
    "targetAudienceSize",
    "weeklyTimeCommitment",
    "preferredPlatforms",
    "contentComfortLevel",
  ],
};

export function QuizForm() {
  const [step, setStep] = useState(1);
  const router = useRouter();
  const submitQuiz = useSubmitQuiz();

  const form = useForm<FullQuizResponse>({
    resolver: zodResolver(fullQuizSchema),
    defaultValues: {
      productType: "saas",
      elevatorPitch: "",
      problemSolved: "",
      uniqueAngle: "",
      currentStage: "idea",
      idealCustomer: "",
      industryNiche: [],
      customerPainPoints: [],
      currentSolutions: [],
      budgetRange: "low",
      businessModel: "b2c",
      competitors: [],
      competitorStrengths: [],
      competitorWeaknesses: [],
      differentiators: [],
      launchTimeline: new Date().toISOString(),
      targetAudienceSize: 1000,
      weeklyTimeCommitment: 5,
      preferredPlatforms: [],
      contentComfortLevel: "beginner",
    },
  });

  const handleNext = async () => {
    const fields = STEP_FIELDS[step];
    const valid = await form.trigger(fields);
    if (valid) setStep((s) => s + 1);
  };

  const handleBack = () => setStep((s) => s - 1);

  const onSubmit = async (data: FullQuizResponse) => {
    try {
      await submitQuiz.mutateAsync(data);
      router.push("/audience");
    } catch {
      toast.error("Failed to submit quiz. Please try again.");
    }
  };

  return (
    <div className="space-y-6">
      <Progress value={step * 25} className="h-2" />
      <p className="text-sm text-zinc-500 text-center">Step {step} of 4</p>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={form.handleSubmit(onSubmit)}>
            {step === 1 && <ProductDefinitionStep form={form} />}
            {step === 2 && <TargetCustomerStep form={form} />}
            {step === 3 && <CompetitiveLandscapeStep form={form} />}
            {step === 4 && <CommunityGoalsStep form={form} />}

            <div className="flex justify-between mt-8">
              {step > 1 ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                >
                  Back
                </Button>
              ) : (
                <div />
              )}
              {step < 4 ? (
                <Button type="button" onClick={handleNext}>
                  Next
                </Button>
              ) : (
                <Button type="submit" disabled={submitQuiz.isPending}>
                  {submitQuiz.isPending ? "Submitting..." : "Submit"}
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
