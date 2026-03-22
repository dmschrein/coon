# AI Agents

## Standard

Read `agent-os/standards/agents.md` before modifying any agent.

## Overview

Agents are AI-powered functions that call Claude to analyze data and generate content. Each agent has a focused responsibility:

| Agent                   | Purpose                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------ |
| `audience-analysis.ts`  | Analyzes quiz responses to build audience profiles (personas, keywords, communities) |
| `campaign-strategy.ts`  | Generates campaign strategies from audience profiles                                 |
| `campaign-calendar.ts`  | Creates scheduled content calendars for campaigns                                    |
| `content-generation.ts` | Generates individual content pieces                                                  |

## Platform Content Generators

`campaign-content/` contains platform-specific content generators:

blog, discord, email, instagram, linkedin, pinterest, reddit, threads, tiktok, twitter, youtube

Each generator produces content formatted for its platform's conventions.

## Patterns

- Agents use `claude.ts` for Claude API interaction
- Agent utilities live in `utils.ts` (shared prompt helpers, JSON extraction)
- Test fixtures are in `__fixtures__/` (audience, campaign, quiz data)
- Tests use fixtures to avoid real API calls — mock the Claude client

## Adding a New Agent

1. Create the agent file with a single exported function
2. Add fixtures in `__fixtures__/`
3. Add tests in `__tests__/`
4. Wire into the orchestration pipeline if it's part of a multi-step flow
