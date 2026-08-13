# Sync API — compatibility with the React PWA and the Android app

Branch `fix/update-nugets-clean-architecture` rewrote the backend against a reworked Clean Architecture framework
and touched every sync service. This is what that did to the two clients that talk to those endpoints, checked
against their source rather than assumed.

Both clients live in this repository, which is what made the check possible: `frontend/react-web` and
`frontend/android-app`.

## Verdict

**One change was breaking. It has been fixed.** Everything else is either invisible on the wire or already matched
by both clients.

## What was checked, and against what

| Change in the backend | What the clients do | Verdict |
|---|---|---|
| Routes, query parameters, request and response shapes | — | **Unchanged.** The endpoints gained a `CancellationToken` parameter, which is bound by the framework and never travels over HTTP |
| `RejectedRecord` moved to its own file | Both only count `rejectedIds` | No effect — a C# type name does not appear in the JSON |
| New ceiling of **100 records** per push, over it a 400 | React chunks with `PUSH_BATCH_SIZE = 100` (`syncServiceController.ts`); Android with `MAX_BATCH_SIZE = 100` in every adapter under `data/sync` | **Exact match.** Now pinned by `SyncContractTests` |
| **Empty batch** refused with a 400 | Both build batches by chunking, which yields no call at all from an empty queue | Neither can send one |
| Dates: from `DateOnly.Parse` under the ambient culture to exact `yyyy-MM-dd` | Android sends `LocalDate.toString()`; React documents and stores `YYYY-MM-DD` | **Match.** The old code was the bug: on an `es-ES` host `03/04/2026` was 3 April, on `en-US` it was 4 March |
| `lastSyncedAt` normalised to UTC by `DateTimeKind` | Android sends `Instant.toString()`, React `toISOString()` — both always `Z` | A no-op for them. It fixes an offset or bare timestamp sent by anything else |
| `/api/health` and `/api/status` no longer accept `?tag=` | Neither client calls them | No effect |
| Rejection reason: from the constant `"Missing required fields"` to the validator's message | Neither parses it | No effect, and the message now says which field |
| Error body (`ProblemDetails`) reworked with the framework | **Neither client parses it.** React reads it as text into an `Error` message; Android only uses `response.code()` | No effect. What both rely on is the **status code**, and 400 / 401 / 429 are unchanged |

## The one that broke: a future watermark

`SyncWatermark.Normalise` refused a `lastSyncedAt` more than five minutes ahead of the server clock, with a 400.
That is reachable by a client doing nothing wrong:

- Android stores the watermark from **`System.currentTimeMillis()`** — the device clock — in
  `SyncServiceController.kt`, not from anything the server said.
- The pull response is `(Records, Cursor, HasMore)`. **There is no server timestamp in it**, so the client has
  nothing better to store.

A device whose clock runs fast would have gone from syncing nothing silently to failing visibly — better, but still
not syncing.

**Fixed by clamping instead of refusing.** A watermark beyond the tolerance is treated as "now", so the pull returns
everything modified up to this instant. Within five minutes the value is still honoured as sent, which is right for
ordinary clock skew. The original defect this replaced — a future watermark silently returning zero records — stays
fixed, because clamping returns the records rather than none.

## What now guards this

`backend/src/UnitTest.Codenized.Planixor/Sync/SyncContractTests.cs` pins the parts of the contract the clients rely
on and nothing else stated:

- Every entity caps a push batch at the same number.
- **The React and Android chunk sizes are read out of their own source** and compared with the server's. Verified in
  both directions: dropping the server constant to 99 fails the test, and raising the React one to 250 fails it too.
- Exactly 100 is accepted and 101 refused; an empty batch is refused.

The batch ceiling is a number agreed in three places and, until now, written down in none. `MaxBatchSize` also
replaced the bare `100` literal in the `Shift` and `AnnualHoursConfig` validators so all five entities state it the
same way.

## Worth knowing: Android treats a 4xx on push as "accepted"

`ShiftSyncAdapter.kt` and its siblings mark records as synced when a push returns 4xx — the comment reads *"4xx:
mark records as synced, continue (server rejected them)"*. Those records leave the queue and are never retried.

Nothing in this branch triggers it: the batch ceiling matches, and per-record problems still come back as a 200 with
a `rejectedIds` list rather than a 400. But it means **any future request-level 400 on push is silent data loss on
Android**, not a visible error. That is the reason the batch ceiling is now pinned by a test on both sides.

## Not checked

Said plainly, because these are the gaps a reader would otherwise assume were covered:

- **A live round trip.** The repository's connection string is a placeholder (`dbname` / `dbuser`), so the API could
  not be started against a real database here. The watermark's four forms — `Z`, offset, bare, and far future — are
  covered by unit tests instead.
- **The Android test suite.** It needs the SDK and an emulator, neither available here. The contract test reads the
  app's source, which is what can be checked without them.
- **The pagination cursor.** Its format is opaque to the client, but a cursor stored before a deployment and sent
  back after it might not decode. Not exercised.
