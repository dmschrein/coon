import { useMutation } from "@tanstack/react-query";
import type {
  ConversationSeed,
  SeedRequest,
} from "@/lib/validations/conversation-seed";

export function useGenerateSeeds(campaignId: string | null) {
  return useMutation<{ seeds: ConversationSeed[] }, Error, SeedRequest>({
    mutationFn: async (input) => {
      if (!campaignId) {
        throw new Error("No active campaign");
      }
      const res = await fetch(`/api/campaign/${campaignId}/seeds`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error("Failed to generate seeds");
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      return json.data;
    },
  });
}
