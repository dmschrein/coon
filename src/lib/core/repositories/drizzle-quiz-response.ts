/**
 * Drizzle Quiz Response Repository - Data access for quiz responses.
 */

import { eq, desc } from "drizzle-orm";
import { quizResponses } from "@/lib/db/schema";
import type { QuizResponseRepository } from "./interfaces";
import type { QuizResponse } from "@/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DrizzleDb = any;

export class DrizzleQuizResponseRepository implements QuizResponseRepository {
  constructor(private db: DrizzleDb) {}

  async findLatestByUserId(
    userId: string
  ): Promise<{ id: string; responseData: QuizResponse } | null> {
    const [row] = await this.db
      .select()
      .from(quizResponses)
      .where(eq(quizResponses.userId, userId))
      .orderBy(desc(quizResponses.completedAt))
      .limit(1);

    if (!row) return null;

    return {
      id: row.id,
      responseData: row.responseData as QuizResponse,
    };
  }
}
