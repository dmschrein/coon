# Community Builder — Application

## Tech Stack

- **Framework**: Next.js 16 (App Router) with React 19
- **Styling**: Tailwind CSS v4 + shadcn/ui (Radix primitives)
- **State**: TanStack React Query v5 (server state), React Hook Form + Zod v4 (forms)
- **Database**: PostgreSQL via Neon (serverless), Drizzle ORM
- **Auth**: Clerk (webhook-based user sync via Svix)
- **AI**: Anthropic Claude SDK (`@anthropic-ai/sdk`)
- **Testing**: Vitest + Testing Library + MSW (API mocking)
- **Linting**: ESLint + Prettier + Husky (pre-commit)

## Commands

```bash
npm run dev          # Start dev server
npm run test         # Run vitest in watch mode
npm run test:run     # Run tests once
npm run test:coverage # Run tests with coverage
npm run lint         # ESLint
npm run format       # Prettier
npm run build        # Production build
```

## Architecture

```
src/
├── app/              # Next.js App Router pages and API routes
│   ├── (auth)/       # Auth pages (Clerk sign-in/sign-up)
│   ├── (onboarding)/ # Onboarding quiz flow
│   ├── api/          # API route handlers
│   └── dashboard/    # Main dashboard (audience, campaign, content)
├── components/       # UI components (audience, content, dashboard, quiz, ui)
├── hooks/            # React Query hooks (audience-profile, campaign, content, quiz)
├── lib/
│   ├── agents/       # AI agent functions (audience, campaign, content generation)
│   ├── core/         # Domain layer (DI, domain models, repositories, services, plugins)
│   ├── orchestration/ # Agent pipeline, queue, circuit breaker, retry, cache
│   ├── db/           # Drizzle schema, migrations, connection
│   └── validations/  # Zod schemas
└── types/            # Shared TypeScript types
```

## Key Patterns

- **API routes** follow a response envelope pattern — check `agent-os/standards/api-routes.md`
- **Hooks** are thin React Query wrappers — check `agent-os/standards/hooks.md`
- **Tests** live in `__tests__/` directories co-located with the code they test
- **Components** use shadcn/ui primitives from `src/components/ui/`

## Before Coding

1. Read the relevant standard from `../agent-os/standards/`
2. Check existing patterns in the area you're modifying
3. Run `npm run test:run` after changes
