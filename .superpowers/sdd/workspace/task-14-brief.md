### Task 14: Wire ChatProviderChain in Program.cs

**Files:**
- Modify: `backend/WebApi/Program.cs`

- [ ] **Step 1: Add registrations**

Find the `// ── Repositories (Scoped) ──` block. After all repository registrations, before `// ── External Services (Scoped) ──`, add:

```csharp
// ── Chat Provider Chain (with multi-provider failover) ──
builder.Services.AddSingleton<IChatProvider>(sp =>
    new ChatProviderChainBuilder(
        sp.GetRequiredService<IHttpClientFactory>(),
        sp.GetRequiredService<ILoggerFactory>()
    ).Build());
```

- [ ] **Step 2: Build**

```bash
cd backend && dotnet build --no-restore 2>&1 | tail -5
```

Expected: `Build succeeded`.

- [ ] **Step 3: Commit**

```bash
git add backend/WebApi/Program.cs
git commit -m "feat: wire ChatProviderChain in DI"
```

---

