# Task 2 Report: EF Core migration for hanoi_knowledge

## Status
DONE

## Commit SHA(s)
- `215e275` — feat: add EF migration for hanoi_knowledge + tsvector index
  - `backend/Infrastructure/Migrations/20260714035031_AddHanoiKnowledge.cs`
  - `backend/Infrastructure/Migrations/20260714035031_AddHanoiKnowledge.Designer.cs`
  - `backend/Infrastructure/Migrations/ApplicationDbContextModelSnapshot.cs` (updated)

Base HEAD before work: `1d7c14e` (Task 1).

## `\d hanoi_knowledge` summary
```
search_vector | tsvector | generated always as (to_tsvector('simple'::regconfig,
  f_unaccent_immutable(((COALESCE(question,'') || ' ') || COALESCE(answer,'') || ' ')
  || COALESCE(keywords,'')))) stored
Indexes:
  "idx_hanoi_knowledge_search" gin (search_vector)
  "idx_hanoi_knowledge_category" btree (category) WHERE is_active = true
  "idx_hanoi_knowledge_lang"     btree (language) WHERE is_active = true
  "PK_hanoi_knowledge" PRIMARY KEY btree (id)
```
Table + `search_vector tsvector` (GENERATED ALWAYS AS ... STORED) + GIN index confirmed present.

Functional FTS verified: inserted "Hồ Gươm ở đâu?", queried `plainto_tsquery('simple', f_unaccent_immutable('ho guom'))` (no diacritics) → matched the row. Unaccent works for Vietnamese diacritics.

## Concerns / deviations from brief
1. **IMMUTABLE wrapper for unaccent (design change).** The brief's generated column used `unaccent(...)` directly. Postgres refuses this: the single-arg `unaccent(text)` is only STABLE, but a `GENERATED ALWAYS AS ... STORED` column requires an IMMUTABLE expression. I added an IMMUTABLE SQL wrapper `f_unaccent_immutable(text)` that calls `unaccent('public.unaccent'::regdictionary, $1)` (pinned dictionary → safe to mark IMMUTABLE). The generated column and any FTS query must use this wrapper, not raw `unaccent()`. Downstream tasks (search service) should call `f_unaccent_immutable(...)` when building the tsquery. `Down()` drops the function after `DropTable`.

2. **Extension ordering.** Brief placed `CREATE EXTENSION IF NOT EXISTS unaccent` at the end. I moved it to the very start of `Up()` because the generated column references unaccent at table-alter time. `unaccent` was already available in the `postgis/postgis:16-3.4-alpine` image.

3. **dotnet-ef not installed.** The `dotnet ef` CLI was missing. Installed globally: `dotnet tool install --global dotnet-ef` (v10.0.9). Available on next runs via `$HOME/.dotnet/tools` on PATH. No local tool manifest exists in the repo.

4. **`dotnet restore` / build.** Ran `dotnet restore` first (all up-to-date), then `dotnet build --no-restore` → 0 errors, 6 warnings (pre-existing MSB3277 reference warnings in WebApi.IntegrationTests, unrelated).

5. **Connection creds for `dotnet ef database update`.** Host-side EF defaulted to a wrong username (`vitale`, 28P01 auth fail). The API uses `DB_CONNECTION_STRING` (Username=postgres, Password=vitale_dev_password, Host=db inside Docker). Applied the migration from host by exporting `DB_CONNECTION_STRING` with `Host=localhost;...;Username=postgres;Password=vitale_dev_password`. This is a dev-time invocation detail only; runtime container config is unchanged.

6. **API container rebuilt** (`docker compose up -d --build api`) since the entity/model changed — container is `Up (healthy)`.
