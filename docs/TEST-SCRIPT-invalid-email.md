# Test Script — "Invalid email" on login (QA ticket from Ray)

| | |
|---|---|
| **Ticket** | Some users can't log in: the app says "invalid email" |
| **Reported users** | Luigi Carluccio `luigi@carluccio.it`, John Silva `john@silva.com.br` |
| **Screen** | Login (`src/pages/Login.tsx`) |
| **Code under test** | `validateEmail()` and `sanitizeEmail()` in `src/utils/index.ts` |
| **Password for every test user** | `123456` |

## Preconditions

1. The fake API is running from the repo root:
   `npx json-server --watch db.json --port 3333 --host 0.0.0.0 -m ./node_modules/json-server-auth`
2. The app is running (`npx expo start` or the custom dev build) and shows the Login screen.
3. No one is logged in (if the map opens, log out first).

## Manual test cases

Steps for every case: tap **Email**, type the email, tap **Password** (this ends editing on the
email field and runs the check), type the password, tap **Log in**.

| ID | Email | Password | Expected result | Result before fix | Result after fix |
|---|---|---|---|---|---|
| TC-01 | `luigi@carluccio.it` | `123456` | No "invalid email". Map opens. | ❌ "invalid email" shown, red border, stays on Login | |
| TC-02 | `john@silva.com.br` | `123456` | No "invalid email". Map opens. | ❌ "invalid email" shown, red border, stays on Login | |
| TC-03 | `ulla.ulriksen@example.com` | `123456` | Map opens (control: `.com` users already worked). | ✅ | |
| TC-04 | `  Luigi@Carluccio.IT ` (spaces + capitals) | `123456` | Map opens (email is trimmed and lowercased). | ❌ "invalid email" | |
| TC-05 | `luigi@carluccio` | `123456` | "invalid email" shown, server not called. | ✅ | |
| TC-06 | `luigi.carluccio.it` | `123456` | "invalid email" shown. | ✅ | |
| TC-07 | `ulla.ulriksen@example.com` | `123` | "invalid password" shown, no "invalid email". | ✅ | |
| TC-08 | `aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa` (34 letters, no @) | `123456` | "invalid email" appears straight away; app stays responsive. | ⚠️ App freezes for several seconds before showing the error | |

Fill in the **Result after fix** column when you run the script after the fix, and attach a
screenshot (or a short screen recording) for TC-01, TC-02 and TC-08.

## Automated tests (cover the same cases)

```bash
npm test
```

- `src/utils/__tests__/validateEmail.test.ts` — 39 unit tests on `validateEmail` / `sanitizeEmail`:
  the reported users, every user in `db.json`, other valid emails (2-letter, 4+ letter and
  multi-part domains, subdomains, hyphens, `+` tags, capitals, spaces), invalid emails that must
  still be rejected, and a speed check on long input.
- `src/pages/__tests__/Login.test.tsx` — 6 screen tests. The API, cache and navigation are mocked,
  so no server is needed. They type into the real Login screen and check the error text, what is
  sent to the API, and that the map is opened.

Saved runs: `docs/test-run-before-fix.txt` (16 failed / 29 passed) and
`docs/test-run-after-fix.txt` (45 passed).

## Root causes found

1. **The domain ending had to be exactly 3 letters.** The old regex ended in `(\.\w{3})+$`, so every
   part after the last dots had to be 3 characters long. `.com` passes, but `.it` (2 letters) fails,
   and `.com.br` fails on `.br`. Any country domain (`.ca`, `.uk`, `.br`, `.it`) or a longer one
   (`.info`) was rejected.
2. **The regex could freeze the app.** Patterns like `\w+([\.-]?\w+)*` can match the same letters in
   many different ways. On a long input that fails (e.g. a name typed without `@`) the regex engine
   tries all of them: 26 letters ≈ 40 ms, 32 letters ≈ 2 s on a laptop, and it doubles with every
   extra letter. On a phone the UI would hang.

## Fix

`src/utils/index.ts` — new pattern:

```
^[\w+-]+(\.[\w+-]+)*@([a-z0-9-]+\.)+[a-z]{2,}$
```

- Ending: 2 or more letters (`[a-z]{2,}`) instead of exactly 3.
- Domain: one or more `part.` groups, so `silva.com.br` works.
- Every part is separated by a required dot, so there is only one way to match: no freezing.
- `validateEmail` now reuses `sanitizeEmail` instead of repeating its code.
