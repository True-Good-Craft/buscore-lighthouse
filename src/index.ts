export interface Env {
  DB: D1Database;
  MANIFEST_URL: string;
  DISCORD_WEBHOOK_URL: string;
  ADMIN_TOKEN: string;
}

// Returns a UTC date as YYYY-MM-DD
function utcDay(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

// Returns the first day of the UTC month containing the given date, as YYYY-MM-DD
function utcMonthStart(date: Date = new Date()): string {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10);
}

// Upsert-increment a single counter column for the given day
async function incrementCounter(
  db: D1Database,
  day: string,
  column: "update_checks" | "downloads" | "errors"
): Promise<void> {
  await db
    .prepare(
      "INSERT INTO metrics_daily(day, update_checks, downloads, errors) VALUES (?,0,0,0) ON CONFLICT(day) DO NOTHING"
    )
    .bind(day)
    .run();
  await db
    .prepare(`UPDATE metrics_daily SET ${column} = ${column} + 1 WHERE day = ?`)
    .bind(day)
    .run();
}

// Fetch manifest JSON; returns parsed object or null on failure
async function fetchManifest(url: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

// Aggregate totals for a range of days
async function queryTotals(
  db: D1Database,
  startDay: string,
  endDay: string
): Promise<{ update_checks: number; downloads: number; errors: number }> {
  const row = await db
    .prepare(
      "SELECT COALESCE(SUM(update_checks),0) AS update_checks, COALESCE(SUM(downloads),0) AS downloads, COALESCE(SUM(errors),0) AS errors FROM metrics_daily WHERE day >= ? AND day <= ?"
    )
    .bind(startDay, endDay)
    .first<{ update_checks: number; downloads: number; errors: number }>();
  return row ?? { update_checks: 0, downloads: 0, errors: 0 };
}

export default {
  // ─── HTTP handler ───────────────────────────────────────────────────────────
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const today = utcDay();

    // GET /update/check
    if (request.method === "GET" && url.pathname === "/update/check") {
      let counterError = false;
      try {
        await incrementCounter(env.DB, today, "update_checks");
      } catch {
        counterError = true;
      }

      const manifest = await fetchManifest(env.MANIFEST_URL);

      if (counterError) {
        try {
          await incrementCounter(env.DB, today, "errors");
        } catch {
          // best-effort
        }
      }

      if (!manifest) {
        return Response.json({ ok: false, error: "manifest_unavailable" }, { status: 503 });
      }

      return new Response(JSON.stringify(manifest), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // GET /download/latest
    if (request.method === "GET" && url.pathname === "/download/latest") {
      let counterError = false;
      try {
        await incrementCounter(env.DB, today, "downloads");
      } catch {
        counterError = true;
      }

      const manifest = await fetchManifest(env.MANIFEST_URL);

      if (counterError) {
        try {
          await incrementCounter(env.DB, today, "errors");
        } catch {
          // best-effort
        }
      }

      if (!manifest) {
        return Response.json({ ok: false, error: "manifest_unavailable" }, { status: 503 });
      }

      const latestUrl =
        (manifest as any)?.latest?.download?.url ??
        (manifest as any)?.latest?.url;
      if (typeof latestUrl !== "string" || !latestUrl) {
        return Response.json({ ok: false, error: "manifest_unavailable" }, { status: 503 });
      }

      return Response.redirect(latestUrl, 302);
    }

    // GET /report  (protected)
    if (request.method === "GET" && url.pathname === "/report") {
      const token = request.headers.get("X-Admin-Token");
      if (!env.ADMIN_TOKEN || token !== env.ADMIN_TOKEN) {
        return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
      }

      const todayDate = new Date();
      const yesterdayDate = new Date(todayDate);
      yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1);

      const yesterday = utcDay(yesterdayDate);
      const sevenDaysAgoDate = new Date(todayDate);
      sevenDaysAgoDate.setUTCDate(sevenDaysAgoDate.getUTCDate() - 6);
      const sevenDaysAgo = utcDay(sevenDaysAgoDate);
      const monthStart = utcMonthStart(todayDate);

      const [todayTotals, yesterdayTotals, last7, mtd] = await Promise.all([
        queryTotals(env.DB, today, today),
        queryTotals(env.DB, yesterday, yesterday),
        queryTotals(env.DB, sevenDaysAgo, today),
        queryTotals(env.DB, monthStart, today),
      ]);

      return Response.json({
        today: todayTotals,
        yesterday: yesterdayTotals,
        last_7_days: last7,
        month_to_date: mtd,
      });
    }

    return Response.json({ ok: false, error: "not_found" }, { status: 404 });
  },

  // ─── Scheduled cron ─────────────────────────────────────────────────────────
  async scheduled(_event: ScheduledEvent, env: Env): Promise<void> {
    const todayDate = new Date();
    const today = utcDay(todayDate);

    const yesterdayDate = new Date(todayDate);
    yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1);
    const yesterday = utcDay(yesterdayDate);

    const sevenDaysAgoDate = new Date(todayDate);
    sevenDaysAgoDate.setUTCDate(sevenDaysAgoDate.getUTCDate() - 6);
    const sevenDaysAgo = utcDay(sevenDaysAgoDate);

    const monthStart = utcMonthStart(todayDate);

    let yesterdayTotals: { update_checks: number; downloads: number; errors: number };
    let last7Totals: { update_checks: number; downloads: number; errors: number };
    let mtdTotals: { update_checks: number; downloads: number; errors: number };

    try {
      [yesterdayTotals, last7Totals, mtdTotals] = await Promise.all([
        queryTotals(env.DB, yesterday, yesterday),
        queryTotals(env.DB, sevenDaysAgo, today),
        queryTotals(env.DB, monthStart, today),
      ]);
    } catch {
      try {
        await incrementCounter(env.DB, today, "errors");
      } catch {
        // best-effort
      }
      return;
    }

    const message = [
      `📊 **BUS Core Lighthouse — Daily Report (${yesterday})**`,
      "",
      `**Yesterday (${yesterday})**`,
      `  • Update checks: ${yesterdayTotals.update_checks}`,
      `  • Downloads: ${yesterdayTotals.downloads}`,
      `  • Errors: ${yesterdayTotals.errors}`,
      "",
      `**Last 7 days (${sevenDaysAgo} → ${today})**`,
      `  • Update checks: ${last7Totals.update_checks}`,
      `  • Downloads: ${last7Totals.downloads}`,
      `  • Errors: ${last7Totals.errors}`,
      "",
      `**Month to date (${monthStart} → ${today})**`,
      `  • Update checks: ${mtdTotals.update_checks}`,
      `  • Downloads: ${mtdTotals.downloads}`,
      `  • Errors: ${mtdTotals.errors}`,
    ].join("\n");

    try {
      const res = await fetch(env.DISCORD_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: message }),
      });
      if (!res.ok) throw new Error(`Discord webhook returned ${res.status}`);
    } catch {
      try {
        await incrementCounter(env.DB, today, "errors");
      } catch {
        // best-effort
      }
    }
  },
};
