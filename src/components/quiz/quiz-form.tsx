"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { fullQuizSchema, type FullQuizResponse } from "@/lib/validations/quiz";
import { useSubmitQuiz } from "@/hooks/use-quiz";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ProductDefinitionStep } from "./product-definition-step";
import { TargetCustomerStep } from "./target-customer-step";
import { GoalsStep } from "./goals-step";
import { CompletionScreen } from "./completion-screen";

const TOTAL_STEPS = 3;

const STEP_FIELDS: Record<number, (keyof FullQuizResponse)[]> = {
  1: ["productType", "elevatorPitch", "problemSolved", "currentStage"],
  2: [
    "idealCustomer",
    "industryNiche",
    "preferredPlatforms",
    "businessModel",
    "budgetRange",
  ],
  3: [
    "primaryGoal",
    "launchTimeline",
    "weeklyTimeCommitment",
    "contentComfortLevel",
  ],
};

const STEP_TITLES = ["Your Product", "Your Audience", "Your Goals"];

function getDefaultLaunchTimeline(): string {
  return new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
}

function parseTextToArray(text: string): string[] {
  return text
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function QuizForm() {
  const [step, setStep] = useState(1);
  const [showCompletion, setShowCompletion] = useState(false);
  const [industryNicheText, setIndustryNicheText] = useState("");
  const submitQuiz = useSubmitQuiz();

  const form = useForm<FullQuizResponse>({
    resolver: zodResolver(fullQuizSchema),
    defaultValues: {
      productType: "saas",
      elevatorPitch: "",
      problemSolved: "",
      currentStage: "idea",
      idealCustomer: "",
      industryNiche: [],
      preferredPlatforms: [],
      businessModel: "b2c",
      budgetRange: "low",
      primaryGoal: "pre-launch",
      launchTimeline: getDefaultLaunchTimeline(),
      weeklyTimeCommitment: 5,
      contentComfortLevel: "beginner",
    },
  });

  const handleNext = async () => {
    if (step === 2) {
      form.setValue("industryNiche", parseTextToArray(industryNicheText), {
        shouldValidate: false,
      });
    }
    const fields = STEP_FIELDS[step];
    const valid = await form.trigger(fields);
    if (valid) setStep((s) => s + 1);
  };

  const handleBack = () => setStep((s) => s - 1);

  const onSubmit = async (data: FullQuizResponse) => {
    const finalData: FullQuizResponse = {
      ...data,
      industryNiche:
        data.industryNiche.length > 0
          ? data.industryNiche
          : parseTextToArray(industryNicheText),
    };

    try {
      await submitQuiz.mutateAsync(finalData);
      setShowCompletion(true);
    } catch {
      toast.error("Failed to submit. Please try again.");
    }
  };

  if (showCompletion) {
    return <CompletionScreen />;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Progress value={(step / TOTAL_STEPS) * 100} className="h-2" />
        <p className="text-center text-sm text-zinc-500">
          Step {step} of {TOTAL_STEPS} — {STEP_TITLES[step - 1]}
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={form.handleSubmit(onSubmit)}>
            {step === 1 && <ProductDefinitionStep form={form} />}
            {step === 2 && (
              <TargetCustomerStep
                form={form}
                industryNicheText={industryNicheText}
                onIndustryNicheChange={setIndustryNicheText}
              />
            )}
            {step === 3 && <GoalsStep form={form} />}

            <div className="mt-8 flex justify-between">
              {step > 1 ? (
                <Button type="button" variant="outline" onClick={handleBack}>
                  Back
                </Button>
              ) : (
                <div />
              )}
              {step < TOTAL_STEPS ? (
                <Button type="button" onClick={handleNext}>
                  Next
                </Button>
              ) : (
                <Button type="submit" disabled={submitQuiz.isPending}>
                  {submitQuiz.isPending ? "Analyzing..." : "Get My Profile"}
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
