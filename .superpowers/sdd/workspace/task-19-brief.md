### Task 19: Update .env.example with new provider keys

**Files:**
- Modify: `.env.example`

- [ ] **Step 1: Replace provider section**

Find the `GROQ_API_KEY=gsk_your_groq_api_key_here` line in `.env.example`. Replace with:

```bash
# Groq provider(s) — multiple keys comma-separated, rotate on failure
GROQ_API_KEYS=gsk_your_first_key_here,gsk_your_second_key_here
GROQ_BASE_URL=https://api.groq.com/openai/v1
GROQ_MODEL=llama-3.1-8b-instant

# MiniMax provider — uncomment to enable as PRIMARY (placed last in file = priority)
#MINIMAX_API_KEY=eyJ_your_minimax_key_here
#MINIMAX_BASE_URL=https://api.minimax.chat/v1
#MINIMAX_MODEL=MiniMax-Text-01
```

Also remove the old `GROQ_API_KEY=gsk_your_groq_api_key_here` line.

- [ ] **Step 2: Update `.env` (the actual file) too**

```bash
cd D:/Project/ViTale && grep -n "GROQ" .env
```

Find the `GROQ_API_KEY` line in `.env` and replace with same block as above (using dummy values).

- [ ] **Step 3: Restart API + smoke test**

```bash
cd D:/Project/ViTale && docker compose restart api 2>&1 | tail -3
sleep 10
curl -s http://localhost:5000/health
```

Expected: `db: "connected"`.

- [ ] **Step 4: Commit**

```bash
git add .env.example
git commit -m "docs: update .env.example for multi-provider (Groq rotate + MiniMax opt-in)"
```

---

