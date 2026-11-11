# TherapySession Admin

Appointment-only admin tool for counsellors' scheduling. Tracks appointment slots and attendance **without** storing private session details.

**Stack:** React (Vite) · Node.js + Express REST API · MongoDB (Mongoose)

## Features
- Admin-only login (JWT, bcrypt-hashed passwords, login rate limiting). No client/patient accounts exist.
- Counsellors: add, activate/deactivate.
- Appointments: create, edit, delete, filter (counsellor / status / date range).
- Attendance tracking: scheduled → attended / missed / cancelled, with per-counsellor summary.
- Double-booking protection (overlap check + unique index).
- Input validation on client and server, consistent JSON error handling.
- Responsive UI (table collapses to cards on phones).

## Privacy design (scheduling metadata vs private notes)
| Concern | How it is handled |
|---|---|
| Private session notes | **No field exists** for notes, diagnosis or session content. |
| Client identity | Only a pseudonymous `clientRef` code (e.g. `C-1042`); full names are rejected by validation. Counsellors map codes to people in their own private system. |
| Contact details | Not collected (no phone, email, address). |
| Smuggling extra data | Express validation rejects unknown fields **and** Mongoose uses `strict: 'throw'`. |
| Access | Every `/api/counsellors` and `/api/appointments` route requires an admin JWT. Tokens kept in `sessionStorage` (cleared on tab close). |
| Server hardening | `helmet`, restricted CORS, 10kb body limit, errors never leak internals. |

## Setup
Prerequisites: Node 18+, a running MongoDB (local or Atlas).

```bash
# 1. API
cd server
cp .env.example .env        # edit JWT_SECRET, MONGO_URI, admin password
npm install
npm run seed                # creates the admin user + 2 sample counsellors
npm run dev                 # http://localhost:5000

# 2. Frontend (new terminal)
cd client
npm install
npm run dev                 # http://localhost:5173 (proxies /api to :5000)
```
Sign in with the `SEED_ADMIN_USERNAME` / `SEED_ADMIN_PASSWORD` from your `.env`.

## Tests
```bash
cd server && npm test       # validation + access-control tests (no database needed)
```

## API summary
| Method | Route | Purpose |
|---|---|---|
| POST | `/api/auth/login` | Admin login → JWT |
| GET/POST | `/api/counsellors` | List / add |
| PUT/DELETE | `/api/counsellors/:id` | Update / delete (blocked if appointments exist) |
| GET | `/api/appointments?counsellor=&status=&from=&to=` | List with filters |
| POST | `/api/appointments` | Create |
| PUT | `/api/appointments/:id` | Edit |
| PATCH | `/api/appointments/:id/status` | Mark attended / missed / cancelled |
| DELETE | `/api/appointments/:id` | Delete |
| GET | `/api/appointments/stats/summary` | Attendance counts per counsellor |

## Project structure
```
server/src  models/ routes/ middleware/ validate.js app.js index.js seed.js
client/src  pages/ components/ api.js App.jsx styles.css
```
