/**
 * Connected Accounts Hooks - React Query hooks for social account management.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ConnectedAccount, SocialPlatform } from "@/types";

export function useConnectedAccounts() {
  return useQuery<ConnectedAccount[]>({
    queryKey: ["connected-accounts"],
    queryFn: async () => {
      const res = await fetch("/api/accounts");
      if (!res.ok) throw new Error("Failed to fetch connected accounts");
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      return json.data;
    },
  });
}

export function useConnectPlatform() {
  return useMutation({
    mutationFn: async (platform: SocialPlatform) => {
      const res = await fetch(`/api/accounts/connect/${platform}`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to initiate connection");
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      return json.data as { authUrl: string };
    },
    onSuccess: (data) => {
      // Redirect to OAuth provider
      window.location.href = data.authUrl;
    },
  });
}

export function useDisconnectAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (accountId: string) => {
      const res = await fetch(`/api/accounts/${accountId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to disconnect account");
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["connected-accounts"] });
    },
  });
}

export function useRefreshAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (accountId: string) => {
      const res = await fetch(`/api/accounts/${accountId}/refresh`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to refresh account tokens");
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["connected-accounts"] });
    },
  });
}
