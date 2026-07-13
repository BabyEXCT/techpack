// Lightweight D1 data layer replacing Prisma.
// Provides a small subset of Prisma-style CRUD so existing route files keep working.
// ponytail: supports findMany/findUnique/create/update/upsert/delete + simple where/include/orderBy.
// Upgrade to a real query builder (drizzle/d1-orm) when relations get complex.

type Json = string | number | boolean | null | Record<string, unknown> | Json[];

interface D1Like {
  prepare(sql: string): {
    bind(...values: unknown[]): {
      all(): Promise<{ results: Record<string, Json>[] }>;
      first(): Promise<Record<string, Json> | null>;
      run(): Promise<{ meta: { last_row_id?: number } }>;
    };
  };
}

declare const cloudflare: { env: { DB: D1Like } } | undefined;

const isCloudflare = typeof cloudflare !== "undefined" && !!cloudflare?.env?.DB;

// In-memory store for local dev (Node.js). Not persistent — fine for quick testing.
const memory = new Map<string, Record<string, Json>[]>();

function col<T extends Record<string, Json>>(rows: { results: T[] } | null): T[] {
  return rows?.results ?? [];
}

function whereClause(where: Record<string, unknown> | undefined): {
  sql: string;
  params: unknown[];
} {
  if (!where || Object.keys(where).length === 0) return { sql: "", params: [] };
  const params: unknown[] = [];
  const clauses = Object.entries(where).map(([key, raw]) => {
    if (raw && typeof raw === "object") {
      const obj = raw as Record<string, unknown>;
      if ("not" in obj) {
        params.push(obj.not);
        return `"${key}" IS NOT ?`;
      }
      if ("in" in obj && Array.isArray(obj.in)) {
        const list = obj.in as unknown[];
        list.forEach((v) => params.push(v));
        const ph = list.map(() => "?").join(", ");
        return `"${key}" IN (${ph})`;
      }
      if ("gte" in obj) {
        params.push(obj.gte);
        return `"${key}" >= ?`;
      }
      if ("lte" in obj) {
        params.push(obj.lte);
        return `"${key}" <= ?`;
      }
      if ("lt" in obj) {
        params.push(obj.lt);
        return `"${key}" < ?`;
      }
      if ("gt" in obj) {
        params.push(obj.gt);
        return `"${key}" > ?`;
      }
      if ("contains" in obj) {
        params.push(`%${obj.contains}%`);
        return `"${key}" LIKE ?`;
      }
    }
    params.push(raw as unknown);
    return `"${key}" = ?`;
  });
  return { sql: ` WHERE ${clauses.join(" AND ")}`, params };
}

function orderClause(orderBy: Record<string, string> | undefined): string {
  if (!orderBy) return "";
  const parts = Object.entries(orderBy).map(([k, dir]) => `"${k}" ${dir.toUpperCase()}`);
  return ` ORDER BY ${parts.join(", ")}`;
}

async function runQuery(
  sql: string,
  params: unknown[]
): Promise<{ results: Record<string, Json>[] }> {
  if (isCloudflare) {
    return cloudflare!.env.DB.prepare(sql).bind(...params).all();
  }
  // Local in-memory fallback — very small, for dev only.
  const table = sql.match(/FROM "([^"]+)"/)?.[1] ?? "";
  const rows = memory.get(table) ?? [];
  let result = [...rows];
  const m = sql.match(/WHERE (.+)/i);
  if (m) {
    const cond = m[1].replace(/ORDER BY.*/i, "").trim();
    // naive parsing for dev fallback; Cloudflare uses real D1
    const andParts = cond.split(/\s+AND\s+/i);
    for (const part of andParts) {
      const trimmed = part.trim();
      const key = (trimmed.match(/"([^"]+)"/)?.[1] ?? "").replace(/"/g, "");
      if (trimmed.includes("IS NOT")) {
        const v = params[0];
        result = result.filter((r) => r[key] !== v);
      } else if (trimmed.includes("IN")) {
        const v = params[0];
        result = result.filter((r) => String(r[key]) === String(v));
      } else if (trimmed.includes("LIKE")) {
        const v = String(params[0]).replace(/%/g, "");
        result = result.filter((r) => String(r[key] ?? "").includes(v));
      } else if (trimmed.includes(">=")) {
        const v = params[0];
        result = result.filter((r) => (r[key] as number) >= (v as number));
      } else if (trimmed.includes("<=")) {
        const v = params[0];
        result = result.filter((r) => (r[key] as number) <= (v as number));
      } else if (trimmed.includes("<")) {
        const v = params[0];
        result = result.filter((r) => (r[key] as number) < (v as number));
      } else if (trimmed.includes(">")) {
        const v = params[0];
        result = result.filter((r) => (r[key] as number) > (v as number));
      } else {
        const v = params[0];
        result = result.filter((r) => String(r[key]) === String(v));
      }
    }
  }
  if (sql.toUpperCase().includes("ORDER BY")) {
    const ob = sql.match(/ORDER BY "([^"]+)" (ASC|DESC)/i);
    if (ob) {
      const k = ob[1];
      const dir = ob[2] === "DESC" ? -1 : 1;
      result.sort((a, b) => (a[k]! < b[k]! ? -1 : a[k]! > b[k]! ? 1 : 0) * dir);
    }
  }
  if (sql.toUpperCase().startsWith("SELECT")) return { results: result };
  if (sql.toUpperCase().startsWith("INSERT")) {
    const cols = [...sql.matchAll(/"([^"]+)"/g)].map((x) => x[1]).filter((c) => c !== table);
    const obj: Record<string, Json> = {};
    cols.forEach((c, i) => (obj[c] = params[i] as Json));
    rows.push(obj);
    memory.set(table, rows);
    return { results: [obj] };
  }
  if (sql.toUpperCase().startsWith("UPDATE")) {
    const setCols = [...sql.matchAll(/SET "([^"]+)" = \?/g)].map((x) => x[1]);
    const idIndex = params.length - 1;
    const id = params[idIndex];
    const target = rows.find((r) => r.id === id);
    if (target) setCols.forEach((c, i) => (target[c] = params[i] as Json));
    return { results: target ? [target] : [] };
  }
  if (sql.toUpperCase().startsWith("DELETE")) {
    const id = params[0];
    memory.set(
      table,
      rows.filter((r) => r.id !== id)
    );
    return { results: [] };
  }
  return { results: [] };
}

