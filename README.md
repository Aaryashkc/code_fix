# Yatra

**Explore Nepal with local guides, planned journeys, live safety tracking, and managed travel operations.**

Yatra is a full-stack travel marketplace focused on Nepal. It connects travelers with local guides, exposes curated destinations and map-based exploration, supports trip and itinerary planning, manages guide booking negotiations and payments, and gives administrators the tools to approve content, monitor live trips, handle commissions, and process guide payouts.

The application is built as:

- A **Next.js frontend** for the public website and role-specific workspaces.
- An **Express and MongoDB API** for authentication, destinations, bookings, payments, reviews, trips, administration, and reporting.
- A **Socket.IO real-time layer** for guide online status, notifications, booking updates, live location sharing, and SOS alerts.

## Table Of Contents

1. [What Yatra Does](#what-yatra-does)
2. [Roles And Access](#roles-and-access)
3. [Feature Reference](#feature-reference)
4. [Application Screens](#application-screens)
5. [Core User Flows](#core-user-flows)
6. [Architecture And Technology](#architecture-and-technology)
7. [Backend API Reference](#backend-api-reference)
8. [Real-Time Events](#real-time-events)
9. [Data Model](#data-model)
10. [Security And Operational Behavior](#security-and-operational-behavior)
11. [Setup And Installation](#setup-and-installation)
12. [Environment Variables](#environment-variables)
13. [Available Scripts](#available-scripts)
14. [Testing](#testing)
15. [Project Structure](#project-structure)
16. [Implementation Notes](#implementation-notes)

## What Yatra Does

Yatra combines discovery, planning, booking, and platform management into one travel application.

| Area | What is included |
| --- | --- |
| Destination discovery | Public landing content, destination catalogue, details, categories, regions, ratings, nearby search, featured places, and interactive maps |
| Traveler planning | Saved places, trip builder, day ordering, route optimization, AI/smart itinerary generation, route food-stop discovery, and guide matching |
| Guide marketplace | Public guide profiles, specializations, languages, price per day, reviews, availability, booking requests, and negotiations |
| Booking lifecycle | Request, price offer, counter-offer, revised offer, price acceptance, direct acceptance, decline, cancellation, expiry, payment, completion, and review |
| Payments and earnings | eSewa checkout, cash selection and confirmation, completed-trip commissions, guide payout requests, admin payout processing, and CSV exports |
| Safety and live operations | Authenticated live trip rooms, traveler position sharing, guide/admin monitoring, SOS alert broadcasting, and persisted live event history |
| Administration | User and guide management, destination approval, booking oversight, analytics, commission settings, payouts, and live-map monitoring |

## Roles And Access

### Traveler (`tourist`)

Public registration creates only a traveler account. Travelers can:

- Browse approved and published destinations and guide profiles.
- Save destinations to their wishlist.
- Create and manage personal trip plans.
- Generate a smart itinerary from trip length, budget, theme, and destination focus.
- Optimize planned routes and view food or cafe stops found along a route.
- Request a guide booking and negotiate the price.
- Pay for confirmed bookings using eSewa or select cash payment.
- Enter an active-trip view, share location, and trigger SOS.
- Submit destination reviews and post-trip guide reviews.
- Manage profile data, emergency contact information, and travel preferences.

### Guide (`guide`)

Guide accounts are created and managed by administrators. Verified guides can:

- Maintain public guide information including bio, pricing, language skills, specializations, and availability.
- Toggle online/available status so travelers can discover currently available guides.
- Receive booking requests and handle the negotiation lifecycle.
- Accept, counter, or decline requests; confirm cash receipt; complete paid trips.
- Submit destinations for admin approval.
- Monitor confirmed live trips and see traveler location or SOS activity.
- Read and publicly respond to reviews.
- View earned commission records and request payout of available earnings.

### Administrator (`admin`)

Administrators operate the platform. They can:

- View platform dashboard metrics and analytics.
- Create guide accounts, edit them, approve or revoke them, suspend users, and reset guide passwords.
- Review destination submissions, approve or reject places, and edit published destination data.
- Inspect all bookings and operational statuses.
- Watch eligible trips on a live map and see SOS alerts and event history.
- Configure platform commission rates and per-guide overrides.
- Process payout requests, update payout states, and export payout reports to CSV.

### Authentication Rules

- Protected API requests use a JWT stored in an **HTTP-only cookie** named `token`.
- A protected request is allowed only when the user is present, verified, and not suspended.
- The frontend routes users to their role-specific dashboard after login.
- The Next.js proxy performs early route redirects by role; the backend remains the authoritative permission layer.
- Socket connections use the same cookie authentication and recheck account restrictions during active sessions.

## Feature Reference

### Public Experience

- Marketing landing page with navigation, hero content, feature explanation, featured destinations, how-it-works content, testimonials, and footer.
- Responsive UI with desktop layouts, mobile navigation, loading skeletons, toast feedback, global error boundaries, and light/dark theme support.
- Progressive Web App manifest metadata for standalone display, theme colors, app shortcuts, and mobile presentation.
- Public destination browsing and public guide detail pages.

### Authentication And Account Management

- Password login with optional persistent session behavior through the auth cookie.
- OTP login workflow by email.
- Registration OTP confirmation before a traveler account can be created.
- Registration marks an OTP-confirmed email as verified immediately and also attempts to send an email verification link.
- Forgot-password email flow and token-based reset page.
- Phone OTP endpoints available on the API for phone verification.
- Logout blacklists the current token and clears the authentication cookie.
- Profile editing for traveler and guide account information.
- Admin-side user verification, suspension, revocation, editing, guide creation, and password reset handling.
- Guide-originated password reset requests recorded for administrators to action.

### Destinations And Places

- Destinations contain names, slugs, categories, regions, descriptions, media URLs, rating information, cost bands, seasons, durations, difficulty, coordinates, features, and nearby attractions.
- Public data is limited to places that are both `published: true` and `verificationStatus: approved`.
- Destination categories: `Religious`, `Nature`, `Adventure`, `Cultural`, and `Urban`.
- Destination regions: `Eastern`, `Central`, `Western`, and `Far-Western`.
- Public catalogue filtering, search, featured listing, and nearby geospatial lookup.
- Traveler recommendation API based on profile preferences.
- Guide destination submission flow: submitted places begin as pending and unpublished.
- Admin moderation flow: approve to publish, or reject with an optional reason.
- Destination reviews update aggregate destination ratings and review counts.

### Maps, Pins, And Location-Based Discovery

- Leaflet-based maps using configurable OpenStreetMap tile URLs.
- Destination marker browsing, category/search filtering, current location support, map selection, and Google Maps directions links.
- Personal map pins with title, description, category, rating, photos, date, visibility, tags, comments, and geospatial coordinates.
- Public and nearby pin lookups as well as personal pin management.
- Route visualization in the trip planner.
- Food stop discovery through the OpenStreetMap Overpass API for cafes, restaurants, and fast-food places near a route.
- Route snack filtering, proximity deduplication, ordering along the route, and planned-stop selection.

### Wishlist And Trip Planner

- One saved wishlist per authenticated user.
- Add and remove destination actions from exploration/detail views.
- Trip creation, renaming, updating, loading, and deletion.
- Day-by-day destination organization with manual reordering.
- Nearest-stop route optimization using backend route calculations.
- Estimated optimized route distance returned by the API.
- Saved snack stops per trip, with an upper limit of 20 stops.
- Snack stops persist name, location, amenity type, Overpass identifier, and order along the route.

### Smart Itinerary Generation

Travelers can submit:

- Number of days, limited by the backend to 1 through 14.
- Budget in NPR.
- Theme such as culture, adventure, nature, religious/spiritual, or urban.
- A destination focus label such as Nepal, Pokhara, or Kathmandu Valley.

The backend:

1. Reads approved, published destinations from MongoDB.
2. Attempts configured providers in order.
3. Validates model output against the expected itinerary structure.
4. Resolves only destinations present in the application catalogue.
5. Falls back to a built-in recommendation heuristic whenever a provider is absent, unavailable, or returns unusable output.
6. Saves the generated result as a real trip belonging to the traveler.

Supported provider options:

| Provider | Purpose |
| --- | --- |
| OpenRouter | Hosted OpenAI-compatible provider, default first attempt when configured |
| Ollama | Local OpenAI-compatible generation option |
| OpenAI | Optional paid hosted fallback |
| Heuristic | Always-available local scoring and recommendation fallback |

### Guides And Booking Marketplace

- Guide listing and guide detail presentation with availability, biography, languages, specializations, certifications, offerings, rating, response information, previous trip information, and reviews.
- Booking packages: `Half Day Tour`, `Full Day Adventure`, and `Multi-Day Expedition`.
- Booking captures selected guide, destinations, dates, length, group size, add-ons, special requirements, and initial offered price.
- Price negotiation history records each offer with author, amount, optional message, and timestamp.
- Guide quick-response messaging support in the booking interface.

#### Booking Status Lifecycle

| Status | Meaning |
| --- | --- |
| `pending` | Traveler has sent a new request awaiting action |
| `negotiating` | Guide and traveler are exchanging price offers |
| `confirmed` | A price or booking has been accepted; payment/trip execution follows |
| `declined` | Guide declined the request |
| `cancelled` | Traveler cancelled an eligible booking |
| `expired` | A pending or negotiating request exceeded the response window |
| `completed` | Guide completed a paid trip; commission may be generated |

- New and actively negotiated bookings expire after 30 minutes without resolution.
- A scheduled backend task additionally expires stale requests every 15 minutes.
- Terminal states cannot be changed by the booking state machine.

### Payments

#### eSewa

- Travelers can initiate eSewa payment after a booking is confirmed.
- The backend builds a signed eSewa form request with HMAC-SHA256.
- eSewa returns to dedicated payment success or payment failure frontend screens.
- Verification checks callback contents, signature, ownership or admin access, expected product code, expected amount, and provider status.
- A successfully verified payment marks the booking paid and records transaction details.

#### Cash

- Travelers may select cash for a confirmed booking.
- Guides explicitly confirm receipt of cash.
- A cash booking cannot be completed until payment is confirmed.

#### Refund Status

- Cancelling an already-paid eSewa booking records payment state as `refunded`; the actual external refund remains an administrative/manual process.

### Reviews And Reputation

- Completed booking guide reviews with overall rating, comment, optional category ratings, and photos.
- Destination reviews by travelers or guides, limited to one review per user per destination.
- Guide booking reviews are limited to one review per reviewer per booking.
- Helpful voting for reviews.
- Guide public response to received reviews.
- Aggregated guide and destination ratings.

### Notifications And Real-Time Updates

- Stored notifications support unread counts, marking a single notification read, and marking all read.
- The application creates booking, payment, review, and account-administration notification records.
- When a user is connected, notifications are also emitted in real time over Socket.IO.
- UI notification handling includes booking requests, counter offers, accepted prices, and declined bookings.

### Live Trip Safety

- Live-trip eligibility is derived from accessible confirmed/active booking information.
- Traveler, guide, and admin users with access can join a trip-specific room.
- Traveler position updates, plus authorized administrative broadcasts supported by the backend, transmit latitude/longitude and optional accuracy, heading, or speed.
- Location checkpoints and room activity are saved as live trip events.
- A traveler can trigger an SOS alert with a message and location.
- SOS alerts broadcast to the trip room, the assigned guide room, and the administrator room.
- Guide and admin maps display session state, latest location, connectivity/live status, SOS state, and persisted event activity.

### Commission And Payout Management

- Completing a paid trip creates one commission record for its booking.
- Default platform commission is 15 percent unless changed in platform settings.
- Administrators can set the global commission rate and set or reset a guide-specific override.
- Guide earnings equal booking amount minus platform commission.
- Guides see pending balance, individual commission history, existing payouts, and may request a payout.
- Duplicate active payout requests are prevented.
- Administrators can process pending balances into payout batches, set payment method and transaction reference, update payment state, and record notes.
- Failed payouts return their included commissions to the unpaid balance.
- Admins can export payout data as CSV.
- Platform settings also store the configurable snack route search buffer distance, initially 5 km.

### Admin Analytics And Operations

- Dashboard cards for users, destinations, bookings, pending operational work, and platform revenue.
- Booking trend visualization and recent booking listings.
- Guide approval/action queues.
- Analytics charts for booking trends, status distribution, revenue growth, top categories, and user growth.
- Full booking inspection screen.
- Live-map operations view for approved places and monitored trips.

## Application Screens

### Public And Account Screens

| Path | Purpose |
| --- | --- |
| `/` | Marketing landing page and entry point |
| `/destinations` | Public destination catalogue |
| `/places/[id]` | Destination detail, reviews, available guides, and wishlist action |
| `/guides/[id]` | Public guide profile and booking initiation/negotiation surface |
| `/login` | Email/password sign in |
| `/login-otp` | OTP-based sign in |
| `/register` | Traveler registration with verification workflow |
| `/forgot-password` | Password reset request |
| `/reset-password/[token]` | Reset-password completion |
| `/verify-email/[token]` | Email verification completion |
| `/unauthorized` | Role access denial view |

### Traveler Workspace

| Path | Purpose |
| --- | --- |
| `/user/dashboard` | Overview of upcoming trips, negotiations, completed travel, wishlist, spend, and priority actions |
| `/user/explore` | Interactive destination map, filters, map location, wishlist save, and directions |
| `/user/guides` | Browse available local guides |
| `/user/trips` | Build, save, optimize, and smart-generate itineraries; discover route snack stops |
| `/user/active-trip` | Join a booking trip session, publish position, and send SOS alerts |
| `/user/bookings` | Booking history, negotiation actions, payment selection, cancellation, and post-trip reviews |
| `/user/bookings/payment-success` | eSewa return verification and completion state |
| `/user/bookings/payment-failure` | Payment failure/callback recovery state |
| `/user/wishlist` | Saved destination management |
| `/user/profile` | Contact information, emergency contact, preferences, and profile summary |

### Guide Workspace

| Path | Purpose |
| --- | --- |
| `/guide/dashboard` | Requests, earnings, booking activity, reviews, payout state, and profile readiness |
| `/guide/bookings` | Accept, counter, decline, confirm cash, or complete bookings |
| `/guide/live` | Monitor traveler locations and SOS events for eligible trips |
| `/guide/earnings` | Commission records, pending balance, payout requests, and payout history |
| `/guide/reviews` | Rating summary, detailed reviews, and public guide responses |
| `/guide/availability` | New-booking availability toggle and upcoming confirmed tours |
| `/guide/places` | Destination submission and moderation status tracking |
| `/guide/profile` | Public guide profile management |

### Administrator Workspace

| Path | Purpose |
| --- | --- |
| `/admin/dashboard` | Platform overview, trends, action queue, latest bookings, and new guides |
| `/admin/guides` | Approve, edit, suspend, revoke, create, and reset guide accounts |
| `/admin/add-guide` | Dedicated guide creation form |
| `/admin/places` | Review, approve, reject, and edit destination submissions |
| `/admin/map` | Destination/live-session map with location and SOS monitoring |
| `/admin/bookings` | Browse and filter platform bookings |
| `/admin/commissions` | Commission totals, global settings, snack buffer setting, and guide overrides |
| `/admin/payouts` | Pending balances, payout creation, history, status updates, and CSV report download |
| `/admin/analytics` | Booking, revenue, category, status, and user growth analytics |
| `/admin/settings` | Administration settings interface |

## Core User Flows

### Traveler Registration And Booking

1. Traveler requests a registration OTP and verifies it.
2. Traveler registers; the API forces the role to `tourist`.
3. Successful OTP-confirmed registration creates an immediately verified traveler session; the application also attempts to send a verification-link email.
4. Traveler browses a destination or guide and creates a booking request with an offer.
5. Guide accepts directly or counters the price.
6. Traveler may revise or accept the counter offer; acceptance confirms the booking.
7. Traveler pays through eSewa or chooses cash.
8. During a confirmed trip, live location and SOS capabilities become available.
9. Guide completes the paid trip.
10. Traveler can submit a review.

### Guide Submission And Earnings

1. Admin creates and verifies a guide account.
2. Guide fills out profile and turns availability on.
3. Guide submits destination content; it is pending until approved.
4. Guide responds to traveler bookings and carries out confirmed trips.
5. After paid trip completion, a commission record is created.
6. Guide requests payout for unpaid earnings.
7. Admin processes the payout and records transaction status.

### Live Safety Monitoring

1. An eligible booking appears in traveler, guide, and admin live-trip access lists as permitted.
2. A participant joins the booking's Socket.IO room.
3. Traveler shares live position; subscribed guide/admin screens receive updates.
4. Traveler triggers SOS if needed.
5. The trip room, assigned guide, and admins receive the alert.
6. Join, leave, location, and SOS activity is persisted for later review.

## Architecture And Technology

### Frontend

| Technology | Use |
| --- | --- |
| Next.js 16 App Router | Routing, layouts, public pages, and role workspaces |
| React 19 and TypeScript | Component UI and frontend state |
| Tailwind CSS and Radix UI primitives | Styling, controls, dialogs, menus, cards, navigation, and responsive layouts |
| Framer Motion | Interface animation support |
| Axios | Cookie-authenticated API client |
| Socket.IO Client | Real-time sessions, notifications, and live trip state |
| Leaflet / React Leaflet / Leaflet Routing Machine | Map display, markers, routes, and trip visuals |
| Recharts | Dashboard and analytics charts |
| React Hook Form and Zod | Form-building/validation dependencies |
| Vitest and Testing Library | Frontend automated tests |

### Backend

| Technology | Use |
| --- | --- |
| Node.js and Express 5 | REST API and application middleware |
| MongoDB and Mongoose | Persistent documents, indexes, and geospatial queries |
| Socket.IO | Authenticated real-time communication |
| JSON Web Tokens and HTTP-only cookies | Session authentication |
| bcryptjs | Password hashing |
| Nodemailer | Verification, OTP, password-reset, and payment email support |
| node-cron | Booking expiry and trip reminder scheduled jobs |
| Axios | External eSewa/AI-provider HTTP calls |
| Helmet, CORS, express-rate-limit, express-validator | Security and request validation |
| Cloudinary and Multer | Available image upload infrastructure |
| Jest and Supertest | Backend automated tests |

### External Services

| Service | Used for | Required? |
| --- | --- | --- |
| MongoDB | All persisted application records | Yes |
| SMTP server | OTP and account/payment email delivery | Required for email delivery flows |
| eSewa | Online booking payment | Optional unless online payment is used |
| OpenStreetMap tiles | Leaflet map basemap | Used by map UI |
| Overpass API | Route food-stop lookup | Used when snack lookup is performed |
| OpenRouter / Ollama / OpenAI | Generated itinerary enhancement | Optional; heuristic fallback works without them |
| Cloudinary | Image upload infrastructure | Optional/currently infrastructure only |

## Backend API Reference

Base URL in local development: `http://localhost:5001/api`

Legend:

- `Public`: no authentication middleware.
- `Auth`: verified, active cookie-authenticated user.
- `Tourist`, `Guide`, `Admin`: authenticated plus required role.

### Authentication: `/api/auth`

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| `POST` | `/register` | Public | Register verified traveler account |
| `POST` | `/login` | Public | Password login and cookie session creation |
| `POST` | `/request-otp` | Public | Request login OTP |
| `POST` | `/verify-otp` | Public | Verify login OTP and authenticate |
| `POST` | `/send-phone-otp` | Public | Send phone verification OTP |
| `POST` | `/verify-phone-otp` | Public | Verify phone OTP |
| `POST` | `/send-registration-otp` | Public | Send registration OTP |
| `POST` | `/verify-registration-otp` | Public | Verify registration OTP |
| `POST` | `/forgot-password` | Public | Send password reset email |
| `POST` | `/reset-password/:token` | Public | Store a new password from reset token |
| `GET` | `/verify-email/:token` | Public | Confirm email verification token |
| `POST` | `/resend-verification` | Public | Resend email verification |
| `GET` | `/me` | Auth | Retrieve logged-in profile |
| `PUT` | `/me` | Auth | Update allowed profile fields |
| `POST` | `/logout` | Auth | Blacklist token and clear cookie |
| `POST` | `/request-password-reset` | Auth | Request admin password assistance |
| `GET` | `/users/stats` | Admin | User summary counts |
| `GET` | `/users` | Admin | Paginated user/guide listing |
| `POST` | `/users/create-guide` | Admin | Create a guide account |
| `PATCH` | `/users/:id/verify` | Admin | Set verification state |
| `PATCH` | `/users/:id/suspend` | Admin | Suspend account |
| `PUT` | `/users/:id/admin-update` | Admin | Update manageable user data |
| `PATCH` | `/users/:id/revoke` | Admin | Revoke guide privileges |
| `PATCH` | `/users/:id/reset-password` | Admin | Admin reset of user password |
| `GET` | `/password-reset-requests` | Admin | Read password-reset requests |

### Destinations: `/api/destinations`

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/featured` | Public | Approved featured destination subset |
| `GET` | `/nearby` | Public | Geospatial nearby destinations |
| `GET` | `/search` | Public | Text destination search |
| `GET` | `/` | Public | Approved published destinations |
| `GET` | `/:id` | Public | Single approved published destination |
| `GET` | `/recommendations` | Tourist | Preference-driven recommendations |
| `GET` | `/my-places` | Guide | Guide-submitted places |
| `POST` | `/` | Admin or Guide | Create destination; guide submissions enter review |
| `GET` | `/stats` | Admin | Moderation status totals |
| `GET` | `/admin` | Admin | Full moderation listing |
| `PUT` | `/:id` | Admin | Edit destination |
| `PATCH` | `/:id/verify` | Admin | Approve or reject submission |
| `DELETE` | `/:id` | Admin | Delete destination |

### Guides: `/api/guides`

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/online` | Public | Online guide list |
| `GET` | `/` | Public | Discover guides |
| `GET` | `/:id` | Public | Guide details |
| `GET` | `/:id/booking-history` | Public | Public guide booking history data |
| `PUT` | `/me/availability` | Guide | Update discoverability/availability |

### Bookings: `/api/bookings`

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| `POST` | `/` | Tourist | Create guide booking offer |
| `GET` | `/my-bookings` | Tourist | Traveler bookings |
| `PUT` | `/:id/cancel` | Tourist | Cancel eligible booking |
| `PUT` | `/:id/revise-offer` | Tourist | Revise negotiated offer |
| `GET` | `/my-requests` | Guide | Guide booking requests |
| `GET` | `/guide/stats` | Guide | Guide booking/earnings summary |
| `PUT` | `/:id/accept` | Guide | Directly accept booking |
| `PUT` | `/:id/decline` | Guide | Decline booking |
| `PATCH` | `/:id/respond` | Guide | Respond to booking action |
| `PUT` | `/:id/counter-offer` | Guide | Propose counter amount |
| `PUT` | `/:id/complete` | Guide | Complete paid trip |
| `PUT` | `/:id/accept-price` | Auth participant | Accept latest negotiated price |
| `GET` | `/:id` | Auth participant/admin | Retrieve booking details |
| `GET` | `/stats` | Admin | Booking totals/revenue summary |
| `GET` | `/` | Admin | Full booking listing |

### Payments: `/api/payments`

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| `POST` | `/initiate` | Tourist | Start signed eSewa checkout |
| `POST` | `/verify` | Tourist or Admin | Verify eSewa callback/result |
| `POST` | `/cash` | Tourist | Select cash payment |
| `POST` | `/confirm-cash` | Guide | Confirm cash collection |
| `GET` | `/:bookingId/status` | Auth | Read permitted booking payment state |

### Trips And AI

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/trips` | Auth | Create saved trip |
| `GET` | `/api/trips` | Auth | Read own saved trips |
| `PUT` | `/api/trips/:id` | Auth owner | Update trip |
| `DELETE` | `/api/trips/:id` | Auth owner | Delete trip |
| `POST` | `/api/trips/:id/optimize` | Auth owner | Optimize destination sequence |
| `POST` | `/api/trips/:id/snack-stops` | Auth owner | Persist route food stop |
| `DELETE` | `/api/trips/:id/snack-stops/:stopIndex` | Auth owner | Remove persisted stop |
| `POST` | `/api/ai/generate-itinerary` | Tourist | Generate and save smart itinerary |

### Wishlists, Reviews, Pins, And Notifications

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/wishlist` | Auth | Read saved destinations |
| `POST` | `/api/wishlist/:destinationId` | Auth | Save destination |
| `DELETE` | `/api/wishlist/:destinationId` | Auth | Remove saved destination |
| `POST` | `/api/reviews` | Auth tourist on booking | Review a completed guide booking |
| `GET` | `/api/reviews/guide/:guideId` | Public | Read guide reviews |
| `POST` | `/api/reviews/destination/:destinationId` | Tourist or Guide | Review destination |
| `GET` | `/api/reviews/destination/:destinationId` | Public | Read destination reviews |
| `PUT` | `/api/reviews/:id/helpful` | Auth | Mark review helpful |
| `POST` | `/api/reviews/:id/response` | Guide | Respond to own review |
| `POST` | `/api/map-pins` | Auth | Create map pin |
| `GET` | `/api/map-pins/my-pins` | Auth | Read own pins |
| `GET` | `/api/map-pins/public` | Public | Public pins |
| `GET` | `/api/map-pins/nearby` | Public | Nearby public pins |
| `GET` | `/api/map-pins/:id` | Public | Read visible pin |
| `PUT` | `/api/map-pins/:id` | Auth owner | Update pin |
| `DELETE` | `/api/map-pins/:id` | Auth owner | Delete pin |
| `POST` | `/api/map-pins/:id/comments` | Auth | Comment on public pin |
| `GET` | `/api/notifications` | Auth | Notification feed |
| `GET` | `/api/notifications/unread-count` | Auth | Unread badge count |
| `PATCH` | `/api/notifications/read-all` | Auth | Read all notifications |
| `PATCH` | `/api/notifications/:id/read` | Auth | Read one notification |

### Administration Finance And Monitoring

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/analytics` | Admin | Platform analytics aggregates |
| `GET` | `/api/live-trips` | Auth permitted user | Accessible live-trip sessions |
| `GET` | `/api/commissions/dashboard` | Admin | Commission reporting data |
| `GET` | `/api/commissions/global-rate` | Admin | Platform settings |
| `PUT` | `/api/commissions/global-rate` | Admin | Update default commission/snack buffer |
| `PUT` | `/api/commissions/guide/:id/rate` | Admin | Set guide rate override |
| `GET` | `/api/commissions/my` | Guide | Own commission records |
| `POST` | `/api/payouts/request` | Guide | Request payout |
| `GET` | `/api/payouts/my` | Guide | Own payout state/history |
| `GET` | `/api/payouts/pending` | Admin | Guide balances awaiting payout |
| `GET` | `/api/payouts/history` | Admin | Payout history |
| `GET` | `/api/payouts/download` | Admin | CSV payout report |
| `POST` | `/api/payouts` | Admin | Create/process payout batch |
| `PUT` | `/api/payouts/:id/status` | Admin | Update payout result |
| `GET` | `/api/payouts/guide/:id` | Admin or same Guide | Guide payout listing |

### Service Endpoint

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Confirms API operation and returns timestamp |

## Real-Time Events

Socket.IO uses the backend server URL, authenticated through the `token` cookie.

### Guide Presence And Negotiation

| Event | Direction | Purpose |
| --- | --- | --- |
| `guide:toggle-online` | Client to server | Guide toggles online status |
| `guide:online-status` | Server to clients | Broadcast guide status change |
| `guides:get-online` | Client to server | Request currently online guide IDs |
| `guides:online-list` | Server to client | Return currently online guides |
| `booking:counter-offer` | Server relay | Notify opposite booking participant of validated counter offer |
| `booking:accept-price` / `booking:price-accepted` | Client/server relay | Notify participant that negotiated price was accepted |
| `booking:decline` / `booking:declined` | Client/server relay | Notify traveler of declined booking |
| `notification` | Server to user | Deliver newly persisted notification live |

### Live Trip Safety Events

| Event | Direction | Purpose |
| --- | --- | --- |
| `joinTripRoom` | Client to server | Join an authorized booking monitoring room |
| `leaveTripRoom` | Client to server | Exit monitoring room |
| `updateLocation` | Client to server | Send traveler location checkpoint |
| `tripLocationUpdated` | Server to room | Publish latest location |
| `triggerSOS` | Client to server | Trigger urgent trip alert |
| `SOS_ALERT` | Server to room/guide/admin | Publish active emergency signal |
| `liveTripState` | Server to room | Share current room snapshot |
| `liveTripEventRecorded` | Server to room | Publish persisted audit activity |
| `liveTrip:error` | Server to client | Return access or payload failure |

## Data Model

| Collection / Model | Main responsibility |
| --- | --- |
| `User` | All accounts, roles, traveler preferences, guide profile, verification, suspension, availability, and optional guide commission override |
| `Destination` | Places, publication/moderation state, ratings, descriptive content, and geospatial location |
| `Booking` | Guide request, negotiation, dates, prices, state machine, payment state, and completion |
| `Trip` | Personal itinerary, ordered destinations, and planned snack stops |
| `Wishlist` | One user's saved destination collection |
| `Review` | Guide or destination ratings, category ratings, helpful votes, and responses |
| `MapPin` | User-created public/private map markers and comments |
| `Notification` | Stored user notifications and unread state |
| `OTP` | Expiring OTP attempts for login/registration/password-related verification |
| `TokenBlacklist` | Invalidated JWT sessions after logout |
| `LiveTripEvent` | Live session joins/leaves, location events, and SOS record |
| `Commission` | Platform/guide split generated from a completed paid booking |
| `Payout` | Disbursement batch or guide request linked to commission records |
| `PlatformSettings` | Singleton defaults for commission percentage and snack-route buffer distance |

### Notable Indexes And Integrity Rules

- Geospatial `2dsphere` indexes support destinations and map-pin proximity queries.
- Text index supports destination search across names and descriptions.
- One wishlist document exists per user.
- One commission can exist per completed booking.
- A reviewer may post only one guide review for a booking and one review per destination.
- OTP records expire automatically using a TTL index.
- Booking expiry is application-managed rather than allowing MongoDB to delete historical bookings.

## Security And Operational Behavior

### Security Controls

- Passwords are hashed using bcrypt before storage.
- JWT tokens are delivered in HTTP-only cookies and are not read from browser local storage.
- Production cookies use `secure: true` and `sameSite: none` for separated frontend/API deployments.
- Backend authorization checks role access independently of frontend routing.
- Suspended or unverified accounts are rejected on protected API requests and sockets.
- Helmet security headers are enabled.
- CORS accepts configured frontend origins; local origins are relaxed only in development.
- In production, state-changing HTTP requests without an `Origin` or `Referer` are blocked.
- Request input sanitization and validation middleware run before route handlers.
- Global API rate limiting, authentication rate limiting, and stricter OTP request limiting are configured.
- eSewa payment verification checks cryptographic signatures and server-observed provider status.
- Socket negotiation relays verify booking access, state, target user, object ID, and numeric prices before emitting.

### Scheduled Jobs

| Schedule | Task |
| --- | --- |
| Every 15 minutes | Expire stale `pending` and `negotiating` bookings |
| Every hour | Send reminders for confirmed trips beginning within 24 hours, once per booking |

### Email-Driven Capabilities

When SMTP settings are configured, email support is used for:

- Registration and login OTP delivery.
- Email verification.
- Password reset.
- Payment/invoice-related communication.

## Setup And Installation

### Prerequisites

- Node.js compatible with the Next.js 16 and Express application dependencies.
- npm.
- MongoDB instance or MongoDB Atlas connection URI.
- SMTP credentials when testing email, OTP, or reset flows.
- Optional eSewa sandbox credentials and optional AI provider credentials.

### 1. Install Dependencies

From the repository root:

```bash
cd backend
npm install

cd ../frontend
npm install
```

### 2. Configure Backend Environment

Copy `backend/.env.example` to `backend/.env`, then set at minimum:

```env
PORT=5001
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/yatra
JWT_SECRET=replace-with-a-long-random-secret-at-least-32-characters
FRONTEND_URL=http://localhost:3000
```

Validate required backend settings:

```bash
cd backend
npm run validate-env
```

### 3. Configure Frontend Environment

Copy `frontend/.env.example` to `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5001/api
NEXT_PUBLIC_LEAFLET_TILE_URL=https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
```

### 4. Optionally Seed Destination Data

The repository includes a destination seeder with approved Nepal destinations. The script clears existing destinations before inserting seed records, so run it only against a database where replacing destination data is intended.

```bash
cd backend
node -r dotenv/config src/utils/seeder.js
```

### 5. Start The API

```bash
cd backend
npm run dev
```

The API listens on `http://localhost:5001` by default. Check:

```text
GET http://localhost:5001/health
```

### 6. Start The Frontend

In another terminal:

```bash
cd frontend
npm run dev
```

Open `http://localhost:3000`.

### Creating Administrative And Guide Accounts

- Public registration intentionally creates traveler accounts only.
- Guide accounts are created from the admin interface/API.
- An initial administrator must be provisioned in the database or by project-specific bootstrap tooling before admin-only UI operations can be used; there is no public admin registration endpoint.

## Environment Variables

### Backend: Required

| Variable | Description |
| --- | --- |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | JWT signing key; must be at least 32 characters |
| `FRONTEND_URL` | One or more comma-separated allowed frontend origins and payment return origin |

### Backend: Server And Rate Limiting

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `5001` | API and Socket.IO HTTP port |
| `NODE_ENV` | `development` | Runtime environment; use `production` in deployed systems |
| `JWT_EXPIRE` | `7d` | Token lifetime |
| `RATE_LIMIT_WINDOW_MS` | `900000` | Global API rate-limit window |
| `RATE_LIMIT_MAX` | `100` | Global maximum requests per window |
| `AUTH_RATE_LIMIT_WINDOW_MS` | Environment-based | Authentication request window override |
| `AUTH_RATE_LIMIT_MAX` | Environment-based | Authentication request maximum override |

### Backend: Email

| Variable | Description |
| --- | --- |
| `EMAIL_HOST` | SMTP host such as `smtp.gmail.com` |
| `EMAIL_PORT` | SMTP port, default documented as `587` |
| `EMAIL_USER` | SMTP account |
| `EMAIL_PASSWORD` | SMTP password or application password |
| `EMAIL_FROM` | From address used in outgoing emails |

### Backend: eSewa

| Variable | Description |
| --- | --- |
| `ESEWA_SECRET_KEY` | HMAC signing secret |
| `ESEWA_PRODUCT_CODE` | eSewa product/merchant code |
| `ESEWA_PAYMENT_URL` | Checkout submission URL |
| `ESEWA_STATUS_URL` | Provider verification/status URL |

### Backend: Itinerary Providers

| Variable | Description |
| --- | --- |
| `AI_PROVIDER` | `auto` or a comma-separated order such as `openrouter,ollama,heuristic` |
| `OPENROUTER_API_KEY` | OpenRouter credential |
| `OPENROUTER_MODEL` | OpenRouter model, default `openrouter/free` |
| `OPENROUTER_BASE_URL` | OpenRouter-compatible endpoint |
| `OPENROUTER_HTTP_REFERER` | Application referer header |
| `OPENROUTER_APP_NAME` | Application title header |
| `OLLAMA_BASE_URL` | Local OpenAI-compatible Ollama endpoint |
| `OLLAMA_MODEL` | Local model, default `llama3.1:8b` |
| `OPENAI_API_KEY` | Optional OpenAI credential |
| `OPENAI_MODEL` | Optional model, default `gpt-4o-mini` |
| `OPENAI_BASE_URL` | Optional OpenAI-compatible endpoint |

### Backend: Media And Platform Defaults

| Variable | Description |
| --- | --- |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary account cloud |
| `CLOUDINARY_API_KEY` | Cloudinary key |
| `CLOUDINARY_API_SECRET` | Cloudinary secret |
| `DEFAULT_COMMISSION_RATE` | Used when the singleton platform settings record is first created; default is `0.15` |
| `SNACK_BUFFER_DISTANCE_KM` | Used when platform settings are first created; default is `5` |

### Frontend

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | REST API base URL, default `http://localhost:5001/api` |
| `NEXT_PUBLIC_LEAFLET_TILE_URL` | Leaflet tile template |
| `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` | Declared mapping configuration option |
| `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID` | Declared analytics configuration option |
| `NEXT_PUBLIC_VERCEL_ANALYTICS_ID` | Declared analytics configuration option |
| `NEXT_PUBLIC_ENABLE_AI_FEATURES` | Declared AI feature flag |
| `NEXT_PUBLIC_ENABLE_STUNNING_MAP` | Declared enhanced-map feature flag |
| `NEXT_PUBLIC_ENABLE_REAL_TIME_NOTIFICATIONS` | Declared notification feature flag |

## Available Scripts

### Backend

Run inside `backend/`.

| Command | Purpose |
| --- | --- |
| `npm run dev` | Run API using Nodemon |
| `npm start` | Run API using Node |
| `npm test` | Execute Jest test suite |
| `npm run test:watch` | Execute backend tests in watch mode |
| `npm run lint` | Lint `src` and `tests` |
| `npm run lint:fix` | Apply backend ESLint fixes |
| `npm run validate-env` | Check required environment configuration |

### Frontend

Run inside `frontend/`.

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start Next.js development server |
| `npm run build` | Build production frontend |
| `npm start` | Serve built frontend |
| `npm run lint` | Run frontend ESLint |
| `npm run lint:fix` | Apply frontend ESLint fixes |
| `npm test` | Run Vitest |
| `npm run test:ui` | Open Vitest UI mode |
| `npm run test:smoke` | Run frontend smoke tests once |

## Testing

### Backend Coverage Areas Present In The Repository

- Basic API routing behavior.
- Authentication and role-escalation prevention.
- Destination moderation/public-visibility handling.
- Booking/payment verification security.
- Commission utility behavior.
- Route optimization.
- Rate limiting.
- Admin analytics.

Backend tests use Jest, Supertest, and `mongodb-memory-server`.

```bash
cd backend
npm test
```

### Frontend Coverage Areas Present In The Repository

- Landing-page smoke rendering and authenticated navbar behavior.
- Route snack utility calculations including sampling, distance filtering, ordering, and deduplication.

```bash
cd frontend
npm test
```

## Project Structure

```text
yatra/
|-- backend/
|   |-- src/
|   |   |-- config/          # MongoDB, Cloudinary, and environment validation
|   |   |-- controllers/     # Domain behavior for every API resource
|   |   |-- middleware/      # Authentication, cookies, validation, errors, uploads
|   |   |-- models/          # Mongoose persistence models
|   |   |-- routes/          # Express API route definitions
|   |   |-- sockets/         # Location sharing and live trip events
|   |   |-- utils/           # JWT, email, OTP, commission, routes, seeding, notifications
|   |   |-- app.js           # Express middleware and REST route registration
|   |   `-- server.js        # Database startup, HTTP server, sockets, cron tasks
|   |-- tests/               # Jest and Supertest coverage
|   `-- .env.example
|-- frontend/
|   |-- app/                 # Next.js pages and layouts by public/user/guide/admin route
|   |-- components/          # Landing, map, booking, layout, and UI components
|   |-- context/             # Authentication, Socket.IO, and notifications
|   |-- hooks/               # Reusable client hooks
|   |-- lib/                 # API, auth, trip, map, payment, currency, and route utilities
|   |-- public/              # PWA manifest and static assets
|   |-- styles/              # Additional design/map style sheets
|   |-- tests/               # Vitest frontend tests
|   |-- proxy.ts             # Route/role session redirect logic
|   `-- .env.example
`-- README.md
```

## Implementation Notes

These notes distinguish active application behavior from configuration or compatibility scaffolding:

- The active payment controllers and traveler UI implement **eSewa** and **cash**. The booking schema still permits a `khalti` method value, but there is no Khalti payment route in this codebase.
- The application contains **Cloudinary/Multer image-upload infrastructure**, including file validation and upload/delete helpers, but the current API route registration does not expose a media upload endpoint.
- Several frontend `.env.example` values are declared as future/configuration-facing feature flags or analytics settings; code should be checked before relying on them as runtime switches.
- `/places/[id]` is the destination detail screen aligned to the current REST endpoint `GET /api/destinations/:id`. A separate `/destinations/[slug]` page remains in the frontend and references slug-oriented requests not registered in the current backend routes.
- Smart itinerary generation does not require paid AI access: it always includes the local heuristic planner as a fallback.

---

Yatra is designed as an end-to-end travel operations application: travelers can move from discovery to a safe completed trip, guides can run their work and earnings through the platform, and administrators can govern quality, money flow, and live safety visibility in one system.
