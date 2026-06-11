# Data & Sync Strategy

Defines Planixor's offline-first data architecture and synchronization model. This document is a companion to `global-product.md` and MUST be considered whenever implementing data persistence, record creation, or API sync endpoints.

## Offline-first architecture

Planixor is designed to work **fully offline**. The local data store is the primary source of truth on each device:

| Client | Local storage | Purpose |
|---|---|---|
| `frontend/react-web` | IndexedDB (preferred) / LocalStorage | Persistent structured data for the PWA |
| `frontend/android-app` | SQLite | Persistent structured data for Android |

All CRUD operations happen against local storage first. No network connection is required for core functionality.

## User tiers

| Tier | Capabilities |
|---|---|
| **Free (anonymous)** | Full offline functionality on a single device. No account required. Data lives only on the device. |
| **Subscribed (authenticated)** | Everything in Free + bidirectional sync across devices via the API. Requires Google Sign-In + active subscription. |

**Single account constraint**: A user can only sync with one account at a time per device. All local data belongs implicitly to the device owner. The client does not store `userId` per record — ownership is determined by the authenticated session. If a user signs out and signs in with a different account, local data from the previous account is not accessible to the new account (it remains in local storage but is not visible or syncable until the original account signs back in).

## Synchronization rules

1. **Subscription-gated** — only authenticated users with an active subscription can sync.
2. **Bidirectional** — local → API (push) and API → local (pull) in each sync cycle.
3. **User-scoped** — a user can only sync their own data. The API enforces ownership on every request.
4. **Automatic background sync** — a periodic background process runs on both PWA (Service Worker / Web Worker) and Android (WorkManager) that syncs every **5 minutes** when connectivity is detected.
5. **App lifecycle sync** — a sync cycle triggers when the application is opened (PWA gains focus / Android Activity resumes) and a push cycle triggers when the application is about to close (PWA loses focus / Android Activity pauses).
6. **Manual sync** — the user can trigger a sync manually at any time.
7. **Connectivity-aware** — the sync service monitors network status. If offline, it does not attempt any network calls. When connectivity is restored, sync resumes automatically.
8. **Last-sync timestamp** — each client persists a `lastSyncedAt` (UTC) timestamp per user. On pull, the client requests only records modified after this timestamp.

## Batch sizes and pagination

- **Push batch size**: maximum **100 records** per push request. If more records are pending, the client sends multiple sequential push requests.
- **Pull page size**: maximum **100 records** per pull response. If the API returns exactly 100 records, the client sends subsequent pull requests using a pagination cursor until fewer than 100 records are returned.
- The API pull endpoint supports a pagination cursor parameter to enable multi-page retrieval.

## Record identity

- All records use **GUIDs / UUIDs** as primary identifiers, generated client-side at creation time.
- This prevents ID collisions when multiple devices create records independently before syncing.
- No auto-increment IDs anywhere in the system.

## Change tracking

Every syncable record includes:

| Field | Type | Purpose |
|---|---|---|
| `id` | `UUID` | Globally unique, generated client-side |
| `modifiedAt` | `DateTime (UTC)` | Updated on every local write — used to detect unsynced changes |
| `syncedAt` | `DateTime (UTC)` ∣ `null` | Timestamp of last successful sync for this record. `null` = never synced |
| `isDeleted` | `bool` | Soft-delete flag — records are never physically removed until confirmed synced |

## Conflict resolution strategy

> Define explicitly once the team agrees on a policy. Initial recommendation:

- **Last-writer-wins (LWW)** based on `modifiedAt` — simplest strategy for the MVP.
- Future consideration: field-level merge or manual conflict resolution for complex entities.

## Sync flow (high-level)

```
1. Check connectivity → if offline, skip.
2. Push: send local records where modifiedAt > syncedAt to the API (in batches of 100).
3. Pull: request records from the API modified after client's lastSyncedAt (paginated, 100 per page).
4. Merge pulled records into local store (apply conflict resolution).
5. Update syncedAt on pushed records.
6. Update client's lastSyncedAt to current UTC time.
```

## Sync triggers

| Trigger | Sync type | Platforms |
|---|---|---|
| Every 5 minutes (while online) | Full push + pull | PWA, Android |
| App opened / gains focus | Full push + pull | PWA, Android |
| App closing / loses focus | Push only | PWA, Android |
| Connectivity restored | Full push + pull | PWA, Android |
| Manual user action | Full push + pull | PWA, Android |

## API responsibilities for sync

- Accept and store records pushed by the authenticated user (validate ownership).
- Return records modified after a given timestamp for the authenticated user.
- Never expose or accept data belonging to a different user.
- Handle soft-deleted records (propagate deletions across devices).

## Rules

- Every new entity/table MUST include the change tracking fields (`id`, `modifiedAt`, `syncedAt`, `isDeleted`).
- Client code MUST NOT assume network availability — all operations must succeed offline.
- Sync logic is a cross-cutting concern — implement it as a reusable service/module, not per-feature.
- The sync service MUST be inactive (no network attempts) when connectivity is unavailable.
- The `backend` API sync endpoints MUST reject requests from users without an active subscription.
