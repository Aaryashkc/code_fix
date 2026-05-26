# Yatra Codebase Audit Report

Audit date: 2026-05-26  
Scope: `backend/` and `frontend/`, excluding generated dependency source under `node_modules/`  
Method: static review of application code and configuration, package vulnerability audit, lint, tests, and frontend production build verification.

## Executive Summary

Yatra is a Next.js frontend backed by an Express/Mongoose API with cookie authentication, eSewa and cash payment flows, admin/guide/tourist roles, map content, AI itinerary generation, notifications, and Socket.IO live trip features.

The application already contains useful controls: HTTP-only authentication cookies, role checks on many HTTP endpoints, password hashing, hashed OTP storage, payment signature and provider status checks, Helmet, CORS checks, rate limiting, booking ownership checks, upload size limits, and test coverage around authentication and payments.

However, this review identified security and correctness gaps requiring work before production deployment:

| Severity | Count | Main themes |
| --- | ---: | --- |
| High | 4 | Place moderation bypass, vulnerable production dependencies, unauthorized socket event relay, suspended-account access |
| Medium | 8 | Token exposure, broken real-time auth, OTP environment leakage, password session revocation, privacy mutation, fake verified reviews, payout race/integrity, verbose error leakage |
| Low | 4 | Weak phone verification integration, cache isolation, frontend middleware trust, quality debt |

Immediate priorities:

1. Fix destination publication/moderation logic and remove unauthorized public content exposure.
2. Upgrade vulnerable direct dependencies, especially `next`, `axios`, `multer`, and `express-rate-limit`.
3. Redesign socket authentication and authorize every booking socket event against the database.
4. Enforce suspended/unverified account restrictions on every authenticated request and active socket.
5. Remove bearer token exposure from OTP login and return to a single cookie-only session model.

## System Overview

### Backend

- Runtime: Node.js, Express 5, MongoDB through Mongoose.
- Authentication: signed JWT stored in an HTTP-only `token` cookie; token blacklist on logout.
- Roles: `tourist`, `guide`, `admin`.
- Major domains: auth/OTP, destinations, bookings/negotiation, payments, payouts/commissions, reviews, map pins, AI trips, notifications, live trips, Socket.IO.
- External integrations: email/SMTP, Cloudinary, eSewa, optional AI providers.

### Frontend

- Runtime: Next.js 16 App Router, React 19.
- Authentication state: API requests use cookie credentials.
- Access UX: `frontend/proxy.ts` redirects protected pages using a decoded JWT.
- Real time: Socket.IO provider and notification context.
- Mapping: Leaflet and Overpass service.

### Sensitive Data Located

- `backend/.env` exists and contains configured credential-shaped values including JWT, payment, email, and integration configuration. It is ignored by `.gitignore`.
- `frontend/.env.local` exists and is ignored by `.gitignore`.
- This report intentionally does not reproduce any environment value.

Recommended secret handling:

- Keep actual `.env` files untracked and never attach them to issues or commits.
- Use deployment secret storage for production.
- Rotate any credential that has ever been shared outside the intended environment.
- Keep `.env.example` restricted to placeholders or publicly documented sandbox credentials.

## Confirmed Findings

### F-01: Guides Can Self-Publish Approved Public Destinations

Severity: High  
Category: Broken access control / content integrity

Evidence:

- `backend/src/routes/destinationRoutes.js:30` permits both admins and guides to create destinations.
- `backend/src/controllers/destinationController.js:145-159` writes `req.body` directly with `Destination.create(req.body)`.
- `backend/src/models/Destination.js:68-80` defaults `published` to `true` and `verificationStatus` to `approved`.
- `backend/src/controllers/destinationController.js:6-13`, `31-72`, and `86-100` serve featured, list, and detail destination data without restricting results to published and approved entries.

Impact:

- Any authenticated guide can create a destination that appears immediately approved and public.
- A guide can provide `addedBy`, publication status, verification state, rating, or review count fields in the request body.
- Even rejected or unpublished entries can be returned by multiple public endpoints.
- This defeats the admin moderation interface and misleads users who rely on verified listings.

