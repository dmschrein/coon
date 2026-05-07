import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { EventInput } from "@/lib/validations/event";

export function useCreateEvent(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation<{ contentIds: string[] }, Error, EventInput>({
    mutationFn: async (input) => {
      const res = await fetch(`/api/campaign/${campaignId}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error("Failed to create event sequence");
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["campaign", campaignId, "content"],
      });
      queryClient.invalidateQueries({ queryKey: ["campaign", campaignId] });
    },
  });
}
