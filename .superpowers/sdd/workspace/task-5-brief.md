### Task 5: Run KB generation

**Files:** (no code changes — execution task)

- [ ] **Step 1: Verify API + DB are up**

```bash
curl -s http://localhost:5000/health
docker exec vitale_db psql -U postgres -d vitale_db -c "SELECT count(*) FROM hanoi_knowledge;"
```

Expected: `db: "connected"` and `0`.

- [ ] **Step 2: Run the script**

```bash
cd backend && dotnet run --project tools/GenerateHanoiKb/GenerateHanoiKb.csproj 2>&1 | tail -40
```

Expected: Script logs `OK: <topic>` for each, ends with `Done. Inserted: ~100, Errors: 0`. Takes 3-5 min.

- [ ] **Step 3: Verify count**

```bash
docker exec vitale_db psql -U postgres -d vitale_db -c "SELECT language, count(*) FROM hanoi_knowledge GROUP BY language;"
```

Expected: 2 rows, each with count ~50.

- [ ] **Step 4: Spot-check 3 entries**

```bash
docker exec vitale_db psql -U postgres -d vitale_db -c "SELECT topic, language, left(question, 60) as q, left(answer, 80) as a FROM hanoi_knowledge ORDER BY random() LIMIT 3;"
```

Expected: 3 entries, question/answer in correct language, plausible facts.

- [ ] **Step 5: Commit (KB data lives in DB, no git changes)**

No commit needed (data is in DB volume, not git).

---

