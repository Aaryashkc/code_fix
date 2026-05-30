# Yatra

**A full-stack Nepal travel marketplace with destination discovery, guide booking, trip planning, live safety tracking, and admin operations.**

Yatra connects travelers with local guides, lets users plan routes around Nepal, supports booking negotiation and payment, and gives guides/admins live tools for operating trips safely.

The project is split into:

- **Frontend:** Next.js 16, React 19, Tailwind CSS, shadcn/Radix UI, Leaflet maps, Socket.IO client.
- **Backend:** Express 5, MongoDB/Mongoose, Socket.IO, JWT cookie auth, scheduled jobs, eSewa/cash payment flows.
- **External map services:** OpenStreetMap tiles, Nominatim geocoding, OSRM road routing, and Overpass nearby-place lookup.

## Contents

1. [Core Features](#core-features)
2. [Roles](#roles)
3. [Important Flows](#important-flows)
4. [Active Trip Logic](#active-trip-logic)
5. [Frontend Routes](#frontend-routes)
6. [Backend API](#backend-api)
7. [Realtime Events](#realtime-events)
8. [Data Models](#data-models)
9. [Tech Stack](#tech-stack)
10. [Setup](#setup)
11. [Environment Variables](#environment-variables)
12. [Scripts](#scripts)
13. [Testing](#testing)
14. [Project Structure](#project-structure)
15. [Notes](#notes)

## Core Features

| Area | Features |
| --- | --- |
| Destination discovery | Public destination catalogue, details, filters, reviews, maps, nearby lookup, wishlist actions |
| Guide marketplace | Guide profiles, availability, languages, specializations, pricing, ratings, booking history |
| Booking | Tourist requests, custom destinations, Nominatim coordinate lookup, price negotiation, acceptance, decline, expiry |
| Payments | eSewa checkout/verification and cash selection/guide cash confirmation |
| Trip planning | Saved trips, ordered stops, route optimization, AI itinerary generation, route-side food/lodging discovery |
| Active trips | Live traveler location sharing, A-to-B road route, hotels/restaurants near the route, SOS alerts |
| Guide workspace | Booking management, live trip monitoring, place submission, earnings, payout requests, reviews |
| Admin workspace | Guide/user management, destination moderation, live map, bookings, analytics, commissions, payouts |
| Realtime | Notifications, booking updates, guide presence, live trip room state, location updates, SOS broadcasts |

## Roles

### Traveler

Travelers are created through public registration. They can:

- Browse destinations and guides.
- Save destinations to wishlist.
- Build saved trips and smart itineraries.
- Book a guide using existing destinations or custom place names.
- Negotiate booking price.
- Pay by eSewa or choose cash.
- Open active trip tracking, share live location, see route-side hotels/restaurants, and trigger SOS.
- Confirm trip completion and review guides/destinations.

### Guide

Guides are created/managed by admins. Verified guides can:

- Manage public guide profile and availability.
- Accept, counter, decline, and complete bookings.
- Confirm cash collection.
- Submit places for admin approval.
- Use Nominatim-assisted address lookup while adding places.
- Monitor assigned live trips, traveler location, route, nearby hotels/restaurants, SOS state, and event history.
- View commissions and request payouts.
- Respond to reviews.

### Admin

Admins can:

- Manage users and guides.
- Create guide accounts and reset guide passwords.
- Moderate guide-submitted destinations.
- Inspect all bookings.
- Monitor live trips, routes, traveler/SOS location, and route-side hotels/restaurants.
- Review analytics, commission settings, guide overrides, and payout workflows.

## Important Flows

### Booking A Guide

1. Traveler opens a guide profile.
2. Traveler picks existing approved destinations and/or types custom places.
3. Custom places are resolved with Nominatim into `lat/lng`.
4. The booking stores selected destination IDs plus custom destinations with coordinates when available.
5. Guide can accept, decline, or counter.
6. Traveler can accept the latest price or revise their offer.
7. Confirmed bookings become eligible for payment and active-trip monitoring.

### Adding A Place

1. Guide opens `/guide/places`.
2. Guide enters name/address and can click `Find`.
3. The frontend calls Nominatim and fills the selected map point.
4. Backend also performs best-effort Nominatim resolving when creating destinations.
5. Guide-created places start as `pending` and unpublished.
6. Admin approves or rejects the place.

### Payment And Completion

1. Confirmed booking can be paid through eSewa or marked for cash.
2. eSewa verification checks signed callback/provider status before marking paid.
3. Cash bookings require guide confirmation.
4. Paid trips require both participant completion confirmations before final completion.
5. Completion creates a commission record once for the booking.

## Active Trip Logic

The active trip system is shared across:

- Traveler: `/user/active-trip`
- Guide: `/guide/live`
- Admin: `/admin/map`

### Route Construction

The frontend gets accessible sessions from:

```text
GET /api/live-trips
```

Each session includes:

- Booking summary.
- Tourist and guide.
- Approved destination stops.
- Custom booking stops with saved coordinates.
- Latest live traveler location, if available.
- SOS data and recent event history.

The map route is built as:

```text
traveler live location -> stop A -> stop B -> stop C
```

If the traveler has not started sharing location yet, it falls back to:

```text
stop A -> stop B -> stop C
```

### Road Route

The frontend sends those points to OSRM:

```text
https://router.project-osrm.org/route/v1/driving/...
```

OSRM returns the road geometry and route distance. If OSRM fails, the UI falls back to a direct polyline between known points.

### Nearby Hotels And Restaurants

After the route is built, the frontend queries Overpass for places around sampled route points:

- `amenity=cafe`
- `amenity=fast_food`
- `amenity=restaurant`
- `tourism=hotel`
- `tourism=guest_house`
- `tourism=hostel`

Those stops are:

- Filtered by distance from the route.
- Deduplicated.
- Ordered along the trip route.
- Rendered as map markers.
- Listed in the side UI with distance, for example `450 m away` or `1.2 km away`.

When the traveler location changes, the live route can be rebuilt from the new location and the nearby hotels/restaurants refresh for that new route.

### SOS And Live Events

Travelers can trigger SOS with optional current location. The event is broadcast to:

- The trip room.
- The assigned guide room.
- Admin listeners.

Join/leave, location checkpoints, and SOS events are persisted as `LiveTripEvent` records.

## Frontend Routes

### Public

| Path | Purpose |
| --- | --- |
| `/` | Landing page |
| `/destinations` | Destination catalogue |
| `/places/[id]` | Destination detail, reviews, guides, wishlist |
| `/guides/[id]` | Guide profile, booking request, negotiation |
| `/login` | Email/password login |
| `/login-otp` | OTP login |
| `/register` | Traveler registration |
| `/forgot-password` | Password reset request |
| `/reset-password/[token]` | Password reset completion |
| `/verify-email/[token]` | Email verification |
| `/unauthorized` | Role denial page |

### Traveler

| Path | Purpose |
| --- | --- |
| `/user/dashboard` | Traveler overview |
| `/user/explore` | Interactive destination map |
| `/user/guides` | Browse guides |
| `/user/trips` | Trip planner, route optimization, smart itinerary, route-side stops |
| `/user/active-trip` | Live route, live location sharing, nearby hotels/restaurants, SOS |
| `/user/bookings` | Bookings, payment, cancellation, completion, reviews |
| `/user/bookings/payment-success` | eSewa success verification |
| `/user/bookings/payment-failure` | Payment failure recovery |
| `/user/wishlist` | Saved destinations |
| `/user/profile` | Profile, emergency contact, preferences |

### Guide

| Path | Purpose |
| --- | --- |
| `/guide/dashboard` | Guide overview |
| `/guide/bookings` | Booking requests, negotiation, cash confirmation, completion |
| `/guide/live` | Assigned live trip monitoring |
| `/guide/earnings` | Commissions and payout requests |
| `/guide/reviews` | Reviews and responses |
| `/guide/availability` | Availability management |
| `/guide/places` | Submit and track places |
| `/guide/profile` | Guide profile editing |

### Admin

| Path | Purpose |
| --- | --- |
| `/admin/dashboard` | Platform overview |
| `/admin/guides` | Guide/user management |
| `/admin/add-guide` | Create guide account |
| `/admin/places` | Destination moderation |
| `/admin/map` | Approved destination map and live trip monitor |
| `/admin/bookings` | Booking inspection |
| `/admin/commissions` | Commission settings and reporting |
| `/admin/payouts` | Payout processing and CSV export |
| `/admin/analytics` | Platform analytics |
| `/admin/settings` | Admin settings page |

## Backend API

Base path:

```text
/api
```

### Auth

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/auth/register` | Create traveler account |
| `POST` | `/auth/login` | Email/password login |
| `POST` | `/auth/request-otp` | Request login OTP |
| `POST` | `/auth/login-otp` | OTP login |
| `POST` | `/auth/send-registration-otp` | Request registration OTP |
| `POST` | `/auth/verify-registration-otp` | Verify registration OTP |
| `GET` | `/auth/me` | Current user |
| `POST` | `/auth/logout` | Clear cookie and blacklist token |
| `POST` | `/auth/forgot-password` | Send reset email |
| `PUT` | `/auth/reset-password/:token` | Reset password |
| `GET` | `/auth/verify-email/:token` | Verify email |

### Destinations

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/destinations` | Public | Approved published destinations |
| `GET` | `/destinations/featured` | Public | Featured list |
| `GET` | `/destinations/nearby` | Public | Geospatial nearby lookup |
| `GET` | `/destinations/search` | Public | Search destinations |
| `GET` | `/destinations/:id` | Public | Destination detail |
| `POST` | `/destinations` | Admin/Guide | Create destination, with best-effort geocoding |
| `POST` | `/destinations/:id/media` | Admin/Guide | Upload destination images |
| `GET` | `/destinations/admin` | Admin | Admin destination list |
| `PATCH` | `/destinations/:id/verify` | Admin | Approve/reject submitted place |
| `PUT` | `/destinations/:id` | Admin | Edit destination |
| `DELETE` | `/destinations/:id` | Admin | Delete destination |
| `GET` | `/destinations/my-places` | Guide | Guide submitted places |
| `GET` | `/destinations/stats` | Admin | Destination stats |

### Guides

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/guides` | Public/Auth | Guide listing |
| `GET` | `/guides/:id` | Public | Guide profile |
| `GET` | `/guides/:id/booking-history` | Public | Public guide trip history |
| `GET` | `/guides/pending` | Admin | Pending guide list |
| `PATCH` | `/guides/:id/verify` | Admin | Verify/reject guide |
| `POST` | `/guides` | Admin | Create guide |
| `PUT` | `/guides/:id` | Admin/Guide scoped | Update guide |
| `PATCH` | `/guides/:id/suspend` | Admin | Suspend guide |
| `PATCH` | `/guides/:id/revoke` | Admin | Revoke guide |

### Bookings

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| `POST` | `/bookings` | Tourist | Create booking request |
| `GET` | `/bookings/my-bookings` | Tourist | Traveler bookings |
| `GET` | `/bookings/my-requests` | Guide | Guide booking requests |
| `GET` | `/bookings/:id` | Participant/Admin | Booking detail |
| `PATCH` | `/bookings/:id/destinations` | Tourist | Update selected destination IDs |
| `PUT` | `/bookings/:id/accept` | Guide | Direct accept |
| `PUT` | `/bookings/:id/decline` | Guide | Decline |
| `PUT` | `/bookings/:id/counter-offer` | Guide | Counter price |
| `PUT` | `/bookings/:id/revise-offer` | Tourist | Revise offer |
| `PUT` | `/bookings/:id/accept-price` | Participant | Accept latest negotiated price |
| `PUT` | `/bookings/:id/cancel` | Tourist | Cancel eligible booking |
| `PUT` | `/bookings/:id/complete` | Participant | Confirm completion |
| `GET` | `/bookings` | Admin | All bookings |
| `GET` | `/bookings/stats` | Admin | Booking stats |

### Payments

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| `POST` | `/payments/initiate` | Tourist | Start eSewa checkout |
| `POST` | `/payments/verify` | Tourist/Admin | Verify eSewa callback/result |
| `POST` | `/payments/cash` | Tourist | Select cash payment |
| `POST` | `/payments/confirm-cash` | Guide | Confirm cash received |
| `GET` | `/payments/:bookingId/status` | Auth | Payment state |

### Trips And AI

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| `POST` | `/trips` | Auth | Create saved trip |
| `GET` | `/trips` | Auth | Own saved trips |
| `PUT` | `/trips/:id` | Owner | Update trip |
| `DELETE` | `/trips/:id` | Owner | Delete trip |
| `POST` | `/trips/:id/optimize` | Owner | Optimize route |
| `POST` | `/trips/:id/snack-stops` | Owner | Save route-side stop |
| `DELETE` | `/trips/:id/snack-stops/:stopIndex` | Owner | Remove saved route-side stop |
| `POST` | `/ai/generate-itinerary` | Tourist | Generate and save itinerary |

### Other API Areas

| Path | Purpose |
| --- | --- |
| `/wishlist` | Wishlist read/add/remove |
| `/reviews` | Guide and destination reviews |
| `/map-pins` | Personal/public map pins |
| `/notifications` | Stored notifications and unread state |
| `/analytics` | Admin analytics |
| `/live-trips` | Permitted live trip sessions |
| `/commissions` | Admin commission settings and guide commission records |
| `/payouts` | Guide payout requests and admin payout processing |
| `/health` | API health check |

## Realtime Events

Socket.IO uses the backend server and authenticates through the `token` cookie.

| Event | Direction | Purpose |
| --- | --- | --- |
| `guide:toggle-online` | Client -> Server | Guide online status |
| `guide:online-status` | Server -> Clients | Broadcast guide online update |
| `guides:get-online` | Client -> Server | Fetch online guides |
| `guides:online-list` | Server -> Client | Online guide IDs |
| `booking:counter-offer` | Relay | Booking negotiation update |
| `booking:accept-price` | Relay | Price accepted update |
| `booking:decline` | Relay | Booking declined update |
| `notification` | Server -> User | New notification |
| `joinTripRoom` | Client -> Server | Join live trip room |
| `leaveTripRoom` | Client -> Server | Leave live trip room |
| `updateLocation` | Client -> Server | Traveler location checkpoint |
| `tripLocationUpdated` | Server -> Room | Latest traveler location |
| `triggerSOS` | Client -> Server | Send SOS alert |
| `SOS_ALERT` | Server -> Room/Admin/Guide | Emergency broadcast |
| `liveTripState` | Server -> Room | Live room snapshot |
| `liveTripEventRecorded` | Server -> Room | Persisted live event |
| `liveTrip:error` | Server -> Client | Live trip access/payload error |

## Data Models

| Model | Purpose |
| --- | --- |
| `User` | Accounts, roles, guide profile, traveler preferences, status, commission override |
| `Destination` | Places, moderation, publication, media, ratings, geospatial coordinates |
| `Booking` | Guide booking, custom destinations, negotiation, payment, completion |
| `Trip` | Saved itinerary and route-side stops |
| `Wishlist` | Saved destinations |
| `Review` | Guide/destination reviews and guide responses |
| `MapPin` | User-created public/private pins |
| `Notification` | Stored notifications |
| `OTP` | Expiring OTP records |
| `TokenBlacklist` | Logout token invalidation |
| `LiveTripEvent` | Live room join/leave/location/SOS history |
| `Commission` | Platform/guide split for completed bookings |
| `Payout` | Guide payout requests and admin payout batches |
| `PlatformSettings` | Default commission and route snack buffer settings |

## Tech Stack

### Frontend

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- Radix UI / shadcn-style components
- Lucide icons
- Leaflet / React Leaflet
- Socket.IO client
- Axios
- Vitest

### Backend

- Node.js
- Express 5
- MongoDB / Mongoose
- Socket.IO
- JWT
- bcrypt
- Helmet
- express-rate-limit
- Multer / Cloudinary
- Nodemailer
- node-cron
- Jest / Supertest / mongodb-memory-server

### Map And Route Services

- OpenStreetMap tiles for basemaps.
- Nominatim for place-name geocoding.
- OSRM public route service for driving route geometry.
- Overpass API for route-side hotels/restaurants/cafes.

## Setup

### Prerequisites

- Node.js compatible with Next.js 16.
- npm.
- MongoDB or MongoDB Atlas.
- SMTP credentials for email/OTP flows.
- Optional eSewa sandbox credentials.
- Optional AI provider credentials.

### Install Dependencies

```bash
cd backend
npm install

cd ../frontend
npm install
```

### Backend Environment

Create `backend/.env`:

```env
PORT=5001
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/yatra
JWT_SECRET=replace-with-a-long-random-secret-at-least-32-characters
FRONTEND_URL=http://localhost:3000
NOMINATIM_USER_AGENT=YatraTravelApp/1.0
```

Validate:

```bash
cd backend
npm run validate-env
```

Start API:

```bash
npm run dev
```

Health check:

```text
GET http://localhost:5001/health
```

### Frontend Environment

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5001/api
NEXT_PUBLIC_LEAFLET_TILE_URL=https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
```

Start frontend:

```bash
cd frontend
npm run dev
```

Open:

```text
http://localhost:3000
```

### Admin Account

Public registration only creates traveler accounts. An initial admin must be inserted through database/bootstrap tooling before admin screens can be used. Admins create guide accounts from the admin workspace.

## Environment Variables

### Backend Required

| Variable | Description |
| --- | --- |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | JWT secret, minimum 32 characters |
| `FRONTEND_URL` | Allowed frontend origin(s), comma-separated |

### Backend Optional

| Variable | Description |
| --- | --- |
| `PORT` | API port, default `5001` |
| `NODE_ENV` | `development`, `test`, or `production` |
| `JWT_EXPIRE` | JWT lifetime |
| `RATE_LIMIT_WINDOW_MS` | Global rate-limit window |
| `RATE_LIMIT_MAX` | Global max requests |
| `AUTH_RATE_LIMIT_WINDOW_MS` | Auth rate-limit window |
| `AUTH_RATE_LIMIT_MAX` | Auth max requests |
| `NOMINATIM_USER_AGENT` | User agent used for backend geocoding requests |
| `EMAIL_HOST` / `EMAIL_PORT` | SMTP server |
| `EMAIL_USER` / `EMAIL_PASSWORD` | SMTP credentials |
| `EMAIL_FROM` | Sender address |
| `ESEWA_SECRET_KEY` | eSewa signing secret |
| `ESEWA_PRODUCT_CODE` | eSewa merchant/product code |
| `ESEWA_PAYMENT_URL` | eSewa checkout URL |
| `ESEWA_STATUS_URL` | eSewa status URL |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `DEFAULT_COMMISSION_RATE` | Initial platform commission, default `0.15` |
| `SNACK_BUFFER_DISTANCE_KM` | Initial route-side lookup buffer |

### AI Provider Variables

| Variable | Description |
| --- | --- |
| `AI_PROVIDER` | Provider order, e.g. `openrouter,ollama,heuristic` |
| `OPENROUTER_API_KEY` | OpenRouter credential |
| `OPENROUTER_MODEL` | OpenRouter model |
| `OPENROUTER_BASE_URL` | OpenRouter-compatible base URL |
| `OLLAMA_BASE_URL` | Local Ollama/OpenAI-compatible base URL |
| `OLLAMA_MODEL` | Local model |
| `OPENAI_API_KEY` | Optional OpenAI key |
| `OPENAI_MODEL` | Optional OpenAI model |
| `OPENAI_BASE_URL` | Optional OpenAI-compatible base URL |

### Frontend

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | REST API base URL |
| `NEXT_PUBLIC_LEAFLET_TILE_URL` | Leaflet tile template |
| `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` | Declared map config option |
| `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID` | Declared analytics config |
| `NEXT_PUBLIC_VERCEL_ANALYTICS_ID` | Declared analytics config |
| `NEXT_PUBLIC_ENABLE_AI_FEATURES` | Declared feature flag |
| `NEXT_PUBLIC_ENABLE_STUNNING_MAP` | Declared feature flag |
| `NEXT_PUBLIC_ENABLE_REAL_TIME_NOTIFICATIONS` | Declared feature flag |

## Scripts

### Backend

Run from `backend/`.

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start API with Nodemon |
| `npm start` | Start API with Node |
| `npm test` | Run Jest tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run lint` | Lint backend |
| `npm run lint:fix` | Fix backend lint issues |
| `npm run validate-env` | Validate required env |

### Frontend

Run from `frontend/`.

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Build production frontend |
| `npm start` | Serve built frontend |
| `npm run lint` | Lint frontend |
| `npm run lint:fix` | Fix frontend lint issues |
| `npm test` | Run Vitest tests |
| `npm run test:ui` | Run Vitest UI |
| `npm run test:smoke` | Run frontend smoke tests |

## Testing

Backend tests cover:

- Basic routing.
- Auth and role escalation prevention.
- Destination visibility/moderation.
- Payment verification behavior.
- Commission utilities.
- Route optimization.
- Rate limiting.
- Analytics.

```bash
cd backend
npm test
```

Frontend tests cover:

- Smoke rendering.
- Route-side utility calculations.

```bash
cd frontend
npm test
```

Recent verification:

```text
frontend: npm.cmd run build
frontend: npm.cmd run lint -- --quiet
backend:  npm.cmd run lint
backend:  npm.cmd test -- --runInBand
```

## Project Structure

```text
yatra/
|-- backend/
|   |-- src/
|   |   |-- config/       # Database, Cloudinary, env validation
|   |   |-- controllers/  # Request handlers
|   |   |-- middleware/   # Auth, validation, upload, error handling
|   |   |-- models/       # Mongoose models
|   |   |-- routes/       # Express route modules
|   |   |-- sockets/      # Live trip and location sockets
|   |   |-- utils/        # Email, OTP, Nominatim, routes, commissions, notifications
|   |   |-- app.js        # Express app
|   |   `-- server.js     # HTTP server, sockets, cron jobs
|   `-- tests/
|-- frontend/
|   |-- app/              # Next.js routes
|   |-- components/       # UI, layout, map, booking, landing components
|   |-- context/          # Auth, sockets, notifications
|   |-- hooks/
|   |-- lib/              # API, geocoding, route, payment, map helpers
|   |-- public/
|   |-- tests/
|   `-- proxy.ts          # Role/session redirect logic
`-- README.md
```

## Notes

- Nominatim is used for place-name lookup. Backend geocoding is best-effort: if Nominatim is unavailable, saves continue when valid coordinates already exist.
- OSRM and Overpass are called from the frontend for route geometry and route-side hotels/restaurants.
- The active-trip nearby list is route-based, not just radius-around-current-location. When traveler live location changes, the route starts from the new location and the nearby list can change.
- The booking schema still allows the legacy `khalti` payment method value, but the implemented payment UI/API uses eSewa and cash.
- `/destinations/[slug]` exists in the frontend, while the active backend public detail endpoint is `GET /api/destinations/:id`.

