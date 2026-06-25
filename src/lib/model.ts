/**
 * Single source of truth for the Claude model id used by every agent.
 *
 * Update this one constant to migrate the whole app to a new model. It lives in
 * its own module (not `claude.ts`) so that tests which `vi.mock("@/lib/claude")`
 * do not shadow it.
 */
export const CLAUDE_MODEL = "claude-sonnet-4-6";
