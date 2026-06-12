# Onboard subscribers — admin feature plan

Admins can onboard new subscribers from the admin portal instead of doing it manually in the AWS console.

## Two entry paths

1. **Manual** — type an email + subscription end date, add to the table.
2. **CSV import** — upload a file containing only email addresses; each becomes a row.

All created users land in the Cognito **SUBSCRIBERS** group and get a `User` record in DynamoDB with `subscriberUntil` (subscription end date).

## Architecture — two repos

Creating Cognito users requires `AdminCreateUser`/`AdminAddUserToGroup`, which need admin credentials and **cannot run from the browser**. So the feature is split:

| Part | Repo | What |
|------|------|------|
| **1. Backend** | `apt-backend` | New custom mutation `adminCreateSubscriber` (Lambda). Creates Cognito user, adds to `SUBSCRIBERS`, upserts `User` record. ADMINS-only. **Tracked separately in apt-backend** (branch `feat/admin-create-subscriber`). |
| **2. Frontend** | `apt-web` (this repo) | Admin UI under `src/admin/users/`. Built against a mockable `createSubscriber` API until backend is deployed. |

### Backend mutation contract (what the frontend expects)

```
adminCreateSubscriber(email: String!, subscriberUntil: AWSDateTime!)
  : { email: String!, status: String!, tempPassword: String, message: String }
```

`status` ∈ `created` | `exists` | `error`. `tempPassword` is set on `created`. After backend deploy, `amplify_outputs.json` in this repo must be refreshed so `client.mutations.adminCreateSubscriber` exists.

## Decisions

- **Subscription period:** native date picker → explicit end date stored as `subscriberUntil`.
- **Passwords:** CSV holds only emails. Backend generates a random temp password per user; users use "Glömt lösenord" to set their own. (Emailing temp passwords via the company mail service is a possible follow-up, not MVP.)
- **UI design:** one page, a single inline-editable staging table (quick-add row + CSV import → same table), per-row status, "Skapa alla".
- **Access:** ADMINS-only.

## Frontend files (`src/admin/users/`)

- `user-api.ts` — `createSubscriber(email, subscriberUntil)` wrapping `client.mutations.adminCreateSubscriber`, throwing on Amplify errors.
- `parseCsvEmails.ts` — pure util: parse text → `{ valid, invalid }`, trim/dedupe/validate, no external lib.
- `UserOnboard.tsx` — the page (design A). Quick-add row, CSV import, editable table, per-row status, generated-password reveal/copy. Wires `useNavigationGuard` + `useFormDirtyTracking`.
- `parseCsvEmails.test.ts`, `UserOnboard.test.tsx` — colocated tests (mock NavigationGuardContext + useFormDirtyTracking).

Routing: ADMINS-protected `/admin/users` route in `src/index.tsx`; nav item in `src/admin/layout/AdminLayout.tsx`.

## Manual test plan (Svenska)

1. Logga in som ADMINS-användare → "Users" i sidomenyn.
2. Lägg till en användare manuellt (e-post + slutdatum) → "Skapa alla" → status klar, temp-lösenord visas och går att kopiera.
3. Importera en CSV med 3–5 e-postadresser → rader får default-slutdatum (från första angivna datumet) → ändra ett datum manuellt → "Skapa alla".
4. Verifiera i Cognito att användarna ligger i gruppen **SUBSCRIBERS**.
5. Verifiera `User`-record med rätt `email` + `subscriberUntil`.
6. Testa "Glömt lösenord"-flödet för en skapad användare.
7. Negativt: importera en redan existerande e-post → raden visar `exists`, ingen dubblett skapas.
