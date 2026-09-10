# Coordinated outreach analytics release review

Prepared 2026-09-09 for Jamie's review. Branch `codex/kfh-outreach-analytics` in all three repositories. Implementation, local testing and branch/PR publication are authorized. Nothing here is a migration or production deployment receipt.

## Owner release sequence

1. Review and merge **Agent Smith 0.29.0**. Its existing main-push workflow tests, deploys and registers commands. Verify that deployment succeeds before changing the producer. The command definition itself is unchanged; this is consumer compatibility for old KFH reports and new 1.2.
2. Review and merge **Lighthouse 1.34.0**. Main publication uploads a Worker version; it does **not** promote production. Separately approve and apply exactly `migrations/0017_add_kfh_outreach_attribution.sql` to the existing Lighthouse `DB`, after confirming 0016 and the pending-migration inventory. Verify the new constrained table and successful migration receipt. Do not apply unrelated pending migrations. Then explicitly run the existing manual, main-only `Deploy Lighthouse to Cloudflare` GitHub workflow and verify its deployment receipt. Validate the protected KFH report 1.2 and the existing private command through owner-approved production verification.
3. Review and merge **Kingston Food Help 0.2.0** last. Its native Cloudflare Pages main integration builds and deploys with the existing analytics-enabled setting. Verify the deployed build, opt-out, navigation and saved/offline/update behavior; physical-phone handoff remains a release check. Then replace the Facebook/Reddit links in the outreach plan and record the edit date.

Do not merge all three simultaneously: a v3 website published before Lighthouse will have its new events dropped by the old parser. An old Smith reader cannot consume report 1.2. A new Lighthouse Worker without migration 0017 returns unavailable KFH reporting and cannot persist v3 batches.

## 1. Exact files and settings affected

The inventories below list the coordinated review files. No dependency version, binding, route, secret, schedule, DNS, Pages setting or GitHub workflow changes. Only package root version metadata changes in the lockfiles. No resource data or service-worker source changes.

### Kingston Food Help 0.1.0 → 0.2.0

- `CHANGELOG.md`
- `README.md`
- `SOT.md`
- `docs/ANALYTICS_POLICY.md`
- `docs/ANALYTICS_REVIEW.md`
- `docs/APPROVAL_REGISTER.md`
- `docs/OPERATIONS.md`
- `docs/OUTREACH_LOG.csv`
- `docs/OUTREACH_PLAN.md`
- `docs/OUTREACH_RELEASE.md`
- `package-lock.json`
- `package.json`
- `src/analytics.ts`
- `src/app.ts`
- `tests/e2e/analytics.spec.ts`
- `tests/e2e/server.mjs`
- `tests/unit/analytics.test.ts`

### Lighthouse 1.33.0 → 1.34.0

- `CHANGELOG.md`
- `KFH_ANALYTICS_CONTRACT.md`
- `KFH_OUTREACH_RELEASE.md`
- `OPERATIONS.md`
- `SOT.md`
- `contracts/kfh-v1/outreach-empty.json`
- `contracts/kfh-v1/outreach-sample.json`
- `contracts/kfh-v1/outreach-unavailable.json`
- `migrations/0017_add_kfh_outreach_attribution.sql`
- `package-lock.json`
- `package.json`
- `src/kfhAnalytics.ts`
- `src/kfhContract.ts`
- `src/kfhOutreachContract.ts`
- `tests/kfh-analytics.test.mjs`
- `tests/release-control.test.mjs`

### Agent Smith 0.28.2 → 0.29.0

- `CHANGELOG.md`
- `KFH_OUTREACH_RELEASE.md`
- `KFH_REPORTING_CONTRACT.md`
- `OPERATIONS.md`
- `SOT.md`
- `VERSION`
- `package-lock.json`
- `package.json`
- `src/contracts/kfh-v1/outreach-empty.json`
- `src/contracts/kfh-v1/outreach-sample.json`
- `src/contracts/kfh-v1/outreach-unavailable.json`
- `src/contracts/kfhContract.ts`
- `src/contracts/kfhOutreachContract.ts`
- `src/logic/kfhReport.ts`
- `tests/kfh_command.test.ts`
- `tests/kfh_runtime.test.ts`

## 2. Visible user impact

The website's existing privacy details explain public outreach action totals and completion of a click already sent when leaving the page. Calls and links still navigate immediately. Default-on collection, remembered off, GPC/DNT/operator suppression and the simple directory remain. Smith's existing ephemeral /kfh shows Recorded page loads, independent outreach loads/actions, unclassified history and campaign-tag coverage. Full UTC windows and outcome/privacy limitations stay visible. There are no new posts, public dashboards or scheduled reports.

## 3. Information and verification impact

No food-support record, location, hours, eligibility, warning, source URL or verification date changes. The supplied Lunch by George email and Reddit offer remain unverified submissions for a separate content review. Page-view counts mean app startup under the existing one-attempt semantics, not proof that resource data loaded. Historical actions cannot be reconstructed by joining old page labels. Zero history is distinct from query failure; sparse observations do not establish completeness or health.

