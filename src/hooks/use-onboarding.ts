import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { OnboardingSequenceWithSteps } from "@/types";

const QUERY_KEY = ["community-onboarding"] as const;

export interface GenerateOnboardingInput {
  communityName?: string;
  productPitch?: string;
}

export function useOnboarding() {
  return useQuery<OnboardingSequenceWithSteps | null>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const res = await fetch("/api/community/onboarding");
      if (!res.ok) throw new Error("Failed to fetch onboarding sequence");
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      return json.data.sequence as OnboardingSequenceWithSteps | null;
    },
  });
}

export function useGenerateOnboarding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: GenerateOnboardingInput = {}) => {
      const res = await fetch("/api/community/onboarding/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(
          json?.error?.message ?? "Failed to generate onboarding sequence"
        );
      }
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      return json.data.sequence as OnboardingSequenceWithSteps;
    },
    onSuccess: (sequence) => {
      queryClient.setQueryData(QUERY_KEY, sequence);
    },
  });
}

export function useActivateOnboarding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/community/onboarding/activate", {
        method: "POST",
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(
          json?.error?.message ?? "Failed to activate onboarding sequence"
        );
      }
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      return json.data as { sequenceId: string; scheduled: number };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}
