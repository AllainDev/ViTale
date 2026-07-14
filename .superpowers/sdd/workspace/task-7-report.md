# Task 7 Report — HanoiKnowledgeService + tests

## Status
Completed. Build succeeds, all 7 tests pass.

## Commit SHA(s)
- `afd45bf6d805030d67d406b95662e4ed88108339` — feat: HanoiKnowledgeService with full-text search + tests

## Files
- `backend/Infrastructure/Services/HanoiKnowledgeService.cs` (new)
- `backend/Application.Tests/Services/HanoiKnowledgeServiceTests.cs` (new)
- `backend/Application.Tests/Application.Tests.csproj` (new)
- `backend/backend.slnx` (added new test project)

## Test output summary
7 passed, 0 failed:

```
Passed!  - Failed:     0, Passed:     7, Skipped:     0, Total:     7, Duration: 928 ms - Application.Tests.dll (net10.0)
```

Tests:
1. `SearchAsync_ReturnsTopK_OrderedByRank`
2. `SearchAsync_FiltersByLanguage`
3. `SearchAsync_ReturnsEmpty_WhenNoMatch`
4. `SearchAsync_OnlyReturnsActiveEntries`
5. `SearchAsync_UnaccentInsensitive`
6. `SearchAsync_EmptyQuery_ReturnsEmpty`
7. `SearchAsync_CategoryFilter`

## Implementation notes
- Implementation uses `f_unaccent_immutable(query)` (the IMMUTABLE wrapper created
  in the Task 2 migration) so the runtime tsquery tokenizes the same way the
  STORED `search_vector` does. Without this, `websearch_to_tsquery` against the
  base `unaccent()` would refuse to compare against the generated index.
- Config is `'simple'` (not `'english'`) — matches the migration.
- SQL is parameterized; positional placeholders `{0}`..`{3}` for
  `language`, `category`, `query`, `topK`. No injection surface.
- Returns ordered by `ts_rank DESC`, capped at `topK` (early-return empty
  array on invalid input / empty / whitespace query).

## Concerns / deviations from brief

1. **InMemory provider doesn't support `FromSqlRaw`.** The brief hinted at
   mocking the DbSet OR using real Postgres. Per the user's instruction in the
   task framing ("For simplicity, write tests that exercise the service with a
   real Postgres connection"), I integrated against the running `vitale_db`
   docker container — connection string defaults to the dev container, can be
   overridden via `DB_CONNECTION_STRING`.

2. **`HanoiKnowledgeChunk` has no `Language` property.** The brief's draft
   `SearchAsync_FiltersByLanguage` test referenced `viResults[0].Language`,
   which doesn't compile. Fix: seed both VI and EN rows in the SAME category,
   query each language separately, and assert on `Topic` ("Pho-VI" vs
   "Pho-EN") instead of `Language`. This is a stronger assertion anyway —
   it proves the language filter actually discriminates.

3. **`websearch_to_tsquery` defaults to AND semantics** for multi-word
   queries. The brief's draft tests had seeded text that did not actually
   contain the query tokens (e.g. seeded "Pho is great" then queried
   "pho restaurant" — required both `pho` AND `restaurant` and so would
   return zero rows). Adjusted seeded bodies to contain every token in the
   query, and adjusted `ReturnsTopK_OrderedByRank` to boost the Pho row's
   rank by repeating "restaurant" in its body so it cleanly out-ranks the
   other matching row.

4. **Cleanup between tests.** Each test seeds into a unique
   `test_{guid}_{suffix}` category and deletes by `category` in a `finally`
   block, so concurrent or repeated runs don't collide and don't pollute
   the seeded KB. Categories use the lowercase invariant form already
   enforced by `HanoiKnowledge.Create`.

5. **Brief `step 4` says "InMemory DB won't use tsvector"** — that's because
   there's no tsvector at all; the whole stack of `tsvector @@ tsquery` only
   exists in real Postgres. The fallback "mock DbSet" path was not needed
   once the real-DB approach worked cleanly.

6. **DI.** `HanoiKnowledgeService` is not yet registered in
   `Infrastructure/DependencyInjection.cs` (if such a file exists); Task 8
   presumably handles full chain wiring. I'll defer checking to that step.
