# Corn Souls TEST developer inbox

Status: receiving project URL and publishable key configured. Owner reports setup
SQL succeeded. Developer Auth user/allowlist and hosted access/delivery tests are
still pending; local client tests pass.
LIVE Alpha v1.96 is not changed by these files.

## Connect the receiving project

1. Finish the Supabase plugin's account authorization. The agent must have project,
   SQL and advisor tools available; installing the plugin alone does not confirm access.
2. Choose a Supabase TEST project. Review its plan before creating a paid resource.
3. Apply `inbox-schema.sql` in that project, then execute
   `inbox-security-test.sql`. The security test inserts disposable fixtures inside a
   transaction and rolls them back. Do not claim database verification until it runs.
4. Create a developer user in **that project's Authentication** and add its UUID to
   `cs_report_admins` using the commented SQL at the bottom of the schema. This is a
   game inbox login, separate from the Supabase dashboard login. The owner should
   set their password directly; never commit it or paste it into chat.
5. Put the project's HTTPS API URL and **publishable key** in `inbox-config.json`.
   These two values are public. Never use a service-role/secret key in this file.
6. Run Supabase security/performance advisors and resolve relevant findings.
7. Test through the real API: public report submission, retry without duplication,
   anonymous read denial, non-admin read/update denial, developer sign-in,
   screenshot read, and read/resolved updates. Verify account revocation too.
8. Run all three local validation scripts, commit TEST files, and verify Pages
   deployment. Finally test sending on iPhone and reading on another device.

## Player and developer flow

- When configured, **Leave a note → Send report** saves locally, then uploads the
  report and checked screenshot. The interface only confirms receipt after the
  backend returns the report ID. Failed uploads remain local for explicit retry.
- Older local notes have **Send to developer inbox** buttons. They are never
  silently uploaded. Report IDs are persisted before uploading for safe retries.
- **Debug → Developer Inbox** signs in an approved developer. Reports can be
  filtered by unread/all/resolved, read with screenshots, and resolved/reopened.
- Developer tokens stay in memory and expire with the session. Closing the game
  requires signing in again. Sign out clears the inbox view and local token.
- If unconfigured, saving stays local and sharing through Messages/Mail remains
  available. The interface states that the central inbox is not connected.

## Data and access

Reports contain optional name, note text, game build, device category, game-world
location, held item and optional JPEG. No device GPS or IP address is collected by
the game code. Supabase may retain normal service request logs.

Screenshots stay in the protected report table, not a public image bucket.
The API grants authenticated users status-column updates only; row policies
require the developer allowlist for reads and updates. Players have no table
read/insert/update permissions; a narrowly scoped RPC accepts submissions.

The submission function validates field lengths and caps reports at 50/hour and
200/day across the project, serialized with an advisory lock. These caps bound
admission but are not a full anti-abuse system: an attacker can consume the shared
quota. Add server-side CAPTCHA/rate protection before broad public distribution.
Monitor database usage; screenshots may be up to 700 kB encoded each. No automatic
deletion/retention job is installed.

## Local validation

Run from the repository root:

```
node test/validate-inbox.cjs
node test/validate-notes.cjs
node test/validate-traffic.cjs
git diff --check
```

These tests use API doubles. They verify client behavior and generated game
syntax, not actual hosted database rules or native iPhone sharing.
