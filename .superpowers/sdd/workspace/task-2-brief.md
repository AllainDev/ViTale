### Task 2: EF Core migration for hanoi_knowledge table

**Files:**
- Modify: `backend/Infrastructure/Migrations/` (new migration generated)

- [ ] **Step 1: Ensure `unaccent` extension is available**

The migration will use `unaccent()`. Verify the DB has it:

```bash
docker exec vitale_db psql -U postgres -d vitale_db -c "SELECT * FROM pg_available_extensions WHERE name='unaccent';"
```

Expected: 1 row showing `unaccent`. If not, check `postgis/postgis:16-3.4-alpine` image (it ships unaccent by default).

- [ ] **Step 2: Generate migration**

```bash
cd backend && dotnet ef migrations add AddHanoiKnowledge --project Infrastructure --startup-project WebApi
```

Expected: New file `backend/Infrastructure/Migrations/<timestamp>_AddHanoiKnowledge.cs` created.

- [ ] **Step 3: Manually edit migration to add `tsvector` + `unaccent`**

Open the generated migration file. Find the `CreateTable` call for `hanoi_knowledge`. After `migrationBuilder.CreateTable(...)`, add:

```csharp
// Generated tsvector column (Postgres 12+) with unaccent for Vietnamese diacritics
migrationBuilder.Sql("""
    ALTER TABLE hanoi_knowledge
    ADD COLUMN search_vector tsvector
    GENERATED ALWAYS AS (
        to_tsvector('simple',
            unaccent(coalesce(question,'') || ' ' ||
                     coalesce(answer,'') || ' ' ||
                     coalesce(keywords,'')))
    ) STORED;
""");

migrationBuilder.Sql("""
    CREATE INDEX idx_hanoi_knowledge_search
    ON hanoi_knowledge USING GIN(search_vector);
""");

// Ensure unaccent extension exists (idempotent)
migrationBuilder.Sql("CREATE EXTENSION IF NOT EXISTS unaccent;");
```

- [ ] **Step 4: Apply migration to dev DB**

```bash
cd backend && dotnet ef database update --project Infrastructure --startup-project WebApi
```

Expected: Migration applied successfully. Verify:

```bash
docker exec vitale_db psql -U postgres -d vitale_db -c "\d hanoi_knowledge"
```

Should show table with `search_vector` column + GIN index.

- [ ] **Step 5: Commit**

```bash
git add backend/Infrastructure/Migrations/
git commit -m "feat: add EF migration for hanoi_knowledge + tsvector index"
```

---

