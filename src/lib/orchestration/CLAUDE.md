# Orchestration Layer

## Overview

This layer coordinates multi-step agent workflows with reliability patterns. It is the backbone of the orchestration-first architecture.

## Components

| File                 | Purpose                                                |
| -------------------- | ------------------------------------------------------ |
| `agent-pipeline.ts`  | Chains agents into sequential/parallel pipelines       |
| `agent-queue.ts`     | Queues agent tasks for async processing                |
| `cache-manager.ts`   | Caches agent results to avoid redundant API calls      |
| `circuit-breaker.ts` | Prevents cascading failures when agents/APIs are down  |
| `retry.ts`           | Configurable retry with backoff for transient failures |
| `index.ts`           | Public API — import from here                          |

## Patterns

- **Pipeline**: Use `agent-pipeline` to compose multi-agent flows (e.g., quiz → audience analysis → campaign strategy → content generation)
- **Queue**: Use for non-blocking agent work that can run in the background
- **Circuit breaker**: Wraps external calls (Claude API, DB) to fail fast when services are unhealthy
- **Retry**: Use for transient failures only (network errors, rate limits). Do not retry on validation errors.
- **Cache**: Cache expensive agent outputs keyed by input hash

## Adding New Orchestration

1. Compose existing primitives (pipeline + retry + circuit breaker) before creating new ones
2. Add tests in `__tests__/` — orchestration logic must be well-tested
3. Export through `index.ts`
