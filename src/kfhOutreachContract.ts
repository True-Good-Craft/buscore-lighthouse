// Public outreach labels only. Rows are separate daily margins, never visitor journeys.
export const KFH_LEGACY_SOURCES = ["direct_unknown", "facebook", "community", "search", "other"] as const;
export const KFH_LEGACY_CAMPAIGNS = ["none", "launch_2026_09"] as const;
export const KFH_LEGACY_CONTENTS = ["none", "post_01", "poster_01"] as const;
export const KFH_OUTREACH_SOURCES = [...KFH_LEGACY_SOURCES, "reddit"] as const;
export const KFH_OUTREACH_CAMPAIGNS = [...KFH_LEGACY_CAMPAIGNS, "outreach_2026_09"] as const;
export const KFH_OUTREACH_CONTENTS = [...KFH_LEGACY_CONTENTS, "post_02"] as const;
export const KFH_ATTRIBUTABLE_KEYS = ["page_views", "resource_calls", "help_211", "directions", "official_sources"] as const;
export type AttributableKey = typeof KFH_ATTRIBUTABLE_KEYS[number];
export type OutreachCounts = Record<AttributableKey, number>;
export type OutreachRow = { event: AttributableKey; value: string; count: number };
export type Outreach = {
  classified: OutreachCounts;
  unclassified: OutreachCounts;
  sources: OutreachRow[];
  campaigns: OutreachRow[];
  contents: OutreachRow[];
};

const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const exact = (v: unknown, keys: readonly string[]): v is Record<string, unknown> => object(v)
  && Object.keys(v).length === keys.length && keys.every(key => Object.prototype.hasOwnProperty.call(v, key));
const count = (v: unknown): v is number => typeof v === "number" && Number.isSafeInteger(v) && v >= 0;

export function isKfhOutreach(value: unknown, totals: OutreachCounts): value is Outreach {
  if (!exact(value, ["classified", "unclassified", "sources", "campaigns", "contents"])) return false;
  if (!exact(value.classified, KFH_ATTRIBUTABLE_KEYS) || !exact(value.unclassified, KFH_ATTRIBUTABLE_KEYS)) return false;
  for (const event of KFH_ATTRIBUTABLE_KEYS) {
    const known = value.classified[event], unknown = value.unclassified[event];
    if (!count(known) || !count(unknown) || !Number.isSafeInteger(known + unknown) || known + unknown !== totals[event]) return false;
  }
  for (const [key, allowed] of [["sources", KFH_OUTREACH_SOURCES], ["campaigns", KFH_OUTREACH_CAMPAIGNS], ["contents", KFH_OUTREACH_CONTENTS]] as const) {
    const rows = value[key];
    if (!Array.isArray(rows) || rows.length > KFH_ATTRIBUTABLE_KEYS.length * allowed.length) return false;
    const seen = new Set<string>();
    const sums = Object.fromEntries(KFH_ATTRIBUTABLE_KEYS.map(event => [event, 0])) as OutreachCounts;
    for (const row of rows) {
      if (!exact(row, ["event", "value", "count"]) || typeof row.event !== "string"
        || !(KFH_ATTRIBUTABLE_KEYS as readonly string[]).includes(row.event) || typeof row.value !== "string"
        || !(allowed as readonly string[]).includes(row.value) || !count(row.count) || row.count === 0) return false;
      const id = row.event + ":" + row.value;
      if (seen.has(id)) return false;
      seen.add(id); sums[row.event as AttributableKey] += row.count;
    }
    for (const event of KFH_ATTRIBUTABLE_KEYS) if (!Number.isSafeInteger(sums[event]) || sums[event] !== value.classified[event]) return false;
  }
  return true;
}
