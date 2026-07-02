# Data & Sync Strategy

Defines Planixor's offline-first data architecture and synchronization model. This document is a companion to `global-product.md` and MUST be considered whenever implementing data persistence, record creation, or API sync endpoints.

## Offline-first architecture

Planixor is designed to work **fully offline**. The local data store is the primary source of truth on each device:

| Client | Local storage | Purpose |
|---|---|---|
| `frontend/react-web` | IndexedDB (preferred) / LocalStorage | Persistent structured data for the PWA |
| `frontend/android-app` | SQLite | Persistent structured data for Android |

All CRUD operations happen against local storage first. No network connection is required for core functionality.

## Usage model

Planixor works fully offline without any backend. Synchronization is an **opt-in capability** that requires the user to deploy their own backend instance.

| Mode | Description |
|---|---|
| **Local-only (default)** | Full functionality on a single device. No server, no account, no internet required. Data lives only on the device. |
| **With sync (self-hosted backend)** | The user deploys their own backend instance (Docker) and configures the client with the server URL + API key. This enables bidirectional sync across devices. |

**Single account constraint**: A user can only sync with one backend at a time per device. All local data belongs implicitly to the device owner. The client does not store `userId` per record — ownership is determined by the authenticated API key (username from SecuritySettings). If a user changes their sync configuration to a different backend/username, local data from the previous configuration is not accessible (it remains in local storage but is not visible or syncable until the original configuration is restored).

## Synchronization rules

1. **Configuration-gated** — only users who have configured their self-hosted backend can sync.
2. **Bidirectional** — local → API (push) and API → local (pull) in each sync cycle.
3. **User-scoped** — a user can only sync their own data. The API enforces ownership on every request.
4. **Automatic background sync** — a periodic background process runs on both PWA and Android that syncs at a configurable interval (default **5 minutes**, selectable: 5, 10, 15, 20, 25, 30, 45, 60 minutes) when connectivity is detected.
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
- Identify the user by the `username` from the validated API key (string, not GUID).

## Rules

- Every new entity/table MUST include the change tracking fields (`id`, `modifiedAt`, `syncedAt`, `isDeleted`).
- Client code MUST NOT assume network availability — all operations must succeed offline.
- Sync logic is a cross-cutting concern — implement it as a reusable service/module, not per-feature.
- The sync service MUST be inactive (no network attempts) when connectivity is unavailable.
- The `backend` API sync endpoints MUST reject requests without a valid API key.
- The `backend` API identifies users by the `username` string from SecuritySettings (not a GUID). The `UserId` field on syncable entities is `string` type stored as `varchar(50)` in the database.

## Implementation notes (learned during development)

### Pull filter uses `SyncedAt`, not `ModifiedAt`

The backend pull endpoints filter by `SyncedAt > lastSyncedAt` (not `ModifiedAt`). This is critical for multi-device sync: when Device A pushes a record with `ModifiedAt = June 17`, the backend sets `SyncedAt = June 23` (now). When Device B pulls with `lastSyncedAt = June 23 11:00`, it finds records with `SyncedAt > 11:00`, which includes the record from Device A.

Using `ModifiedAt` would miss records created on other devices before the pull timestamp.

### First sync uses epoch date

When `lastSyncedAt` is null (first sync after configuration), clients pass `1970-01-01T00:00:00Z` (epoch) as the filter to ensure ALL records are returned from the backend.

### Each entity syncs independently (resilient cycle)

If one entity's sync fails (e.g., calendar events 400), the other entities still sync. `lastSyncedAt` updates at the end of the cycle only if at least one entity sync succeeded. If ALL entities fail, `lastSyncedAt` remains unchanged.

### Backend API endpoint pattern

All sync endpoints follow this URL pattern:
```
POST /api/{entity-kebab}/sync/push   — Push records to server
GET  /api/{entity-kebab}/sync/pull   — Pull records from server
```

With query parameters for pull: `?lastSyncedAt={ISO8601}&cursor={base64}`

Entities: `calendar-events`, `notification-records`, `annual-hours-config`, `shifts`, `reminders`

### Backend response wrapper