Fix:

- Split admin creation and guide submission logic.
- For guide submissions, build an allowlisted object server-side and force:
  - `addedBy = req.user.id`
  - `verificationStatus = 'pending'`
  - `published = false`
  - `rating = 0`
  - `reviewCount = 0`
- For public list, featured, nearby, search, and detail endpoints, require `{ published: true, verificationStatus: 'approved' }`.
- Add tests proving a guide cannot publish or approve a submission and rejected/unpublished places are never returned publicly.

### F-02: Production Dependencies Contain Known High-Severity Advisories

Severity: High  
Category: Supply chain / known vulnerable components

Evidence:

- `npm.cmd audit --json --package-lock-only` reports 16 backend vulnerabilities: 8 high and 8 moderate.
- Direct backend dependencies with advisories include:
  - `axios` from `backend/package-lock.json` (`1.13.5`)
  - `express-rate-limit` (`8.2.1`)
  - `multer` (`2.0.2`)
  - `nodemailer` (`8.0.1`)
- `npm.cmd audit --json --package-lock-only` reports 14 frontend vulnerabilities: 5 high and 9 moderate.
- Direct frontend dependencies with advisories include:
  - `next` (`16.1.6`)
  - `axios` (`1.13.4`)
  - `postcss`
  - `vitest` for development tooling
- Notable frontend `next` advisories include middleware/proxy bypass and denial-of-service reports; npm reports `next@16.2.6` as an available non-major fix.

Impact:

- The application is exposed to patched vulnerabilities in web serving, middleware/proxy handling, uploads, outbound HTTP, rate-limit bypass, and real-time transitive components.
- `multer` and `express-rate-limit` issues affect directly exposed backend controls.
- Vulnerable Next.js proxy behavior matters because page protection is implemented in `frontend/proxy.ts`.

Fix:

- Upgrade and retest direct production packages immediately:
  - Frontend: upgrade `next` to at least the npm-recommended fixed release, upgrade `axios`, and update `postcss`.
  - Backend: upgrade `axios`, `express-rate-limit`, `multer`, `nodemailer`, and Socket.IO/transitive packages to fixed versions.
- Run `npm audit` again after upgrading and record residual dev-only advisories separately.
- Add automated dependency auditing and lockfile update review to CI.

### F-03: Socket Booking Events Are Relayed Without Booking Authorization

Severity: High  
Category: Broken object-level authorization / event forgery

Evidence:

- `backend/src/server.js:172-228` accepts `booking:counter-offer`, `booking:accept-price`, and `booking:decline` events.
- The handlers check basic identifier and number formatting, but do not load the booking or confirm that the sender and `targetUserId` are the booking participants.
- Events are routed directly to a connected target user selected by the sender.
- OTP login currently exposes a token usable by the socket client (`backend/src/controllers/authController.js:697-714`, `frontend/app/login-otp/page.tsx:78-86`).

Impact:

- An authenticated socket user can deliver fabricated price, acceptance, or decline events to arbitrary connected users when their IDs are known.
- Even where the HTTP booking state remains unchanged, clients can be deceived by forged real-time UI events, causing user confusion and social-engineering opportunities.

Fix:

- Do not accept `targetUserId` as authority.
- Load the booking for each event and calculate the opposite participant server-side.
- Verify the actor is the tourist or guide assigned to the booking and that the state permits the event.
- Prefer broadcasting real-time updates only after the corresponding authorized HTTP mutation succeeds, or share one authorization/business-logic service between HTTP and sockets.
- Add socket integration tests for unauthorized event attempts.

### F-04: Suspended Guides Can Continue Using Protected Guide APIs

Severity: High  
Category: Account enforcement failure

Evidence:

- Login blocks suspended accounts in `backend/src/controllers/authController.js:145-156` and `681-695`.
- Administrative suspension sets `suspended: true`, `verified: false`, and `available: false` at `backend/src/controllers/authController.js:915-932`.
- `backend/src/middleware/auth.js:16-53` loads the current user for each protected request but checks only existence, not `suspended` or required verification status.
- Role authorization then uses `req.user.role`; suspension does not remove the `guide` role.

