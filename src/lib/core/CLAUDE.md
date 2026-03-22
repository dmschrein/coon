# Core Domain Layer

## Standard

Read `agent-os/standards/database.md`, `agent-os/standards/types.md`, and `agent-os/standards/validation.md` before modifying this layer.

## Architecture

This follows a clean architecture pattern with dependency injection:

```
core/
├── di/           # Dependency injection container
├── domain/       # Domain models (pure business logic, no DB dependency)
├── plugins/      # Plugin system (agent-plugin extends agent capabilities)
├── repositories/  # Drizzle ORM implementations (data access)
└── services/     # Business logic orchestrating domain + repositories
```

## Key Concepts

- **Domain models** (`domain/`) — pure TypeScript classes/functions with business rules. No imports from DB or framework layers.
- **Repository interfaces** (`repositories/interfaces.ts`) — abstract data access contracts. Implementations are Drizzle-based (`drizzle-*.ts`).
- **Services** (`services/`) — orchestrate domain logic and repository calls. Injected via DI container.
- **DI container** (`di/container.ts`) — wires repositories and services together. Use this to resolve dependencies, never instantiate directly.
- **Plugins** (`plugins/`) — extend agent behavior without modifying agent code.

## Rules

- Domain models must not import from `db/`, `repositories/`, or any framework
- Services depend on repository interfaces, not implementations
- New repositories must implement the interface in `repositories/interfaces.ts`
- Tests mock at the repository interface boundary
