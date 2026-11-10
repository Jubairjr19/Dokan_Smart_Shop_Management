# Dokan - Smart Shop Management (Backend)

REST API for the Dokan frontend, built with Node.js, Express, PostgreSQL and Prisma. It implements the SRS workflow: sales reduce stock, purchases increase stock, credit sales create dues, and payments update balances.

## Quick start for testing

You only need [Node.js](https://nodejs.org) 18.18 or newer. PostgreSQL does not have to be installed.

```bash
npm install
npm run dev:local
```

The first run creates `.env`, a private database in `.dokan-dev-db` in your home folder, and the demo data. Later runs keep your data. To start again from the original demo data, stop the command, delete that folder, and run it again.

In this mode only, **Continue with Google** on the login page signs you straight in to the demo account. It does not contact Google. It answers only requests from your own computer, and the server refuses to start in production with it turned on.

## Run it with your own PostgreSQL

You need Node.js 18.18 or newer and PostgreSQL. Use this for deployment.

**1. Create a UTF-8 database.** The `৳` symbol is stored in notifications, so the database must be UTF-8. A database in the Windows `WIN1252` encoding fails with a "has no equivalent in encoding" error.

```sql
CREATE DATABASE dokan ENCODING 'UTF8' TEMPLATE template0;
```

**2. Install and configure.**

```bash
npm install
cp .env.example .env     # On Windows Command Prompt: copy .env.example .env
```

Open `.env` and set `DATABASE_URL` to your database's user, password and port.

**3. Create the tables and load the demo data, then start the API.**

```bash
npm run setup
npm run dev
```

The API runs at http://localhost:5000. Check http://localhost:5000/api/health.

**Demo logins:** `admin@dokan.example` / `dokan123` (admin) and `manager@dokan.example` / `dokan123` (manager).

| Command | What it does |
|---|---|
| `npm run dev:local` | Starts a private database and the API, for testing without PostgreSQL |
| `npm run dev` | Starts the API and restarts it when files change |
| `npm start` | Starts the API |
| `npm run setup` | Applies migrations, then seeds. **Seeding deletes all existing data** |
| `npm run db:migrate` | Applies migrations only. Use this in production |
| `npm run db:seed` | **Deletes all data** and reloads the demo data. Refuses to run with `NODE_ENV=production` |
| `npm run db:studio` | Opens a database browser |

## Demo data

The seed creates real rows and checks the computed totals before finishing, so the dashboard shows these figures through its normal calculations:

| Figure | Value | Made up of |
|---|---|---|
| Revenue | ৳ 248,500 | 182 sales over the last 7 days, matching the design's weekly chart |
| Expense | ৳ 96,400 | ৳ 86,200 of purchases + ৳ 10,200 of running costs |
| Net profit | ৳ 152,100 | Revenue - expense |
| Business capital | ৳ 685,000 | ৳ 532,900 configured capital + profit |
| Products | 828 | The 8 products from the design + 820 generated ones |

Dates are relative to the day you seed, so re-seed if the demo data has aged out of the charts.

## Using the API

- **Sign-in:** send `Authorization: Bearer <token>`, using the token from login or register.
- **Branches:** send `X-Account-Id: <accountId>` to choose a branch. Without it, the user's first branch is used.
- **Success:** `{ "data": ... }`. Lists also include `pagination`, read with `?page=` and `?limit=` (default 50, maximum 1000).
- **Errors:** `{ "error": { "code", "message", "details" } }`.

### Routes

| Method and path | Purpose |
|---|---|
| `POST /api/auth/register`, `POST /api/auth/login` | Create an account or sign in. Returns a JWT |
| `GET /api/auth/me`, `PUT /api/auth/password` | Current user, change password |
| `GET, POST /api/accounts`, `PUT /api/accounts/:id` | Branches and capital. Changes are admin only |
| `GET, PUT /api/settings` | Shop, SMS, alerts and payment settings. `PUT` is admin only |
| `GET /api/dashboard/metrics` | Revenue, expense, profit, capital, stock and dues |
| `GET /api/dashboard/charts?period=` | Chart.js data. `period` is `daily`, `weekly` or `monthly`; omit it for all three |
| `GET /api/dashboard/top-products` | Best sellers |
| `GET, POST /api/products`, `GET, PUT, DELETE /api/products/:id` | Inventory. Filters: `search`, `category`, `supplierId`, `status` |
| `POST /api/products/import` | Bulk create from `{ "products": [...] }`. All rows save, or none do |
| `GET, POST /api/sales`, `GET /api/sales/:id` | Sales history, POS checkout, invoice data |
| `GET, POST /api/purchases`, `GET /api/purchases/:id` | Purchase orders and supplier balances |
| `POST /api/purchases/:id/pay-due` | Pay a supplier |
| `GET, POST /api/suppliers`, `PUT /api/suppliers/:id` | Suppliers |
| `GET, POST /api/customers`, `GET, PUT /api/customers/:id` | Customers with their ledgers. `/api/credit` is the same router |
| `POST /api/customers/:id/pay-debt` | Record a debt payment |
| `POST /api/customers/:id/add-credit` | Add credit outside a sale |
| `POST /api/customers/:id/send-sms` | Send a payment reminder. An optional `body` replaces the shop's template |
| `GET /api/customers/sms-log` | Sent reminders |
| `GET, POST /api/notifications` | Alerts |
| `PUT /api/notifications/:id/read`, `PUT /api/notifications/read-all`, `DELETE /api/notifications/:id` | Read state and removal |
| `GET, POST /api/transactions` | Cash record. `POST` adds an operational expense |
| `GET /api/payments` | Payment history |
| `POST /api/webhooks/payments/:gateway` | Gateway callback: `bkash`, `nagad`, `rocket`, `upay`, `bangla-qr`, `card` |

### Example requests

```jsonc
// POST /api/sales. Prices come from the database; a partial payment needs a customer.
{
  "items": [{ "productId": "...", "quantity": 2 }],
  "customerId": "...",                                  // or "newCustomer": { "name": "...", "phone": "..." }
  "discount": 50,
  "paidAmount": 500,                                    // defaults to the full total
  "paymentMethod": "BKASH",
  "dueDate": "2026-12-01"                               // defaults to 7 days from now
}

// POST /api/purchases
{
  "supplierId": "...",                                  // or "supplierName" to find or create one
  "items": [{ "productId": "...", "quantity": 10, "unitCost": 500 }],
  "paidAmount": 1000,
  "date": "2026-11-01"                                  // optional
}
```

### Payment webhooks

The body format is a common one for this project. Real gateways each have their own format and signing scheme, so each needs an adapter before going live.

Set `PAYMENT_WEBHOOK_SECRET` in `.env`, then send the HMAC-SHA256 of the raw request body, in hex, as `X-Dokan-Signature`:

```json
{ "transactionId": "TXN-1", "status": "SUCCESS", "amount": 500, "customerId": "..." }
```

`status` is `SUCCESS`, `FAILED` or `CANCELLED`. Repeated deliveries of a successful transaction change nothing. If a customer pays more than they owe, the full amount is recorded and only the owed part is applied.

## How the money is calculated

```
Total Revenue    = sum of all sales' totalAmount
Total Expense    = sum of all purchases' totalAmount + operational expenses
Net Profit       = Total Revenue - Total Expense
Business Capital = Configured Capital + Net Profit
```

- **Debt payments do not add to revenue.** Revenue already counted the full sale when it was made. They appear in `debtCollected` and in the cash record instead.
- **Supplier payments do not add to expense.** The purchase's full total already counted. They are logged as `EXPENSE` transactions in the category `Supplier Payment`, which the expense sum skips.
- **Capital counts each expense once.** Net Profit already subtracts expenses, so a ৳ 1,000 purchase lowers capital by ৳ 1,000. This replaces the original brief's formula, which subtracted them a second time.

## Additions to the brief's data model

The nine entities keep their exact column names. These additions are required for the brief's features to work, and each is marked `Added:` in `prisma/schema.prisma`:

| Addition | Why |
|---|---|
| `Supplier` | `Product.supplierId` and `Purchase.supplierId` need a table to point at |
| `PurchaseItem` | A purchase must know which products' stock to increase |
| `Setting` | Storage for `/api/settings` |
| `CreditEntry` | The SRS "Credit Records" entity and the Credit page's ledger |
| `Payment` | SRS FR-15 payment history and webhook idempotency |
| `SmsMessage` | The Credit page's list of sent reminders |
| `Sequence` | Invoice and purchase order numbers that are safe under concurrent requests |
| `accountId` on business tables | Keeps each shop's and branch's data separate |
| `User` to `Account` link | Decides which branches a user may access |
| `Customer.dueDate` | Overdue status and reminders need it |
| `Product.deletedAt` | Deleted products stay on past invoices |
| `Sale.discount` | The POS applies discounts and prints them on the invoice |
| `Notification.entityId`, `link` | Alerts clear themselves and link to their screen |
| `CREDIT` payment method, `PAYMENT_RECEIVED` notification type | Sales with nothing paid yet, and the design's Notifications screen |

## Connecting the frontend

The frontend calls this API through `src/lib/api.js`, and `src/lib/adapters.js` translates the API's field names into the ones its pages use. CORS allows `http://localhost:5173` by default; change `CORS_ORIGIN` if the frontend runs elsewhere.

## What is simulated or not included

- **Google sign-in** is not connected to Google. See [Quick start for testing](#quick-start-for-testing).
- **SMS** sends nothing by default. Set `SMS_MODE=live` and the Twilio values to send real messages. Live mode has not been tested against Twilio.
- **Payment gateways** are not connected. See [Payment webhooks](#payment-webhooks).
- **Two-factor authentication** is a stored setting only. Login does not ask for a second factor.
- **Scheduled reminders:** reminders are sent on request. Nothing sends them automatically on a schedule yet.
- **Managers:** the seed creates one, but there is no endpoint for adding managers to a shop yet.
- **Investments** (SRS FR-10) and **analytics** (FR-14) are not in this version.
- **Gateway keys** are masked in API responses but stored unencrypted in the database.