Impact:

- A guide already logged in before suspension can continue accessing guide routes until token expiry or logout.
- This includes booking handling, payout requests, destination submissions, and live-trip access.
- Active sockets are also not disconnected when an admin suspends an account.

Fix:

- In `protect`, reject suspended accounts globally and define whether unverified guide accounts are permitted any authenticated guide action.
- Revoke active sessions when suspending or resetting sensitive account state by using token/session versioning or a per-user revocation timestamp.
- Disconnect or revalidate active sockets after suspension.
- Add tests for an authenticated guide that is suspended after login.

### F-05: OTP Login Exposes JWT to JavaScript and Stores It in Local Storage

Severity: Medium  
Category: Session token exposure / XSS amplification

Evidence:

- Standard login comments state auth is cookie-only and deliberately avoids local storage (`frontend/lib/auth.ts:48-52`, `frontend/lib/api.ts:19-22`).
- OTP login returns the JWT in its JSON response at `backend/src/controllers/authController.js:697-714`.
- The frontend stores that token in local storage at `frontend/app/login-otp/page.tsx:78-86`.

Impact:

- Any successful XSS or malicious browser script can read a seven-day bearer token for OTP-authenticated sessions.
- The application has two inconsistent authentication models, making logout, revocation, and socket behavior harder to reason about.

Fix:

- Remove `token` from the OTP verification JSON response.
- Remove local-storage token storage and cleanup code.
- Use only the HTTP-only cookie for all login paths.
- Adapt the socket authentication design without making bearer tokens readable by application JavaScript.

### F-06: Cookie-Authenticated Users Cannot Establish Real-Time Socket Sessions

Severity: Medium  
Category: Functional security integration defect

Evidence:

- Normal password login sets only an HTTP-only cookie and does not store a JavaScript token (`frontend/lib/auth.ts:48-53`).
- `frontend/context/SocketContext.tsx:84-93` reads only `window.localStorage.getItem('token')` and sends that token in Socket.IO auth.
- `backend/src/server.js:111-130` accepts only `socket.handshake.auth.token`; it does not authenticate from the cookie.

Impact:

- Users who sign in through the normal secure login flow cannot connect to notifications, online-guide presence, booking events, or live-trip socket functionality.
- OTP users may connect only because of the less secure local-storage token behavior in F-05.

Fix:

- Authenticate Socket.IO handshakes from the same HTTP-only cookie used for the API, parsing `socket.request.headers.cookie` safely.
- Keep origin restrictions and validate token blacklist/account state during handshake.
- Remove frontend local-storage dependency.
- Test both password login and OTP login with socket connection and logout invalidation.

### F-07: Registration OTP Is Returned Outside Explicit Development Mode

Severity: Medium  
Category: Verification bypass under configuration error

Evidence:

- `backend/src/controllers/registration-otp.js:86-101` returns `devOtp` whenever email delivery fails and `NODE_ENV !== 'production'`.
- `backend/src/config/envValidation.js:61-64` defaults a missing `NODE_ENV` to `development`.
- Other OTP paths already use the stricter explicit check `NODE_ENV === 'development'` (`backend/src/controllers/authController.js:598-606`, `998-1009`).

Impact:

- A staging, test-like, or accidentally misconfigured deployed environment can disclose registration OTPs directly to callers.
- If public registration is enabled there, email verification can be bypassed.

Fix:

- Return OTP values only behind an explicit local-development flag, ideally disabled by default even in development.
- Replace the condition with `NODE_ENV === 'development' && ALLOW_DEV_OTP_RESPONSE === 'true'`.
- Treat missing `NODE_ENV` as a startup failure in any deployed environment.

### F-08: Password Changes Do Not Revoke Existing Sessions

Severity: Medium  
Category: Session lifecycle

Evidence:

