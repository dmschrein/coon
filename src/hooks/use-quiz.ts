"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { QuizResponse, ApiResponse } from "@/types";

export function useQuizResponses() {
  return useQuery({
    queryKey: ["quiz-responses"],
    queryFn: async () => {
      const res = await fetch("/api/quiz/responses");
      const json: ApiResponse<Array<{ id: string; responseData: QuizResponse; completedAt: string }>> = await res.json();
      if (json.error) throw new Error(json.error.message);
      return json.data;
    },
  });
}

export function useSubmitQuiz() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: QuizResponse) => {
      const res = await fetch("/api/quiz/responses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json: ApiResponse<{ id: string }> = await res.json();
      if (json.error) throw new Error(json.error.message);
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quiz-responses"] });
    },
  });
}
