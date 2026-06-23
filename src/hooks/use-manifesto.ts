import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ManifestoOutput, ManifestoSection } from "@/types";

const QUERY_KEY = ["community-manifesto"] as const;

export function useManifesto() {
  return useQuery<ManifestoOutput | null>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const res = await fetch("/api/community/manifesto");
      if (!res.ok) throw new Error("Failed to fetch manifesto");
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      return json.data as ManifestoOutput | null;
    },
  });
}

export interface GenerateManifestoInput {
  regenerate?: boolean;
  section?: ManifestoSection;
}

export function useGenerateManifesto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: GenerateManifestoInput = {}) => {
      const res = await fetch("/api/community/manifesto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error?.message ?? "Failed to generate manifesto");
      }
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      return json.data as ManifestoOutput;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(QUERY_KEY, data);
    },
  });
}
