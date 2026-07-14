# Task 9 Report: GroqChatProvider

## Status
COMPLETED

## Commit SHA
9856e841a3c26df7cc096d04f4d4988dd6394ebd

## Build Output
`Build succeeded. 0 Error(s)`

## Summary
Created `backend/Infrastructure/Services/Providers/GroqChatProvider.cs` implementing `IChatProvider`.

The provider:
- Uses `IHttpClientFactory` to create a named HttpClient per provider instance (no static HttpClient)
- Accepts `name`, `apiKey`, `baseUrl`, `model`, `priority` via constructor — supporting one-key-per-instance rotation via `ChatProviderChain` (Task 12)
- Sets `BaseAddress` to the corrected URL `https://api.groq.com/openai/` (the brief's value) — fixing the existing `GroqChatService` bug at the same time
- Wraps user content in triple-quote delimiters for OWASP A03 prompt injection defense
- Supports OpenAI-compatible tool calling (`tools` + `tool_choice: "auto"`)
- Parses `tool_calls` JSON to return `IReadOnlyList<ToolCall>`
- Returns prompt/completion token usage from `usage` field
- 30-second HTTP timeout

## Concerns

1. **Existing `GroqChatService` still references old `IAiChatService` interface** — left untouched per instructions (to be addressed in Task 18). The build still passes because both services coexist: `GroqChatService` implements `IAiChatService`, `GroqChatProvider` implements `IChatProvider`. They share no DI registration yet.

2. **No DI registration yet** — `GroqChatProvider` is created but not wired into `Program.cs`. This is expected for Task 9; wiring happens in Task 12 (`ChatProviderChain`) and Task 13 (DI registration). Currently the class is unreachable from runtime.

3. **HttpClient name collision risk** — uses `"GroqProvider_" + name`. If `name` contains invalid characters or duplicates, this could cause issues. Assumed callers (Task 13) will pass unique, ASCII-safe names (e.g. "primary", "fallback-1").

4. **Field initialization in `GroqResponse`** — `choices` defaults to `new()` and code calls `result.choices.First()`. If Groq returns no choices (edge case), this would throw `InvalidOperationException`. Acceptable behavior — better than silently returning empty.

5. **Unused `_logger`** — private field is assigned but never used in the current implementation. Not a bug but should be addressed when adding error logging in later tasks.

6. **Regex `ActionTagRegex`** — defined as `public static readonly` but never invoked in this class (it was carried over from `GroqChatService` pattern). Can be removed or left for future action-tag parsing.

7. **`ActionTagRegex` exposure** — marked `public static` for future external use. If unused, may want to be `private` in a future cleanup pass.

## Files Changed
- Created: `backend/Infrastructure/Services/Providers/GroqChatProvider.cs` (137 lines)