- JWT lifetime defaults to seven days in `backend/src/utils/jwt.js:5-14`.
- Password reset changes the password but does not revoke prior tokens at `backend/src/controllers/authController.js:346-394`.
- Admin reset similarly changes the password without session revocation at `backend/src/controllers/authController.js:1174-1217`.
- Token blacklisting occurs only for the token used during logout (`backend/src/controllers/authController.js:251-273`).

Impact:

- A stolen cookie or token remains valid after the account owner or an administrator resets the password.
- A reset operation cannot reliably recover a compromised account.

Fix:

- Add `sessionVersion` or `tokensValidAfter` to the user record and validate it in `protect` and socket handshake.
- Increment/reset it on password change, suspension, role change, and explicit "sign out all devices".
- Keep per-token blacklist for ordinary single-session logout if needed.

### F-09: Any Authenticated User Can Modify a Private Pin by Adding Comments

Severity: Medium  
Category: Broken object-level authorization / privacy

Evidence:

- Private pin reads are hidden in `backend/src/controllers/mapPinController.js:163-194`.
- `backend/src/routes/mapPinRoutes.js:22` exposes comment creation to any authenticated user.
- `backend/src/controllers/mapPinController.js:311-349` adds a comment after locating a pin by ID, without checking `visibility` or ownership.

Impact:

- A user who learns or guesses a private pin ID can mutate private content and confirm that an object exists through behavior differences.

Fix:

- Allow comments only on public pins, or allow the owner explicitly if that is a supported feature.
- Return the same non-disclosing response for unauthorized private resources.
- Add access-control tests around private pin mutation.

### F-10: Destination Reviews Are Labeled Verified Without Any Visit or Booking Proof

Severity: Medium  
Category: Reputation integrity

Evidence:

- `backend/src/routes/reviewRoutes.js:15` permits any tourist or guide to post a destination review.
- `backend/src/controllers/reviewController.js:248-315` checks only destination existence and duplicate review by account.
- New destination reviews are written with `verified: true` at line 295 without checking a completed booking, trip, or visit relationship.

Impact:

- New accounts can create "verified" ratings for destinations they never visited.
- Ratings may be manipulated and shown as trusted platform feedback.

Fix:

- Define `verified` as evidence-based and set it only for completed bookings or another auditable eligibility rule.
- Allow unverified reviews only if product policy supports them and display them distinctly.
- Add abuse controls and rating-integrity tests.

### F-11: Payout Creation and Claiming Are Not Atomic

Severity: Medium  
Category: Financial integrity / race condition

Evidence:

- Admin payout creation first reads pending commissions, creates a payout, and then marks commission records paid out (`backend/src/controllers/payoutController.js:53-109`).
- Guide payout request similarly reads pending commissions and creates a payout request without atomically reserving those commissions (`backend/src/controllers/payoutController.js:238-278`).
- There is no unique constraint preventing the same commission from appearing in multiple pending or concurrent payout records (`backend/src/models/Payout.js:3-47`).

Impact:

- Concurrent payout operations may claim the same commission more than once or create inconsistent payout records.
- This can result in duplicate processing or manual reconciliation work.

Fix:

- Reserve commissions atomically inside a MongoDB transaction where supported, or use conditional update operations that claim only still-pending records.
- Add an explicit payout state such as `reserved` and a uniqueness/consistency strategy for commission-to-payout assignment.
- Test concurrent requests.

### F-12: Several Production Error Responses Leak Internal Error Details

Severity: Medium  
Category: Information disclosure

Evidence:

- Multiple controllers return `error: error.message` unconditionally, including booking failures (`backend/src/controllers/bookingController.js:121-126`, `207-209`, `350-352`, and others), review failures (`backend/src/controllers/reviewController.js:93-98`, `127-132`, and others), commission failures, payout failures, and guide failures.
- Some auth/payment handlers already correctly gate detail on development, showing the intended pattern.

Impact:

- Database validation, cast, duplicate-index, integration, or implementation detail messages can be exposed to clients in production.
- Such details help endpoint probing and can reveal data/schema assumptions.

Fix:

- Route all asynchronous errors through one production-safe error handler.
- Emit generic client messages in production and log detailed structured diagnostics server-side with a request identifier.
- Add tests ensuring production responses do not include raw error details.

