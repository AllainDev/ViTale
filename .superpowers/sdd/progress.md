# SDD Progress Ledger

Plan: docs/superpowers/plans/2026-07-14-hanoi-ai-guide.md
Branch: main (work directly per user choice)
Started: 2026-07-14

## Tasks

Task 1: complete (commits e77f552..1d7c14e, review clean — Minor: unused `using Domain.Common;`)
Task 2: complete (commits 1d7c14e..215e275, review clean — 7 Minors)
  - Note: implementer created `f_unaccent_immutable(text)` IMMUTABLE wrapper because Postgres refuses STABLE `unaccent()` in STORED generated columns
  - Task 7 (HanoiKnowledgeService) MUST use `f_unaccent_immutable(...)` in retrieval SQL, not `unaccent(...)`
Task 3: complete (commits a14b489..8dfbb88, review not run — pure data file)
Task 4: complete (commits 8dfbb88..a14b489, build succeeded, raw string escaping + top-level statements fixed)
Task 5: complete (commits 215e275..43a145b, 114 KB entries: 58 VI + 56 EN)
  - Off-plan fixes during execution:
    * f_unaccent_immutable wrapper (Postgres IMMUTABLE requirement)
    * Groq base URL /openai/ (was missing in both script + HttpClient)
    * KB script case-insensitive JSON deserialization (topics came in as empty)
    * KB script retry-with-backoff + 4s pacing for rate limits
    * KB script fail-fast on 429
    * Smart App Control needed to be disabled for DLL load
Task 6: complete (commits 43a145b..bd218ff, build clean, 1694 bytes diff)
Task 7: complete (commits bd218ff..afd45bf, 7 tests passed, used real Postgres since InMemory can't do FromSqlRaw)
Task 8: complete (commits afd45bf..9679293, IChatProvider + DTOs)
Task 9: complete (commits 9679293..9856e84, GroqChatProvider w/ corrected /openai/ URL)
Task 11: complete (commits 9856e84..682aa64, MiniMaxChatProvider, SupportsToolCalling=false)
Task 12: complete (commits 682aa64..e020b70, 4 tests passed for failover)
Task 13: complete (commits e020b70..fcf85a7, ChatProviderChainBuilder)
Task 14: complete (commits fcf85a7..a2edc5b, wired DI, /health OK)
Task 15: complete (commits e7f60d9..3c7f94b, ToolDefinitions x5)
Task 16: complete (commits 3c7f94b..fe98527, ChatPromptBuilder, 7 tests pass)
Task 17: complete (commits fe98527..e7f60d9, ChatToolExecutor, GetActiveAsync added)
Task 18: complete (commits e7f60d9..2fb43aa, ChatController refactor + GET sessions + DI wire)
Task 19: complete (commits 2fb43aa..2fb43aa, .env + .env.example + docker-compose updated)
Fix: HanoiKnowledgeService nullable category bug → ea82dde (cast ::text, both endpoints now return 200)
Tasks 20-25: complete (commits ea82dde..f10e011, 7 frontend files, tsc clean)
Task 26: complete (commits f10e011..2a433f6, Canvas.tsx ChatPanel integration)
Task 27: complete (commits 2a433f6..a51223a, layout.tsx ChatProvider wrap)
Task 28: complete (commits a51223a..4f5eda7, 14/14 API tests pass, tool_call_id bug fixed, safety rails strengthened)
