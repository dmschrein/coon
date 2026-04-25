/**
 * Threads Platform Adapter — Stub (not yet implemented).
 */

import { StubAdapter } from "./stub-adapter";

export class ThreadsAdapter extends StubAdapter {
  platform = "threads" as const;
}