## Lower-Severity and Engineering Issues

### L-01: Phone Verification Can Be Bypassed or Becomes Semantically Meaningless

Severity: Low

- `backend/src/controllers/authController.js:213-246` permits an authenticated user to update the `phone` field directly.
- `sendPhoneOTP` and `verifyPhoneOTP` create/verify OTP records, but verification does not bind the verified phone to a user or set `User.phoneVerified`.
- A profile update can therefore claim a phone number without completing phone verification.

Fix:

- Use a pending phone field, require authenticated verification, atomically set `phone` and `phoneVerified`, and prevent direct updates to verified contact data.

### L-02: Frontend GET Cache Is Not Scoped to Authentication State

Severity: Low

- `frontend/lib/api.ts:44-70` stores responses by URL only and does not clear the cache on login/logout or user change.

Impact:

- When `cachedGet` is used for authenticated resources in a shared browser session, brief stale data from the prior user can be shown after an account switch.

Fix:

- Clear caches when auth state changes or include an auth/session generation in cache keys.

### L-03: Frontend Proxy Decodes, But Does Not Cryptographically Verify, JWT Roles

Severity: Low as an authorization control, because the backend still protects APIs

- `frontend/proxy.ts:57-108` uses `jwtDecode` to route/redirect protected pages and role areas.

Impact:

- A forged cookie can make protected UI shells render or change routing behavior before protected API calls fail.
- It must not be treated as authorization enforcement.

Fix:

- Keep authorization on the backend as the source of truth.
- For better UX integrity, verify sessions through server-side authenticated requests or a cryptographically verified server session mechanism.
- Upgrade Next.js first because current proxy/middleware advisories directly affect this boundary.

### L-04: Frontend Quality Debt Is Large Enough to Hide Regressions

Severity: Low

- `npm.cmd run lint` in `frontend/` completes with 172 warnings.
- Warning groups include missing React hook dependencies, `any` usage, unused variables/imports, and state updates invoked from effects.
- High-interaction map, payment-return, admin, and guide pages account for many warnings.

Fix:

- Establish a warning budget and reduce warnings module by module.
- Prioritize hook dependency warnings in payment, maps, guides, and auth-sensitive views.
- Configure CI to prevent new warnings once the baseline is reduced.

## Additional Hardening Observations

These are defense-in-depth improvements rather than confirmed exploits in the current data flow:

- `frontend/components/ui/chart.tsx:70-100` emits CSS using `dangerouslySetInnerHTML`. Current usage should ensure chart IDs and color configuration cannot originate from untrusted API content; validate or constrain values if that changes.
- Upload filtering in `backend/src/middleware/upload.js:5-21` checks MIME type and file extension only. Add file-signature validation and safe image processing before serving uploaded content.
- Public guide search uses regular expressions in `backend/src/controllers/guideController.js:39-43`; escape user input and bound length to reduce expensive regex behavior.
- Route-level validation helpers exist, but many write routes rely on ad hoc controller validation. Introduce consistent request schemas for payments, destinations, reviews, map pins, payout fields, and AI prompts.
- `backend/src/controllers/aiController.js` permits configurable compatible-provider base URLs. Treat this configuration as administrator-controlled only, enforce HTTPS for remote providers, and prevent accidental internal network targeting in deployed configuration.

## Controls Confirmed During Review

The following controls are present and should be retained while fixing findings:

- HTTP-only cookie configuration with `SameSite=Lax` and production `Secure` flag at `backend/src/middleware/cookieAuth.js:1-19`.
- Hashed passwords using bcrypt at `backend/src/models/User.js:110-121`.
- Hashed OTP storage and bounded OTP attempt records at `backend/src/utils/otp.js:8-17` and `backend/src/models/OTP.js:27-60`.
- Public registration role assignment forced to tourist at `backend/src/controllers/authController.js:45-62`.
- Booking ownership enforcement in booking/payment endpoints.
- eSewa signature verification, amount comparison, provider status confirmation, and idempotent paid update at `backend/src/controllers/paymentController.js:142-343`.
- Helmet, CORS configuration, global/auth/OTP rate limiting, and production missing-origin checks at `backend/src/app.js:44-148`.
- Live-trip location handler performs booking access checks; the unauthorised event relay issue is in the separate negotiation relay handlers in `server.js`.

