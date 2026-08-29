# Gravequit — Developer TODOs

---

## All Developers — ACTION REQUIRED ⚠️

### [ ] Update Local `.env` Files
**Context:** Following the fixes for BUG-015 and BUG-016, all insecure fallback secrets have been removed from the codebase.
**Action Required:** Copy `backend/.env.example` to `backend/.env` and populate `JWT_SECRET_KEY` and `ADMIN_API_KEY`. If you don't do this, `docker-compose up` will fail to start, and local development will use ephemeral JWT keys that don't persist across restarts.

### [ ] CORS Whitelist — DO NOT USE `allow_origins=["*"]` in Production
**Context:** Security audit item #14. The CORS middleware in `backend/main.py` currently allows all origins. Before deploying, replace `allow_origins=["*"]` with your actual frontend domain(s). See `SECURITY.md` for details once the fix is applied.

### [ ] Set `ADMIN_API_KEY` as Required in Production
**Context:** Security audit item #16. The `/admin/retrain` endpoint silently allows unauthenticated access if `ADMIN_API_KEY` is not set in `.env`. In production, this variable **must** be configured. See `SECURITY.md` for the code-level fix.

### [ ] Admin Roles for Developers (RBAC)
**Context:** The application now uses strict Role-Based Access Control (RBAC). The "Advisor" and "Judge Metrics" tabs/endpoints are fully protected and hidden from normal users.
**Action Required:** If you need access to the internal dashboards locally, open the `backend` folder and run `python manage_admins.py --promote <your-email>`.

### [x] Remove `SECURITY.md` Before Making Repo Public
**Context:** `SECURITY.md` documents internal security architecture and specific vulnerability details. 
**Action Taken:** We executed a full `git filter-branch` to completely scrub this file from the entire git history and force-pushed to origin. It is no longer tracked by git.

### [ ] Implement Refresh Token System (HttpOnly)
**Context:** Because Gravequit does not currently use a complex "Refresh Token" system (where a short-lived 15-minute access token is constantly refreshed in the background using an HttpOnly cookie), the expiration time on this JWT dictates exactly how long a user can stay logged into the app before they are abruptly kicked out and forced to type their password again.
**Action Required:**
- Configure `axios` interceptors on frontend to automatically handle 401s and trigger token refresh flows gracefully without booting users abruptly.
- Transition from LocalStorage to `HttpOnly` Secure cookies for all sensitive tokens (access + refresh) before production.
- Use strict `HttpOnly`, `Secure`, `SameSite=Strict` cookies to drastically improve both UX and security posture.

---

## DevOps / AI/ML (Dev B) — PENDING

### [ ] Automate ML Retraining via GitHub Actions
**Context:** The risk prediction model needs to be continuously updated with fresh data.
**Action Required:** Create a `.github/workflows/retrain.yml` cron job to automatically ping the `POST /admin/retrain` endpoint. **Crucial:** You must use GitHub Secrets for the `ADMIN_API_KEY` header and not hardcode any keys in the YAML file.

### [ ] Transition Email Provider to Resend/SendGrid
**Context:** For MVP, we are using a Gmail App Password (Option A) to send 6-digit verification codes. This doesn't scale well and has rate limits.
**Action Required:** Transition the `backend/email_utils.py` to use a professional SMTP provider like Resend or SendGrid (Option B). This requires setting up DNS records on a custom domain (e.g., `noreply@gravequit.com`) and updating the `.env` variables accordingly.

---

## Frontend (Dev C) — PENDING

### [ ] Configure Deployment Environment Variables
**Context:** Fixed BUG-017 where the API URL was hardcoded to `localhost:8000`.
**Action Required:** When deploying the frontend (e.g., to Vercel/Render), ensure you set the `VITE_API_BASE` environment variable to the production backend URL.

---

## Backend (Dev A) — COMPLETED ✅

### [x] Replace MockAuth with Real JWT Authentication
**Context:** Implemented stateless JWT Bearer token authentication in `backend/auth.py` and `backend/routers/auth.py` with password hashing (`backend/auth_utils.py`).
**Endpoints:** `POST /auth/signup`, `POST /auth/login`, `GET /auth/me`, `PATCH /auth/settings`, `DELETE /auth/account`.

### [x] Per-User Data Isolation
**Context:** All database models and endpoints (`/items`, `/patterns/summary`, `/notifications/weekly-digest`) are strictly scoped by `user_id`.

### [x] Core Items CRUD & Deletion
**Context:** `GET /items`, `POST /items`, `PATCH /items/{id}/quit`, `DELETE /items/{id}` fully operational with attached quit reasons.

### [x] Weekly Digest Email Service
**Context:** `GET /notifications/weekly-digest/preview` and `POST /notifications/weekly-digest/send` built to format gentle, empathetic weekly summaries for opted-in students.

### [x] Rate-Limiting & Production Deployment
**Context:** Added rate-limiting middleware, Dockerfile, docker-compose.yml, render.yaml, and railway.json.

### [x] Optimized Risk Score Fetching
**Context:** Modified `GET /items` to bulk-compute and attach `risk_percentage` and `driving_factor` directly to the payload, avoiding N+1 API calls.

---

## Frontend (Dev C) — COMPLETED ✅

### [x] Wire Login & Signup UI to Real Auth
**Context:** `LoginPage.jsx` wired to live backend auth endpoints, storing JWT tokens in localStorage and managing user session state in `GravequitContext.jsx`.

### [x] Render LangGraph Pipeline Data in Pattern Dashboard
**Context:** Updated `PatternDashboardPage.jsx` to render semantic clusters, risk explanation ("Why this prediction"), and similar past entries.

### [x] Thumbs Up / Down AI Summary Feedback
**Context:** Added interactive feedback widget on `PatternDashboardPage.jsx` sending ratings to `POST /patterns/feedback` and updating `AIFeedback` table.

### [x] Build "Retrain AI Model" Button on Internal Dashboard
**Context:** Added "Retrain AI Model" action button on `InternalMetricsPage.jsx` wired to `/admin/retrain` with live status feedback.

### [x] Remove Dead Mock Data & Optimize Fetches
**Context:** Deleted unused mock constants from `mockData.js` and updated `GravequitContext.jsx` to map bulk risk scores natively without spamming parallel requests.

---

## DevOps / AI/ML (Dev B) — COMPLETED ✅

### [x] Secure the `/admin/retrain` Endpoint
**Context:** Protected `/admin/retrain` with `X-Admin-Api-Key` header verification and regularized fallback training on live database items.

### [x] Weekly Digest & Multi-Agent LangGraph Pipeline
**Context:** LangGraph multi-agent pipeline (Extractor -> Pattern -> Narrator -> Why-Prediction) with 100% fact-check grounding.

### [x] Build Polish & Determinism
**Context:** Pinned all Python dependencies in `backend/requirements.txt` and created a `.dockerignore` file to protect the build context.
