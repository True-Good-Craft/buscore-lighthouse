# Validation Guide — Referrer Capture Feature (v1.6.0)

## Live Validation Steps

### After Deploying v1.6.0

1. **Deploy the Worker with updated code**
   ```bash
   wrangler deploy
   ```

2. **Trigger traffic capture** (choose one):
   - **Option A**: Wait for the scheduled cron to run (if configured), OR
   - **Option B**: Call `/report` with valid `X-Admin-Token` header to trigger best-effort refresh capture:
     ```bash
     curl -H "X-Admin-Token: YOUR_TOKEN" https://your-lighthouse-worker/report
     ```

3. **Check Worker logs for referrer capture events**
   - Look for log lines prefixed with `[Referrer Capture]` and `[Traffic Totals]`
   - Expected sequence:
     ```
     [Traffic Totals] Fetching traffic totals for day YYYY-MM-DD
     [Traffic Totals] Retrieved: visits=..., requests=...
     [Referrer Capture] Starting referrer capture for day YYYY-MM-DD
     [Referrer Capture] Starting query for day YYYY-MM-DD
     [Referrer Capture] Query succeeded; N raw referrer row(s) returned from Cloudflare
     [Referrer Capture] Summary built: {"domain.com":150,"direct_or_unknown":100}
     [Referrer Capture] Capture succeeded for day YYYY-MM-DD; referrer_summary will be populated.
     [Traffic Totals] Upserting row...
     [Traffic Totals] Upsert complete for day YYYY-MM-DD
     ```

4. **Verify results in `/report`**
   - Call the report endpoint and check response structure:
     ```bash
     curl -H "X-Admin-Token: YOUR_TOKEN" https://your-lighthouse-worker/report | jq '.traffic'
     ```
   - Expected structure:
     ```json
     {
       "latest_day": {
         "day": "YYYY-MM-DD",
         "visits": 123,
         "requests": 456,
         "captured_at": "2026-03-24T10:30:00.000Z",
         "referrer_summary": "{\"example.com\":150,\"direct_or_unknown\":100}"
       },
       "last_7_days": { ... }
     }
     ```

5. **Inspect the referrer_summary field**
   - If populated: JSON string mapping referrer hostnames to request counts — **Success ✓**
   - If null: Referrer query failed but traffic totals still captured — **Check logs for error**

### Troubleshooting

| Log Pattern | Meaning | Action |
|---|---|---|
| `[Referrer Capture] Starting query...` but no `Query succeeded` | Query failed or returned no data | Check Cloudflare API token and zone tag; inspect error in logs |
| `Summary built: {"direct_or_unknown":...}` | Normalization working | Expected behavior for self-hosted traffic |
| `referrer_summary: null` in `/report` | Referrer capture failed but totals succeeded | This is correct non-blocking behavior |
| No `[Referrer Capture]` logs at all | Feature not running | Confirm code deployed (v1.6.0+) and capture path triggered |

### Key Validation Points

✓ **Traffic totals always captured** — Referrer failure does not block visits/requests  
✓ **Separate logs** — `[Traffic Totals]` and `[Referrer Capture]` prefixes clearly separate concerns  
✓ **Referrer_summary populated** — When capture succeeds, field contains compact top-10 JSON  
✓ **Graceful fallback** — When capture fails, field is null; no synthetic data  

### End-to-End Validation Checklist

- [ ] Deploy v1.6.0 to Worker
- [ ] Trigger capture via `/report` or wait for cron
- [ ] Inspect logs: `[Traffic Totals]` and `[Referrer Capture]` both present
- [ ] Confirm no errors in referrer capture logs
- [ ] Call `/report` and verify `referrer_summary` is populated (non-null JSON string)
- [ ] Parse referrer_summary JSON and confirm it contains referrer hostnames and counts