function makeTable(table: string) {
  return {
    async findMany(opts: { where?: Record<string, unknown>; include?: Record<string, boolean>; orderBy?: Record<string, string> } = {}) {
      const w = whereClause(opts.where);
      const sql = `SELECT * FROM "${table}"${w.sql}${orderClause(opts.orderBy)}`;
      const rows = col(await runQuery(sql, w.params));
      if (opts.include) {
        for (const rel of Object.keys(opts.include)) {
          if (!opts.include[rel]) continue;
          const relTable = rel.endsWith("s") ? rel.slice(0, -1) : rel;
          for (const row of rows) {
            const fk = `${table.toLowerCase().replace(/s$/, "")}Id` as keyof typeof row;
            const rid = row[fk];
            if (!rid) continue;
            const relRows = col(
              await runQuery(`SELECT * FROM "${relTable}" WHERE "id" = ?`, [rid])
            );
            (row as Record<string, unknown>)[rel] = relRows[0] ?? null;
          }
        }
      }
      return rows;
    },
    async findUnique(opts: { where: Record<string, unknown> }) {
      const w = whereClause(opts.where);
      const rows = col(await runQuery(`SELECT * FROM "${table}"${w.sql}`, w.params));
      return rows[0] ?? null;
    },
    async findFirst(opts: { where?: Record<string, unknown>; orderBy?: Record<string, string> } = {}) {
      const rows = await this.findMany(opts);
      return rows[0] ?? null;
    },
    async create(opts: { data: Record<string, unknown> }) {
      const keys = Object.keys(opts.data);
      const vals = Object.values(opts.data);
      const cols = keys.map((k) => `"${k}"`).join(", ");
      const ph = vals.map(() => "?").join(", ");
      const rows = col(
        await runQuery(`INSERT INTO "${table}" (${cols}) VALUES (${ph})`, vals)
      );
      return rows[0];
    },
    async update(opts: { where: Record<string, unknown>; data: Record<string, unknown> }) {
      const w = whereClause(opts.where);
      const setCols = Object.keys(opts.data);
      const setSql = setCols.map((k) => `"${k}" = ?`).join(", ");
      const params = [...Object.values(opts.data), ...w.params];
      const rows = col(
        await runQuery(`UPDATE "${table}" SET ${setSql}${w.sql}`, params)
      );
      return rows[0];
    },
    async upsert(opts: { where: Record<string, unknown>; update: Record<string, unknown>; create: Record<string, unknown> }) {
      const existing = await this.findUnique(opts);
      if (existing) return this.update({ where: opts.where, data: opts.update });
      return this.create({ data: opts.create });
    },
    async delete(opts: { where: Record<string, unknown> }) {
      const id = opts.where.id as string;
      await runQuery(`DELETE FROM "${table}" WHERE "id" = ?`, [id]);
      return { id };
    },
    async count(opts: { where?: Record<string, unknown> } = {}) {
      const w = whereClause(opts.where);
      const rows = col(await runQuery(`SELECT * FROM "${table}"${w.sql}`, w.params));
      return rows.length;
    },
  };
}

export const db = {
  user: makeTable("User"),
  customer: makeTable("Customer"),
  invoiceCounter: makeTable("InvoiceCounter"),
  invoice: makeTable("Invoice"),
  payment: makeTable("Payment"),
  job: makeTable("Job"),
  rosterItem: makeTable("RosterItem"),
  uploadedFile: makeTable("UploadedFile"),
  generatedOutput: makeTable("GeneratedOutput"),
  messageTemplate: makeTable("MessageTemplate"),
};
