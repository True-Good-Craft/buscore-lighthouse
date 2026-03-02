# True Good Craft Metrics Ledger

## System Identity

Lighthouse is formally defined as:

**True Good Craft Metrics Ledger — Daily Aggregated Metrics Engine**

This system is not telemetry.
This system does not collect user data.
This system does not track devices, sessions, IP addresses, or behavioral patterns.

It records only documented, server-side, aggregate activity counts triggered by explicit system events.

All metrics are:

* Publicly documented
* Aggregated by day
* Monotonic (increment-only)
* Non-identifying
* Deterministic

---

# 1. Design Principles

## 1.1 Determinism

* No sampling
* No inferred metrics
* No background collection
* No hidden client beacons
* No retroactive data mutation

If a metric increments, it increments explicitly via defined code paths.

## 1.2 Aggregated-Only Model

The ledger stores only daily totals.

It does NOT store:

* Per-request logs
* User identifiers
* IP addresses
* Session tokens
* Payload data
* Device fingerprints

Each row represents:

```
(day, metric, count)
```

Nothing more.

## 1.3 Monotonic Integrity

* Counts only increase.
* No decrement operations.
* No overwriting historical values.
* No compaction that alters historical data.

If an error occurs, it increments the `errors` metric.

## 1.4 Radical Transparency

All of the following are public:

* Metric names
* Trigger conditions
* Storage model
* Failure behavior
* Reporting logic
* Schema

The repository remains open source.
The documentation remains public.

---

# 2. Storage Model

## 2.1 Database: Cloudflare D1

Single table:

```
metrics_daily (
  day TEXT NOT NULL,
  metric TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, metric)
)
```

This schema allows:

* Unlimited future metrics
* No ALTER TABLE per new metric
* Clean daily aggregation
* Efficient range queries

## 2.2 Why Daily Only?

* 1 row per metric per day
* ~365 rows per metric per year
* Extremely small footprint
* No need for weekly/monthly rollups

Weekly and monthly totals are computed at query time.

No infinite event log is maintained.

---

# 3. Metric Definition Standard

Every metric added must include a documented specification block in SOT.

Template:

```
Metric Name:
Trigger:
Authentication Required:
Failure Behavior:
Included In Reports:
Monotonic:
External Dependencies:
Public Visibility:
```

Example:

```
Metric Name: calculations
Trigger: POST /pg/ping
Authentication Required: Yes (X-PG-Key + Origin match)
Failure Behavior: 500 if D1 write fails
Included In Reports: /report + daily Discord summary
Monotonic: Yes
External Dependencies: None
Public Visibility: Included in public metrics board
```

---

# 4. Reporting Model

## 4.1 Report Endpoint

`GET /report` returns aggregated totals for:

* Today
* Yesterday
* Last 7 days
* Month to date

Metrics are dynamically grouped by `metric` column.

No hardcoded metric names in report logic.

## 4.2 Scheduled Summary

Cron job generates daily summary message containing:

* Yesterday totals
* Last 7 totals
* Month-to-date totals

Metrics are enumerated dynamically from query results.

---

# 5. Price Guard Integration

Price Guard increments:

```
Metric: calculations
```

via:

```
POST /pg/ping
```

Behavior:

* Header-based shared secret validation
* Static origin validation
* No payload storage
* No client dependency on success
* Increment daily `calculations` metric

Failure does not affect Price Guard functionality.

---

# 6. Future Extension Strategy

## 6.1 Adding New Metrics

To add a metric:

1. Define metric in SOT using standard template.
2. Implement increment via shared helper `incrementMetric(day, metric)`.
3. No schema change required.
4. Automatically appears in report and Discord summary.

## 6.2 External Data Ingestion

If external systems are queried (e.g., web analytics API),
only daily summarized totals are stored.

No raw event ingestion.
No third-party data retention.

---

# 7. Public Metrics Board Concept

A public-facing page may display:

* Date
* Metric
* Count
* Aggregates (7-day / MTD)

This page shows exactly what the Metrics Ledger stores.

No hidden metrics.
No internal-only counters (except security-sensitive ones, if any).

---

# 8. What This System Is NOT

The Metrics Ledger is not:

* Telemetry
* Behavioral analytics
* Tracking infrastructure
* Device monitoring
* Usage fingerprinting
* Marketing analytics

It is a deterministic, documented aggregate counter system.

---

# 9. Corporate Framing

Official description:

> The True Good Craft Metrics Ledger records daily aggregate service activity counts. It stores no personal data, no user identifiers, and no behavioral telemetry. All metrics are publicly documented and transparently reported.

---

# 10. Implementation Roadmap

1. Migrate schema to (day, metric, count) model.
2. Refactor increment logic to metric-based helper.
3. Remove KV usage entirely.
4. Update /report aggregation queries.
5. Update scheduled Discord summary to dynamic metric listing.
6. Implement Price Guard /pg/ping integration to D1.
7. Add SOT metric documentation blocks.
8. Create Public Metrics Board page.

---

End of Master Plan.
