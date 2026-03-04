import "@testing-library/jest-dom/vitest";

// Stub environment variables for tests
process.env.ANTHROPIC_API_KEY = "sk-ant-test-key-for-testing";
process.env.DATABASE_URL =
  "postgresql://test:test@localhost:5432/test_db?sslmode=disable";
process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_test_123";
process.env.CLERK_SECRET_KEY = "sk_test_123";