All API responses are wrapped in `GenericResponse<T>`:
```json
{ "data": { ... actual payload ... }, "traceId": "..." }
```

Clients must unwrap `.data` from the response.

### Push request body format

| Entity | Body field name |
|---|---|
| Calendar events | `{ "records": [...] }` |
| Notification records | `{ "records": [...] }` |
| Annual hours config | `{ "records": [...] }` |
| Shifts | `{ "shifts": [...] }` |
| Reminders | `{ "records": [...] }` |

### EF Core 10 + MySQL: Cannot use `.Contains()` on `List<Guid>`

The MySQL provider for EF Core 10 cannot translate `list.Contains(entity.Id)` to SQL. The workaround is to query entities individually with `FirstOrDefaultAsync(e => e.Id == id)` in a loop, or load all user records and filter in memory.

### DateTime ISO format from backend lacks `Z` suffix

The backend serializes `DateTime` as `"2026-06-20T13:07:59.878"` (without `Z` or offset). Clients must normalize this before parsing (e.g., append `Z` if no timezone indicator is present).

### Android: `android:usesCleartextTraffic="true"` required for HTTP

Android blocks HTTP (non-HTTPS) connections by default since API 28. For local development with `http://` URLs, the manifest must include this attribute.

### Android: Dynamic base URL via OkHttp interceptor

The sync URL comes from user configuration (DataStore), not a hardcoded Retrofit base URL. A `DynamicBaseUrlInterceptor` rewrites the scheme/host/port and adds the Authorization header at runtime.

### Settings: Reset Application

Both platforms include a "Reset Application" button in Settings that wipes all local data (IndexedDB/Room + DataStore preferences) for clean re-sync scenarios.

### Configurable sync interval

The sync interval is no longer hardcoded to 5 minutes. Users can select from: 5, 10, 15, 20, 25, 30, 45, 60 minutes. The default is 5 minutes. The interval is stored in `SyncConfig` as `syncIntervalMinutes`. When changed, the sync timer restarts with the new interval without requiring app restart.

### Configurable API base path (unified URL field)

The API base path is no longer hardcoded as `/api`. It is extracted from the server URL that the user enters in the sync configuration screen. Internally, `SyncConfig` stores `serverUrl` (scheme + host + port) and `apiBasePath` (path segment) as separate fields. The UI presents a single "Server URL" field where users type the full URL (e.g., `https://backend.planixor.com/api` or `https://backend.planixor.com/custom/v2`). On save, the system parses the URL into its components. If no path is provided, it defaults to `/api`.

URL construction pattern: `{serverUrl}{apiBasePath}/{entity-kebab}/sync/{action}`

### Notification record purge (automatic cleanup)

Past notification records are automatically purged during sync:
- **Backend**: During notification record push, the server hard-deletes records whose CalendarEvent.EndDay < today (or orphaned records with no matching CalendarEvent). Runs before processing the push batch; failures are logged but don't abort the push.
- **Clients**: After each completed sync cycle, clients permanently delete local NotificationRecord entries whose CalendarEvent.startDay < today (or orphaned). This is a physical delete, not soft-delete.

### lastSyncedAt conditional update

`lastSyncedAt` is only updated when at least one entity sync succeeds in a cycle. If ALL entities fail (e.g., server unreachable), `lastSyncedAt` remains unchanged. This prevents the timestamp from advancing when no actual sync occurred.

### Android: ConnectionStatus persistence and ViewModel

The `ConnectionStatus` enum (UNCONFIGURED, ACTIVE, FAILING, PAUSED) is persisted to DataStore via `PreferencesRepository.saveConnectionStatus()`. The `SyncServiceController` writes FAILING on connectivity errors and ACTIVE on successful cycles. The `SyncViewModel` reads this persisted status via `connectionStatusFlow` (combined with `syncConfigFlow`) — it does NOT hardcode ACTIVE based on config presence alone.

### Username change detection

When sync configuration is validated and the returned username differs from the stored username (case-sensitive comparison), a confirmation dialog warns the user that all local syncable data will be deleted. On confirm: all 5 entity tables are cleared, lastSyncedAt is reset, and the new config is saved. On cancel: existing config is retained. First-time configuration or same username saves directly without dialog.
