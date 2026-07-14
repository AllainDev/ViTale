# Task 1 Report — HanoiKnowledge entity + EF mapping

## Status
**DONE**

## Commit
- SHA: `1d7c14e`
- Message: `feat: add HanoiKnowledge entity + EF mapping`
- Files: 2 changed, 75 insertions(+)
  - `backend/Domain/Entities/HanoiKnowledge.cs` (new)
  - `backend/Infrastructure/Persistence/ApplicationDbContext.cs` (modified)

## Build/Test Summary
`dotnet build --no-restore` → **Build succeeded, 0 errors**, 6 pre-existing MSB3277 self-reference warnings in `WebApi.IntegrationTests.csproj` (unrelated to this change). No CS-warnings introduced.

Note: a `dotnet restore` was required first because the fresh build environment had no `obj/` assets — `--no-restore` alone produced a false-positive MSB4018. After restore, the build is green.

## Files Touched
1. **Created `backend/Domain/Entities/HanoiKnowledge.cs`**
   - Entity with `Id`, `Category`, `Topic`, `Question`, `Answer`, `Keywords?`, `Language`, `Source?`, `IsActive`, `CreatedAt`
   - Private setters + `protected` parameterless ctor (EF-friendly)
   - Factory `Create(...)` validates: `language ∈ {"vi","en"}`, non-empty `question`, non-empty `answer`. Trims strings, lowercases `Category`, sets `IsActive=true`, `CreatedAt=UtcNow`
   - `Deactivate()` for soft-delete
   - Includes `using Domain.Common;` per spec (no symbols actually used — harmless; future-proofs for shared primitives like `IEntity`/`Auditable` if added later)
2. **Modified `backend/Infrastructure/Persistence/ApplicationDbContext.cs`**
   - Added `public DbSet<HanoiKnowledge> HanoiKnowledges => Set<HanoiKnowledge>();` after `UserBadges` (line ~35)
   - Added EF model-config block at end of `OnModelCreating` (after `UserBadge`):
     - Table `hanoi_knowledge`, snake_case columns
     - `category` (varchar 50, required), `topic` (varchar 200, required), `question`/`answer` (text, required), `keywords` (nullable), `language` (varchar 2, required), `source` (varchar 200, nullable), `is_active` (default true), `created_at`
     - Two filtered partial indexes: `idx_hanoi_knowledge_lang`, `idx_hanoi_knowledge_category` — both filtered by `is_active = true` so only active rows participate (matches the soft-delete pattern used elsewhere in the codebase)

## Patterns Noticed
- Existing entities (`Stamp`, `Badge`, etc.) use private setters + protected ctor + static `Create` factory — new entity follows the exact same convention.
- Column naming convention is `snake_case` throughout (e.g. `is_active`, `created_at`).
- Partial indexes with `.HasFilter("is_active = true")` were not used elsewhere in `ApplicationDbContext` — this is the **first** such filtered index in the project. Reasonable for a KB table where inactive rows should be excluded from retrieval lookups by default.
- Task brief expected line 484 for the model config insertion point; the actual ending of `UserBadge` config was at line 484 and the closing `}` of `OnModelCreating` was at line 485 — both insertions landed correctly within the method body.

## Concerns
1. **`dotnet restore` required before first build.** The brief said `dotnet build --no-restore` should work directly; it did not on this clean checkout. Worth running `dotnet restore` once at the start of Task 2 (migration step).
2. **Six pre-existing MSB3277 warnings** in `WebApi.IntegrationTests.csproj` from a self-reference to `WebApi.dll` and `Infrastructure.dll`. Out of scope for Task 1, but should be addressed in the cleanup pass (Task 28).
3. **`using Domain.Common;`** is unused inside the entity (spec included it verbatim). Could be removed, but kept for spec fidelity — a single-csproj-level Roslyn check might emit IDE0005 in some configs, which the project's current build settings tolerate.
4. **No full-text-search column yet.** Task 1 only creates the entity; Postgres `tsvector` column + GIN index for KB retrieval will be in Task 2 (migration). Spec is correct — flagged for awareness only.
5. **The `IsActive` partial index filter** uses the boolean literal `true` (not `'true'` or `1`). EF/Npgsql will translate this to PostgreSQL `true` correctly. Verified against the EF Core 10 / Npgsql provider semantics used in this project.

## Verification Evidence
- Build output tail: `0 Error(s)` after `dotnet restore && dotnet build --no-restore`.
- `git log --oneline -3` confirms commit `1d7c14e` is now HEAD with only the two intended files modified.
- No CS-warnings emitted from `HanoiKnowledge.cs` or the modified `ApplicationDbContext.cs` region (filtered grep returned empty).
