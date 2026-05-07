function isoWeekKey(date: Date = new Date()): string {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function buildKey(campaignId: string): string {
  return `coon:seeds-generated:${campaignId}:${isoWeekKey()}`;
}

export function readSeedsThisWeek(campaignId: string | null): number {
  if (!campaignId || typeof window === "undefined") return 0;
  const raw = window.localStorage.getItem(buildKey(campaignId));
  const n = raw ? Number.parseInt(raw, 10) : 0;
  return Number.isFinite(n) ? n : 0;
}

export function incrementSeedsThisWeek(
  campaignId: string | null,
  by: number
): number {
  if (!campaignId || typeof window === "undefined" || by <= 0) return 0;
  const key = buildKey(campaignId);
  const current = readSeedsThisWeek(campaignId);
  const next = current + by;
  window.localStorage.setItem(key, String(next));
  window.dispatchEvent(
    new CustomEvent("coon:seeds-counter-updated", {
      detail: { campaignId, count: next },
    })
  );
  return next;
}

export function subscribeToSeedsCounter(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("coon:seeds-counter-updated", callback);
  return () =>
    window.removeEventListener("coon:seeds-counter-updated", callback);
}