## 4. Analytics and privacy impact

Strict ingestion v3 adds only three fixed public labels: reddit, outreach_2026_09 and post_02. Page starts and the four existing broad click types carry source/campaign/content labels; installation stays unattributed. The server stores independent daily day/event/dimension/value counts, never a combined source/campaign/content record or visitor journey. The existing table keeps overall counts and legacy-compatible page margins. A single atomic write prevents partial totals across the two tables. Report 1.2 reconciles every dimension and classified/unclassified count; old 1.0/1.1 contracts remain supported by Smith.

No provider/destination identity, search/filter/location context, URL/referrer text, timestamped raw events, user/session ID, new analytics cookie, fingerprinting or vendor. Existing rotating minute abuse counters and protected-report credentials remain. Aggregate retention is 400 days in both tables under the existing prune schedule. New event delivery remains best effort: a public 204 does not promise persistence, client labels/origins are not authentication, and privacy/blocking/offline use limits coverage.

## 5. Offline and cache impact

The service worker still ignores analytics and never caches, retries, queues or replays events. Initial hidden/offline startup attempts remain dropped without replay. Only already-started visible action requests get keepalive and survive pagehide/visibility loss; pending page/install requests abort. Opt-out/privacy suppression and offline events still abort pending requests. The 1,500ms timer depends on a runnable page realm and cannot guarantee a deadline after the browser freezes or destroys it. Website navigation and offline access do not await analytics. The generated precache revision changes with the new application bundle; saved old clients remain accepted through v1/v2 compatibility.

## 6. Verification and unresolved limits

Local checks cover strict payload rejection and privacy controls, new/legacy mixed history, constrained SQL and atomic rollback across both tables, 400-day pruning, missing migration, corrupt margins, exact producer/consumer fixtures, report limits and redirects, native Worker command execution, and delayed click-response completion through real same-tab/new-tab Chromium navigation. The navigation fixture uses a loopback collector with an explicit local-network permission; no traffic reaches the production collector. The full PWA suite covers first/repeat visits, offline launch, application/data update, rollback and stale-cache removal.

Final local verification: Lighthouse typecheck and 214 tests passed; Smith typecheck, governance, 126 tests (including the native Worker command) and local Worker bundle inspection passed; Kingston 91 unit tests, production build and 17 Chromium checks passed. PR descriptions will record remote CI results. Shared contract files and all seven fixtures match byte-for-byte. Local Windows execution uses Node 24.12.0 and the existing lockfile-resolved dependencies. Worktree dependency paths avoid a Vite issue with `#` in the original directory; no package versions changed. The Worker runtime needs execution outside the restricted sandbox. Local success is not a physical-phone/iOS test, remote migration receipt or production rollout proof. No production reports, D1 rows, secrets or Discord messages were read or written during implementation.

## 7. External effects and verified release controls

Read-only control-plane checks on 2026-09-09 confirmed the Pages production branch is main, preview branches include only review/*, and the analytics tag/token settings are null. This codex/ review branch does not match that Pages preview rule. Lighthouse's main and non-main Workers Builds triggers both use `npx wrangler versions upload`; branch publication can create a preview/version, not an active-production promotion. Smith has no Workers Builds trigger and uses the checked-in GitHub main-push deployment workflow. Recheck if settings change before release.

Canonical Lighthouse account: `eb1a8dd5723031d94e57642e3eaaebda`; Worker `buscore-lighthouse`; D1 `lighthouse`, binding `DB`, database ID `e46f2daa-7e97-45a3-9bf0-49003a42850c`. The new table is in the existing database; no new Cloudflare resource is created by these review branches.

Owner review alone does not run a migration or dispatch Lighthouse production. Merging Smith/Kingston starts their existing deployment automation; merging Lighthouse uploads only. Branch pushes and PR creation are the only publication actions in this work. Existing automation may record checks and a Lighthouse preview upload. No merge, tag, release, settings/secret change, migration, production promotion or outreach message is performed by the preparer.

## Rollback

Review exact immutable versions/commits before executing rollback. Roll the website back to v2 first, then Lighthouse to its compatible old Worker if needed; Smith 0.29.0 accepts old reports. Roll Smith back only after the producer again serves an older report. Migration 0017 leaves the old table/constraints untouched, and new labels have legacy fallbacks there. Never relabel historic actions using old page-view attribution.

Worker rollback does not roll back D1. Old Lighthouse versions cannot prune the new table: include a separately approved purge of the unused outreach table or continued retention maintenance if that rollback persists. Do not drop or modify the original daily table. A later v3 rollout after a purge must show those earlier actions as unclassified. Keep the normal website application-update/rollback/cache verification and saved privacy preferences.

## References

- [Fetch keepalive](https://developer.mozilla.org/en-US/docs/Web/API/Request/keepalive) describes the browser transport feature; it is not a guarantee of delivery.
- [D1 prepared-statement batch](https://developers.cloudflare.com/d1/worker-api/d1-database/#batch) describes transactional batch behavior. Local SQLite fixtures test the checked-in SQL; they do not apply it to Cloudflare.
