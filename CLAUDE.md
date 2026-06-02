# apt-web — contributor guidelines for Claude / AI tools

Read once at session start. Rules below are codified because they have been violated or have already cost time.

## Language conventions

Code targets an international audience. UI targets Swedish users. Keep them separated.

| Where | Language | Example |
|-------|----------|---------|
| Test descriptions (`describe`, `it`) | **English** | `it('moves a row forward in a list', ...)` |
| Code identifiers (variables, functions, types, file names) | **English** | `reorderExercises`, `clientId`, `pendingDelete` |
| Code comments | **English** | `// keep pendingDelete rows in place` |
| Commit messages | **English** | `test(admin): extract and unit-test reorderExercises` |
| PR titles and technical PR descriptions | **English** | `feat(admin): drag-and-drop reordering of workout exercises` |
| User-facing UI strings (labels, buttons, errors, placeholders) | **Swedish** | `"Spara"`, `"Ny workout"`, `"Inga exercises tillagda ännu."` |
| Conversation with the human user (incl. `AskUserQuestion`) | **Swedish** | — |
| Manual test plans inside PR descriptions | **Swedish** | `"Skapa nytt pass, lägg till 5+ övningar..."` |

✅ `it('preserves pendingDelete row positions when active rows are reordered', ...)`
❌ `it('bevarar position för pendingDelete-rader när aktiva rader byter plats', ...)`

✅ `<button type="submit">Spara</button>`
❌ `<button type="submit">Save</button>`

A previous cleanup PR translated Swedish test descriptions back to English (`refactor: translate feedback test descriptions to English`). Don't reintroduce that drift.

## Commit & PR format

Conventional Commits: `<type>(<scope>): <subject>`. Types in use: `feat`, `fix`, `test`, `docs`, `refactor`, `chore`. Scope is usually `admin` for admin-UI changes, omitted otherwise.

✅ `feat(admin): drag-and-drop reordering of workout exercises`
❌ `Added drag and drop`

## Admin module layout

Each admin domain lives under `src/admin/<entity>/` and follows this layout:

- `{Entity}List.tsx` — list view
- `{Entity}Form.tsx` — create/edit form
- `{entity}-api.ts` — CRUD calling `client.models.{Entity}.*`
- `*.test.ts(x)` colocated with implementation

Shared admin UI (DataTable, ConfirmDialog, SearchableSelect) lives in `src/admin/components/`. UI primitives (button, card) live in `src/components/ui/`.

## Form pattern (mandatory)

Every `*Form.tsx` under `src/admin/**` must wire up the dirty-tracking + navigation guard combo. Otherwise the back button silently discards unsaved changes.

```tsx
const { navigate: guardedNavigate, setDirty } = useNavigationGuard();
const isDirty = useFormDirtyTracking(initialValues, { name, ...rest });
useEffect(() => { setDirty(isDirty); return () => setDirty(false); }, [isDirty, setDirty]);
```

Canonical implementation: `src/admin/workouts/WorkoutForm.tsx:48-53`. Hook lives at `src/admin/hooks/useFormDirtyTracking.ts`, context at `src/admin/contexts/NavigationGuardContext.tsx`.

## Test pattern

Components that use `useNavigationGuard` must mock the context at module level — otherwise the hook throws "must be used within NavigationGuardProvider". Also mock `useFormDirtyTracking` so it doesn't run real `JSON.stringify` diffing in tests.

```ts
vi.mock('../contexts/NavigationGuardContext', () => ({
  useNavigationGuard: () => ({ navigate: mockNavigate, setDirty: vi.fn() }),
}));
vi.mock('../hooks/useFormDirtyTracking', () => ({
  useFormDirtyTracking: vi.fn(() => false),
}));
```

Working reference: `src/admin/exercises/ExerciseForm.test.tsx:60-68`. (`WorkoutForm.test.tsx` and `ProgramForm.test.tsx` are currently broken because they miss these mocks — fix in a separate PR.)

## House rules

- **Named exports only** — no `export default`.
- **Import the Amplify client from `src/admin/amplify-config.ts`** — never call `generateClient()` again.
- **Use `client.models.<Entity>` API**, not raw GraphQL strings.
- **Throw on Amplify errors:** `if (errors?.length) throw new Error(errors[0].message)` — pattern in every `*-api.ts`.
- **Wrap new admin routes in `<ProtectedRoute>`**, add `requireGroup="ADMINS"` for sensitive views (see `src/index.tsx:50-51`).
- **Tailwind utility classes inline** — no new global CSS, no CSS Modules.
- **Stone palette + orange accent `#F24E1E`** is the admin look (`bg-stone-800`, `border-stone-700`, `focus:border-[#F24E1E]`).
- **Top-level route imports** in `src/index.tsx`; no lazy loading is set up — don't introduce it ad hoc.

## Known limitations

Don't assume these exist or invent them reactively:

- **No toast/notification system.** Form errors are sticky — `setSaving(false)` runs in `finally` but the UI doesn't auto-recover.
- **No ESLint or Prettier configured.** `npm run build` (tsc) is the only autocheck.
- **No CI / GitHub Actions.** Run `npm run build` and `npm run test:run` locally before pushing.
- **`amplify_outputs.json` is intentionally committed** — public client config, not a secret.
