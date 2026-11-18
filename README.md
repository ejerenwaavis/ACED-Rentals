# ACED Rentals

> Route-ready cargo minivan rentals for delivery drivers, contractors, DSPs, and independent couriers across Metro Atlanta.

Live Website: [https://acedrentals.com](https://acedrentals.com)  
Admin Portal: [https://acedrentals.com/admin](https://acedrentals.com/admin)

---

## Architecture

This project is built following a **one-unit development** pattern where backend and frontend coexist cleanly in a single repository structured under the **MVC (Model-View-Controller)** pattern:

```text
ACED Rentals/
├── config/
│   └── db.js                 # Resilient Mongoose / MongoDB Atlas connection & auto-migration
├── controllers/
│   ├── adminController.js    # Admin dashboard metrics and reporting
│   ├── authController.js     # Secure session-based authentication
│   └── waitlistController.js # Lead validation, deduplication, and streaming CSV export
├── models/
│   ├── Admin.js              # Admin credential verification
│   └── Waitlist.js           # Waitlist schema & unified MongoDB / JSON fallback store
├── middleware/
│   ├── auth.js               # Route guard for admin panel endpoints
│   └── rateLimiter.js        # In-memory IP rate limiter for public forms
├── routes/
│   ├── adminRoutes.js        # Protected admin management endpoints
│   ├── apiRoutes.js          # Public waitlist submission & health checks
│   └── authRoutes.js         # Authentication login / logout / session checks
├── public_html/              # Top-level public web root served by Passenger
│   ├── .htaccess             # LiteSpeed & Passenger directives, HTTPS redirect
│   ├── index.html            # High-conversion delivery-driver Coming Soon page
│   └── admin/
│       ├── index.html        # Real-time admin dashboard with search, notes & CSV export
│       └── login.html        # Clean admin authentication form
├── data/
│   ├── waitlist.json         # Local fallback store (git-ignored)
│   └── waitlist.json.example # Fallback store template
├── app.js                    # Express application entrypoint (Passenger-ready)
├── package.json
└── .env.example
```

---

## Features

- **Delivery Driver Early Access Page**:
  - Interactive SVG cargo minivan with package stacking and animated delivery route.
  - Value props tailored to Metro Atlanta DSP drivers and couriers (140+ cu ft, 150+ packages, flat weekly pricing).
  - Responsive waitlist submission supporting email addresses and 10–15 digit mobile numbers.
  - Automatic spot reservation counter and early-access discount voucher locking.
  - Client-side deduplication messaging and live input validation.

- **Admin Management Portal (`/admin`)**:
  - Secure session-based login.
  - Real-time KPI summary (Total Leads, Today's Submissions, Emails vs. Phones, MongoDB Status).
  - Search filter and status toggle (`new`, `contacted`, `reserved`).
  - Inline lead notes with instant autosave.
  - One-click contact copy to clipboard.
  - Full CSV export streaming (`/api/admin/export`).

- **Database Reliability**:
  - Primary data store: **MongoDB Atlas** cluster.
  - High availability: automatically falls back to local JSON storage if the database is unreachable, with automated migration back into MongoDB upon reconnection.

---

## Getting Started

### 1. Prerequisites
- Node.js 18+ (tested on Node.js 20 LTS)
- npm 9+
- MongoDB Atlas cluster or local MongoDB instance

### 2. Installation
```bash
git clone https://github.com/ejerenwaavis/ACED-Rentals.git
cd ACED-Rentals
npm install
```

### 3. Environment Variables
Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/aced_rentals?retryWrites=true&w=majority
SESSION_SECRET=your-secure-session-secret-here
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-secure-admin-password
```

### 4. Running Locally
```bash
node app.js
```

Open your browser:
- **Landing Page**: [http://localhost:3000](http://localhost:3000)
- **Admin Login**: [http://localhost:3000/admin](http://localhost:3000/admin)
- **Health Check**: [http://localhost:3000/api/health](http://localhost:3000/api/health)

---

## Production Deployment (Namecheap / CloudLinux Passenger)

1. **Deploy Files**:
   Push to GitHub or sync via `scp`/`rsync` to `/home/<user>/app`.

2. **Install Production Dependencies**:
   ```bash
   /home/<user>/nodevenv/app/20/bin/npm install --omit=dev
   ```

3. **Restart Node / Passenger**:
   ```bash
   touch /home/<user>/app/tmp/restart.txt
   pkill -9 -u <user> -f node
   ```

4. **SSL / HTTPS**:
   Enforced via `.htaccess` with automated Let's Encrypt / Sectigo certificates.

---

## License

Proprietary © 2026 ACED Rentals LLC. All rights reserved.
