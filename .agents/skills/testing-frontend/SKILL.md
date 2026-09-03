---
name: testing-frontend
description: How to run and UI-test the CostlyAI Next.js frontend (project-estimation repo), including stubbing the missing backend auth API.
---

# Testing the CostlyAI frontend

## Running the app
- `cd frontend && npm install && npm run dev` → http://localhost:3000. Ready in ~2s.
- No lint or test scripts exist in `frontend/package.json`; `npm run build` is the only static check.
- The backend (`backend/`, FastAPI) is separate and does **not** currently implement `/api/auth/*`.

## Pitfall: never run two `next dev` instances from the same checkout
Two dev servers sharing `frontend/.next` corrupt the build manifest and every route
starts returning 404/500 (`ENOENT .next/server/app/<route>/page.js`).
If you see unexpected 404s on routes that exist:
```
pkill -f "next dev"; rm -rf frontend/.next; cd frontend && nohup npm run dev > /tmp/next.log 2>&1 &
```
Run only one instance; to test a different API target, restart the single instance with a
different env var rather than starting a second one on another port.

## Pointing the frontend at a stub API
`frontend/app/login/page.jsx` and `signup/page.jsx` call
`${process.env.NEXT_PUBLIC_API_URL ?? ""}/api/auth/{login,signup}`.
With the var unset the request hits Next itself and 404s, so the success path can't be seen.
To exercise success paths, run a tiny CORS-enabled node stub (e.g. on :8010) that returns
`{"token":"..."}` and start dev with:
```
NEXT_PUBLIC_API_URL=http://localhost:8010 npm run dev
```
The stub's request log is good text evidence of the exact JSON payload posted.
Note this also redirects the pre-existing `/estimate` data calls (`/api/estimates`) to the
stub, producing harmless console 404s — don't report those as regressions.

## Auth page facts useful for assertions
- Validation is client-side only, `noValidate` on the form, errors clear per-field on change.
- Strings: "Email is required", "Password is required", "Enter a valid email address",
  "Name is required", "Use at least 8 characters", "Confirm your password",
  "Passwords do not match".
- On a non-OK response the form shows `data.detail || data.message` and otherwise falls back to
  "Invalid email or password." / "Could not create your account."; only a thrown fetch
  (network-level) yields "Could not reach the server. Please try again." A 404 from a missing
  route therefore surfaces as the credentials message, which can look misleading.
- On success the token goes to `localStorage.token` and `router.push("/estimate")` runs.
- `/forgot-password` is not implemented and 404s by design.

## Devin Secrets Needed
None — everything runs locally with no credentials.