## Validation Results

Commands executed:

| Check | Result |
| --- | --- |
| `backend: npm.cmd test -- --runInBand` | Passed: 5 suites, 25 tests |
| `backend: npm.cmd run lint` | Passed with no reported lint findings |
| `frontend: npm.cmd run test -- --run` | Passed: 2 files, 11 tests |
| `frontend: npm.cmd run lint` | Completed with 172 warnings, 0 errors |
| `frontend: npm.cmd run build` | Passed after network access allowed Google Fonts retrieval |
| `backend: npm.cmd audit --json --package-lock-only` | 16 vulnerabilities: 8 high, 8 moderate |
| `frontend: npm.cmd audit --json --package-lock-only` | 14 vulnerabilities: 5 high, 9 moderate |

Notes:

- The first build attempt failed because the restricted environment could not retrieve Google Fonts referenced by `frontend/app/layout.tsx`; the same production build succeeded with required network access.
- Backend tests produce expected console error output while simulating failed email/provider interactions; the suites nevertheless pass.

## Remediation Roadmap

### Phase 1: Block High-Risk Behavior

1. Force guide destination submissions into pending/unpublished state, allowlist fields, and restrict every public destination query to approved/public records.
2. Upgrade direct vulnerable production dependencies and rerun security audit, tests, lint, and build.
3. Disable unauthorised socket negotiation relays until they perform participant and state validation.
4. Reject suspended users in `protect` and socket handshakes; revoke active sessions when suspension occurs.

### Phase 2: Normalize Authentication and Privacy

1. Remove JWTs from OTP response bodies and browser local storage.
2. Authenticate sockets using secure cookie sessions and validate account state.
3. Add session invalidation on password reset, role changes, suspension, and "logout all".
4. Require authorization before commenting on private pins.
5. Restrict `devOtp` behavior to explicitly enabled local development only.

### Phase 3: Financial and Reputation Integrity

1. Make commission reservation and payout creation atomic.
2. Define verified-review eligibility and enforce it server-side.
3. Correct phone verification binding and profile update rules.
4. Standardize production-safe API error output.

### Phase 4: Maintainability and Assurance

1. Add tests for each fixed finding, especially authorization failures and concurrent payout operations.
2. Reduce frontend lint warnings, beginning with hooks in payment/auth/map paths.
3. Introduce consistent request schema validation for every mutation endpoint.
4. Add CI checks for tests, lint policy, build, and dependency advisory thresholds.

## Suggested Test Cases to Add

| Area | Test case |
| --- | --- |
| Destinations | Guide-created destination is forced pending/unpublished and excluded from every public endpoint |
| Destinations | Rejected and unpublished entries cannot be retrieved by public detail, list, featured, nearby, or search endpoints |
| Sockets | Non-participant cannot send booking counter/accept/decline events to either participant |
| Sockets | Password-cookie login establishes socket; logout/suspension invalidates it |
| Auth | OTP login response contains no bearer token and leaves local storage empty |
| Auth | Suspended guide with pre-existing cookie receives `403` on guide APIs |
| Auth | Password reset invalidates pre-existing sessions |
| OTP | `devOtp` is never returned without explicit local-development configuration |
| Pins | Other user cannot comment on private pin |
| Reviews | Destination review cannot be marked verified without approved eligibility |
| Payouts | Concurrent payout requests cannot reserve the same commission twice |
| Errors | Production API error response does not include raw internal messages |

## Limitations

- This was a source-level and local validation audit, not a live penetration test against a deployed instance.
- External service credentials and provider behavior were not exercised with real payments, email delivery, Cloudinary uploads, or AI provider calls.
- No secret values were copied into this report.
- A clean result after fixes still requires deployment configuration review, database/index migration verification, and runtime testing in the target environment.
