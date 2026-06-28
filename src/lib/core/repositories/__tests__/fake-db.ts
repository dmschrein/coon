/**
 * Shared fake Drizzle query-builder used by repository unit tests.
 *
 * It fakes the fluent chain (.select/.from/.where/.limit/.orderBy/.offset/
 * .groupBy/.innerJoin/.set/.values/.returning/.onConflictDoUpdate/
 * .onConflictDoNothing) and resolves queued rows when the chain is awaited.
 *
 * Rows are queued FIFO per chain kind (select/insert/update). When a repository
 * method issues several queries of the same kind, push rows in call order.
 *
 * This file lives inside __tests__ so it is excluded from coverage.
 */

export type FakeRow = Record<string, unknown>;
type ChainKind = "select" | "insert" | "update" | "delete";

export interface FakeCaptured {
  insertValues: unknown;
  insertValuesAll: unknown[];
  updateSet: unknown;
  updateSets: unknown[];
  updateWheres: unknown[];
  deleteCalled: boolean;
  onConflictDoUpdate: unknown;
  onConflictDoNothing: unknown;
}

export interface FakeDbHandle {
  db: unknown;
  queue: {
    select: FakeRow[][];
    insert: FakeRow[][];
    update: FakeRow[][];
  };
  captured: FakeCaptured;
  /** Throw this error on the NEXT insert call (used for unique-violation paths). */
  insertError: { value: unknown };
}

export function makeFakeDb(): FakeDbHandle {
  const queue = {
    select: [] as FakeRow[][],
    insert: [] as FakeRow[][],
    update: [] as FakeRow[][],
  };
  const captured: FakeCaptured = {
    insertValues: undefined,
    insertValuesAll: [],
    updateSet: undefined,
    updateSets: [],
    updateWheres: [],
    deleteCalled: false,
    onConflictDoUpdate: undefined,
    onConflictDoNothing: undefined,
  };
  const insertError: { value: unknown } = { value: undefined };

  function chain(rows: FakeRow[] | undefined, kind: ChainKind) {
    const c: Record<string, (...args: unknown[]) => unknown> = {};
    for (const m of [
      "from",
      "where",
      "limit",
      "offset",
      "orderBy",
      "groupBy",
      "innerJoin",
      "leftJoin",
      "set",
      "values",
      "returning",
      "onConflictDoUpdate",
      "onConflictDoNothing",
    ]) {
      c[m] = (...args: unknown[]) => {
        if (kind === "insert" && m === "values") {
          captured.insertValues = args[0];
          captured.insertValuesAll.push(args[0]);
        }
        if (kind === "update" && m === "set") {
          captured.updateSet = args[0];
          captured.updateSets.push(args[0]);
        }
        if (kind === "update" && m === "where") {
          captured.updateWheres.push(args[0]);
        }
        if (m === "onConflictDoUpdate") captured.onConflictDoUpdate = args[0];
        if (m === "onConflictDoNothing") captured.onConflictDoNothing = args[0];
        return c;
      };
    }
    (c as unknown as PromiseLike<FakeRow[]>).then = ((
      onfulfilled?:
        | ((value: FakeRow[]) => unknown | PromiseLike<unknown>)
        | null,
      onrejected?: ((reason: unknown) => unknown) | null
    ) => {
      if (kind === "insert" && insertError.value !== undefined) {
        const err = insertError.value;
        insertError.value = undefined;
        return Promise.reject(err).then(
          onfulfilled ?? undefined,
          onrejected ?? undefined
        );
      }
      return Promise.resolve(rows ?? []).then(
        onfulfilled ?? undefined,
        onrejected ?? undefined
      );
    }) as PromiseLike<FakeRow[]>["then"];
    return c;
  }

  const db = {
    select: () => chain(queue.select.shift(), "select"),
    insert: () => chain(queue.insert.shift(), "insert"),
    update: () => chain(queue.update.shift(), "update"),
    delete: () => {
      captured.deleteCalled = true;
      return chain(undefined, "delete");
    },
  };

  return { db, queue, captured, insertError };
}
