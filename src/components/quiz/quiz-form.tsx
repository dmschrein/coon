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

const TOTAL_STEPS = 2;

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
    "preferredPlatforms",
  ],
};

function getLaunchTimeline(): string {
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
  // Controlled text state for the textarea-based array fields
  const [industryNicheText, setIndustryNicheText] = useState("");
  const [customerPainPointsText, setCustomerPainPointsText] = useState("");
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
      preferredPlatforms: [],
      budgetRange: "low",
      businessModel: "b2c",
      competitors: [],
      competitorStrengths: [],
      competitorWeaknesses: [],
      differentiators: [],
      targetAudienceSize: 1000,
      weeklyTimeCommitment: 5,
      contentComfortLevel: "beginner",
    },
  });

  const handleNext = async () => {
    // Sync textarea values to form arrays before validating step 2
    if (step === 2) {
      form.setValue("industryNiche", parseTextToArray(industryNicheText), {
        shouldValidate: false,
      });
      form.setValue(
        "customerPainPoints",
        parseTextToArray(customerPainPointsText),
        { shouldValidate: false }
      );
    }
    const fields = STEP_FIELDS[step];
    const valid = await form.trigger(fields);
    if (valid) setStep((s) => s + 1);
  };

  const handleBack = () => setStep((s) => s - 1);

  const onSubmit = async (data: FullQuizResponse) => {
    // Ensure textarea values are synced to arrays before final submit
    const finalData: FullQuizResponse = {
      ...data,
      industryNiche:
        data.industryNiche.length > 0
          ? data.industryNiche
          : parseTextToArray(industryNicheText),
      customerPainPoints:
        data.customerPainPoints.length > 0
          ? data.customerPainPoints
          : parseTextToArray(customerPainPointsText),
      launchTimeline: getLaunchTimeline(),
    };

    try {
      await submitQuiz.mutateAsync(finalData);
      // Redirect to audience page with autoGenerate flag so profile is triggered automatically
      router.push("/dashboard/audience?autoGenerate=true");
    } catch {
      toast.error("Failed to submit. Please try again.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Progress value={(step / TOTAL_STEPS) * 100} className="h-2" />
        <p className="text-center text-sm text-zinc-500">
          Step {step} of {TOTAL_STEPS}
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
                customerPainPointsText={customerPainPointsText}
                onCustomerPainPointsChange={setCustomerPainPointsText}
              />
            )}

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
                  {submitQuiz.isPending ? "Submitting..." : "Get My Profile"}
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
