import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export default async function Home() {
  const clerkUser = await currentUser();

  if (clerkUser) {
    // Check if user has completed onboarding
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, clerkUser.id))
      .limit(1);

    if (user?.onboardingCompleted) {
      redirect("/dashboard");
    } else {
      redirect("/quiz");
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 dark:bg-black">
      <main className="flex max-w-2xl flex-col items-center gap-8 px-6 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-5xl">
          Community Builder
        </h1>
        <p className="text-lg leading-8 text-zinc-600 dark:text-zinc-400">
          Build an engaged community before your product launch. Complete a
          quick quiz about your product, and our AI will generate tailored
          audience profiles and content you can start posting today.
        </p>
        <div className="flex gap-4">
          <Link
            href="/sign-up"
            className="rounded-full bg-zinc-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            Get Started
          </Link>
          <Link
            href="/sign-in"
            className="rounded-full border border-zinc-300 px-6 py-3 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-800"
          >
            Sign In
          </Link>
        </div>
      </main>
    </div>
  );
}
