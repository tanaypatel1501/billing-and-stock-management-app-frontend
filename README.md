# GST Medicose

A full-stack **pharmacy billing and stock management** application for Indian retailers and wholesalers. It handles GST invoicing, batch- and expiry-aware stock, customer (purchaser) records, sales analytics and an AI assistant, on web, Android and desktop.

| Repository | Role |
|---|---|
| `billing-and-stock-management-app-backend` | Spring Boot REST API, MySQL, PDF/email/OCR/chatbot services |
| `billing-and-stock-management-app-frontend` | Angular web app, Capacitor Android app, Electron desktop packaging |

---

## Features

### Billing
- **Three-step bill creation**: pick the purchaser, add items, review before submitting (the review step prevents lost items).
- Items are picked **by batch**, with batch number, expiry date, MRP, rate, quantity and **free quantity** per line.
- **GST handling** with a per-shop tax mode: CGST + SGST or IGST. HSN, CGST and SGST are snapshotted onto each bill line so old bills never change when the product master changes.
- **Drug licence numbers** (DL1, DL2) and GSTIN stored per purchaser and printed on the invoice.
- **Two invoice templates**, selectable in Settings.
- **PDF invoices** (Thymeleaf + Flying Saucer/iText) with amount in words, rupee symbol, filler rows and a **UPI QR code** (optional per shop).
- **Share** an invoice by Print, Save PDF, native share sheet, email or WhatsApp.
- **Bulk PDF export** of selected bills as a ZIP, with a date-range filter.
- **Paid / unpaid** flag on each bill.
- **Revert bill**: transactional stock restoration with compensating `REVERTED` stock-log entries and a soft-delete flag, so bill numbers are never reused.

### Stock and inventory
- Stock rows keyed by product, **batch, expiry and MRP**, per shop.
- **Daily expiry alert emails** (9:00 AM IST): items expiring within 30 days and already-expired items, each notified once.
- Inventory value split into **active vs expired**.
- **Stock log** for every movement (sold, reverted), shown on a full-page paginated view with infinite scroll.
- Dashboard with filter and sort, and zero-quantity batches hidden.
- **Camera / image label scanning (OCR)** to fill in stock details.
- **Bulk product upload** from CSV or Excel with per-row results.

### Product catalogue
- A shared product master (name, HSN, MRP, CGST, SGST, packing) managed by admins.
- **Product request workflow**: shop users request a missing product, an admin approves or rejects, and requests **auto-approve** after a configurable delay.

### Customers (purchasers)
- Paginated, searchable purchaser records with GSTIN and drug licence numbers.
- **PIN-code lookup** (India postal data) to fill state, city and address when entering shop details.

