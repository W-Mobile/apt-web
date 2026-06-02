# apt-web — contributor guidelines for Claude / AI tools

## Language conventions

Code is written for an international engineering audience. The product UI is written for Swedish end users. Keep the two strictly separated.

| Where | Language | Example |
|-------|----------|---------|
| Test descriptions (`describe`, `it`) | **English** | `it('moves a row forward in a list', ...)` |
| Code identifiers (variables, functions, types, file names) | **English** | `reorderExercises`, `clientId`, `pendingDelete` |
| Code comments | **English** | `// keep pendingDelete rows in place` |
| Commit messages | **English** | `test(admin): extract and unit-test reorderExercises` |
| PR titles and technical PR descriptions | **English** | `feat(admin): drag-and-drop reordering of workout exercises` |
| User-facing UI strings (labels, buttons, errors, placeholders) | **Swedish** | `"Spara"`, `"Ny workout"`, `"Inga exercises tillagda ännu."` |
| Conversation with the human user (this includes `AskUserQuestion`) | **Swedish** | — |
| Manual test plans inside PR descriptions (read by Swedish reviewers) | **Swedish** | `"Skapa nytt pass, lägg till 5+ övningar..."` |

## Why this split

Swedish UI is intentional — the admins using this app speak Swedish, and labels like `"Spara"` are part of the product. Everything else stays English so future contributors, tooling, and search behave normally. There has been at least one cleanup PR for Swedish test descriptions sneaking in (`refactor: translate feedback test descriptions to English`) — do not reintroduce that drift.

## Examples

✅ `it('preserves pendingDelete row positions when active rows are reordered', ...)`
❌ `it('bevarar position för pendingDelete-rader när aktiva rader byter plats', ...)`

✅ `<button type="submit">Spara</button>`
❌ `<button type="submit">Save</button>`
