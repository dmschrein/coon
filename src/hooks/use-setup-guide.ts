import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { SetupGuideProgress, SetupGuidePlatform } from "@/types";

type SetupGuideMap = Record<string, SetupGuideProgress>;

const SETUP_GUIDES_KEY = ["community-setup-guides"] as const;

/** Map of platform -> persisted setup progress (guide + checked steps + completed). */
export function useSetupGuides() {
  return useQuery<SetupGuideMap>({
    queryKey: SETUP_GUIDES_KEY,
    queryFn: async () => {
      const res = await fetch("/api/community/setup-guide");
      if (!res.ok) throw new Error("Failed to fetch setup guides");
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      return (json.data?.setupGuides ?? {}) as SetupGuideMap;
    },
  });
}

function setProgressInCache(
  queryClient: ReturnType<typeof useQueryClient>,
  platform: SetupGuidePlatform,
  progress: SetupGuideProgress
) {
  queryClient.setQueryData<SetupGuideMap>(SETUP_GUIDES_KEY, (prev) => ({
    ...(prev ?? {}),
    [platform]: progress,
  }));
}

/** Get-or-generate the guide for a platform. */
export function useGenerateSetupGuide() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (platform: SetupGuidePlatform) => {
      const res = await fetch("/api/community/setup-guide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(
          json?.error?.message ?? "Failed to generate setup guide"
        );
      }
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      return json.data as SetupGuideProgress;
    },
    onSuccess: (progress, platform) => {
      setProgressInCache(queryClient, platform, progress);
    },
  });
}

/** Persist which steps are checked for a platform. */
export function useUpdateSetupProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (vars: {
      platform: SetupGuidePlatform;
      completedSteps: string[];
    }) => {
      const res = await fetch("/api/community/setup-guide", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vars),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error?.message ?? "Failed to save progress");
      }
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      return json.data as SetupGuideProgress;
    },
    onSuccess: (progress, { platform }) => {
      setProgressInCache(queryClient, platform, progress);
    },
  });
}