### Sales analytics
- Summary, monthly and yearly sales, top products and available years, with a paid-only filter.
- **AI sales assistant**: ask questions in English, Hindi or Hinglish and get answers from your own bills, stock and purchasers (see [Chatbot](#sales-chatbot)).

### Accounts and security
- Email and password login with **email verification**, forgot / reset password and **Google Sign-In**.
- Short-lived JWT plus a refresh token, and a **30-day sliding mobile session** for the Android app.
- Role-based access (`ADMIN`, `USER`) with `@PreAuthorize`; user identity is always taken from the JWT, never from request parameters, to prevent IDOR.
- Shop profile: name, address, DL / FSSAI / GSTIN, bank details, UPI ID, logo (stored in S3-compatible storage), tax mode and invoice template.

### Platforms and UX
- **Web** (Angular 16, Bootstrap), responsive, dark / light theme.
- **Android** (Capacitor 8) with a native bottom dock plugin and native print.
- **Desktop** packaging through Electron scripts.
- Skeleton loaders, shared pagination and spinner components, request caching, debounced search, session-expiry handling.

---

## Architecture

```
┌────────────────────┐        HTTPS / JWT        ┌─────────────────────────┐
│ Angular 16 web app │ ────────────────────────▶ │ Spring Boot 3 REST API  │
│ Capacitor Android  │                           │  controllers → services │
│ Electron desktop   │ ◀──────────────────────── │  → JPA repositories     │
└────────────────────┘                           └──────┬──────────┬───────┘
                                                        │          │
                              ┌─────────────────────────┘          └───────────────┐
                              ▼                                                    ▼
                    MySQL 8 (Flyway migrations)            Gmail API · Tebi S3 · OCR service · Gemini
```

### Backend layout (`com.gst.billingandstockmanagement`)

| Package | Contents |
|---|---|
| `controllers` | Auth, Google auth, email verification, bills, stock, stock logs, products, product requests, purchasers, sales, details, PDF, OCR, postal, user, mobile session, health |
| `services` | Business logic (`bill`, `stock`, `pdf`, `email`, `sales`, `product`, `productrequest`, `purchaser`, `postal`, `details`, `user`, `resetpassword`, `stocklogs`) |
| `entities` | `Bill`, `BillItems`, `Stock`, `StockLog`, `Product`, `ProductRequest`, `Purchaser`, `Details`, `User`, `IndiaPostalData`, `MobileSessionToken`, `PasswordResetToken` |
| `chatbot` | Gemini client, prompt, SQL guard, rate limiter, name / entity resolver, language detection |
| `security`, `filters`, `configuration` | JWT filter, `SecurityUtils`, CORS, Gmail and S3 config, keep-warm services |
| `resources/db/migration` | Flyway scripts `V2` to `V9` |
| `resources/templates` | `invoice-template.html`, `invoice-template-2.html` |

### Frontend layout (`src/app`)

| Folder | Contents |
|---|---|
| `components` | Login, register, verify email, forgot / reset password, navbar, menu, home, profile, settings |
| `user/components` | Dashboard (stock), create bill, bills, bill preview, invoice templates 1 and 2, purchasers, sales (+ chatbot), stock logs, stock forms, product request, shop details |
| `admin/components` | Product management, bulk upload, product requests, admin dashboard |
| `services` | Auth, Google auth, mobile session, request cache, app state, label scanner, native dock, native print, theme, user activity |
| `guards`, `interceptors` | Admin / user / no-auth guards, auth and loading interceptors |
| `android/` | Capacitor project with `LiquidDockView`, `LiquidDockPlugin`, `PdfPrintPlugin` |

---

## Sales chatbot

Natural-language questions are turned into a single read-only MySQL `SELECT` by an LLM (Gemini), then executed against **per-user views**.

- The model can only query `v_bills`, `v_bill_items`, `v_stock` and `v_purchasers`.
- Each view filters on `chatbot_uid()`, which reads a session variable set by the backend from the JWT. If it is unset, every view returns zero rows.
- SQL is parsed and validated (`SqlGuard`, JSqlParser) before running, and a dedicated database user can be used (`CHATBOT_DB_USERNAME` / `CHATBOT_DB_PASSWORD`).
- Out-of-scope questions (general knowledge, other users, changing data) are refused without running any SQL.
- Per-user rate limiting, English / Hindi / Hinglish replies, follow-up context and purchaser / product name disambiguation.

---

## Tech stack

| Layer | Technology |
|---|---|
| Backend | Java 17, Spring Boot 3.1, Spring Security (JWT, OAuth2 resource server), Spring Data JPA, Thymeleaf |
| Database | MySQL 8, Flyway |
| PDF | Flying Saucer + iText, ZXing (QR) |
| Files / import | AWS SDK S3 (Tebi), OpenCSV, Apache POI |
| Email | Gmail API |
| AI | Google Gemini |
| Frontend | Angular 16, TypeScript, Bootstrap 5, ng-bootstrap, FontAwesome |
| Mobile / desktop | Capacitor 8 (Android), Electron |
| Frontend libraries | tesseract.js, xlsx, angularx-qrcode, ngx-image-cropper, pdfjs-dist |
| CI/CD | GitHub Actions, Docker (multi-stage build), Koyeb and OCI |

---

## Getting started

### Prerequisites
- JDK 17, MySQL 8, Node (see `.nvmrc`) and npm

### Backend

```bash
cd billing-and-stock-management-app-backend
# create a MySQL database, then set the variables below
./mvnw spring-boot:run -Dspring-boot.run.profiles=local
```

Docker:

```bash
docker build -t gst-medicose-backend .
docker run -p 8080:8080 --env-file .env gst-medicose-backend
```

Environment variables:

| Variable | Purpose |
|---|---|
| `SPRING_PROFILES_ACTIVE` | `local`, `dev` or `prod` |
| `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` | MySQL connection |
| `CHATBOT_DB_USERNAME`, `CHATBOT_DB_PASSWORD` | Restricted DB user for chatbot queries |
| `JWT_SECRET`, `JWT_REFRESH_EXPIRATION_MS` | Token signing and refresh lifetime |
| `MOBILE_SESSION_EXPIRATION_MS` | Android session length (default 30 days) |
| `CLIENT_URL`, `RESET_PASSWORD_URL` | Frontend URL for emails and CORS |
| `GOOGLE_CLIENT_ID` | Google Sign-In |
| `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN` | Sending email |
| `TEBI_ENDPOINT`, `TEBI_BUCKET_NAME`, `TEBI_ACCESS_KEY`, `TEBI_SECRET_KEY` | Logo storage |
| `OCR_URL` | OCR microservice |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | Chatbot LLM |
| `AUTO_APPROVE_DELAY` | Product-request auto-approval delay |
| `DDL_AUTO` | Hibernate DDL mode |

Flyway applies the migrations in `db/migration` on startup.

### Frontend

```bash
cd billing-and-stock-management-app-frontend
npm install
# set BASIC_URL (API base) and GOOGLE_CLIENT_ID; scripts/inject-env.js fills
# src/assets/runtime-config.template.js at build time
npx ng serve            # http://localhost:4200
```

`npm start` launches the Angular dev server together with Electron.

Android:

```bash
npm run build
npx cap sync android
npx cap open android
```

Desktop packages: `npm run package:win`, `package:linux`, `package:osx`.

---

## Deployment

- **Backend**: Docker image built from `Dockerfile`; GitHub Actions workflows `deploy.yml` (master) and `deploy-dev.yml` redeploy to Koyeb (health-checked via `/health-check/server`) and then to OCI.
- **Frontend**: static Angular build with SPA redirects (`src/_redirects`) and runtime configuration injected at build.
- Keep-warm services (`SelfPingScheduler`, Koyeb warm-up filter) reduce cold-start delays on free hosting.

---

## API overview

| Base path | Highlights |
|---|---|
| `/authenticate`, `/refresh-token`, `/forgot-password`, `/reset-password`, `/logout`, `/sign-up`, `/auth/google`, `/verify-email`, `/resend-verification`, `/mobile-session/renew` | Authentication |
| `/api/bill` | `add`, `{id}`, `user`, `search`, `delete/{id}`, `PATCH {id}/paid`, `POST {id}/revert` |
| `/api/stock` | `add`, `update`, `user`, `search`, `user/inventory-value`, `{id}` |
| `/api/stock-logs` | Create, by stock, by user (paginated) |
| `/api/product` | Admin CRUD, `bulk` upload, `search` |
| `/api/product-requests` | `submit`, `my`, `pending`, `all`, admin `approve` / `reject` |
| `/api/purchaser` | `save`, `page`, `search`, delete |
| `/api/sales` | `user/summary`, `top-products`, `monthly`, `yearly`, `years` |
| `/api/pdf` | `bill/{id}`, `bills/zip` |
| `/api/details`, `/api/user`, `/api/postal`, `/api/ocr/scan`, `/logo` | Shop profile, user profile, PIN lookup, OCR, logo |

---

## Current limitations and ideas

Candidates for future work, based on what the code does not do today:

| Area | Status |
|---|---|
| Partial payments, outstanding / aging report, payment receipts | Only a paid / unpaid flag exists |
| GSTR-1 / GSTR-3B export, HSN summary | Not implemented (tax and HSN data are already stored per line) |
| Credit notes / sales returns | Revert exists; no GST credit note document |
| Supplier purchase entry, purchase cost, profit and loss, ITC | Not implemented (the chatbot reports that purchase cost is not tracked) |
| Barcode scanning | OCR label scanning only |
| Backup / restore and trash bin | Not implemented |
| Thermal (58 / 80 mm) receipt printing | Not implemented |
| Pharmacy registers (Schedule H / H1), near-expiry returns to supplier, salt-based search | Not implemented |
| E-way bill, e-invoicing (IRN) | Not implemented |
| Multiple staff accounts per shop / branches | Roles are `ADMIN` and `USER` (one user is one shop) |
| Automated tests | Minimal (a context-load test on the backend, a few component specs on the frontend) |
