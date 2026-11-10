# Dokan - Smart Shop Management (Frontend)

Frontend for the Dokan academic project (Web Programming Lab + Project). It covers the workflow in SRS section 7: sales reduce stock, purchases increase stock, credit sales create dues, and payments update balances. All data is mock data held in the browser, so no backend is needed yet.

**Stack:** React 18, Vite, Tailwind CSS 3, Lucide React, Chart.js with react-chartjs-2, React Router.

## Run it

You need [Node.js](https://nodejs.org) 18 or newer (the LTS version is a good choice).

```bash
npm install
npm run dev
```

The app opens at http://localhost:5173.

**Admin demo login:** `admin@gmail.com` / `admin123`. The login page has a link that fills these in.

Other commands: `npm run build` creates a production build in `dist/`, and `npm run preview` serves that build.

## Pages

| Route | What it does | SRS |
|---|---|---|
| `/login` | Sign in, simulated Google sign-in, forgot password, create account | FR-01 |
| `/dashboard` | Metrics, revenue and expenses chart, profit and loss, stock status, top products, recent transactions, smart alerts | FR-09, FR-13 |
| `/inventory` | Search and filters, add, edit and delete products, CSV import and export, low-stock status, reorder | FR-02, FR-03 |
| `/sales` | Point of sale, printable invoices, daily, weekly and monthly reports | FR-04, FR-05 |
| `/purchases` | Purchase orders, add purchase, supplier payments and dues | FR-06 |
| `/credit` | Customer balances, partial and full payments, simulated Twilio SMS reminders | FR-07, FR-08 |
| `/notifications` | Categorised alerts with read and unread status | FR-12 |
| `/settings` | Shop information, SMS settings, low-stock threshold, 2FA, payment methods, password | FR-01, FR-11 |

## Project structure

```
src/
  main.jsx, App.jsx      Entry point and routes
  index.css              Glass surfaces, form and table styles
  data/mockData.js       All sample data
  context/               Auth, app data store (reducer) and toasts
  lib/                   Formatting, CSV and Chart.js setup
  components/ui/         Buttons, forms, modals, badges, metric cards
  components/layout/     Sidebar, top bar, page shell, background
  components/charts/     Revenue, sales report and sparkline charts
  components/dashboard/  Dashboard widgets
  pages/                 One file per route
```

## What is simulated

- **Login and passwords** are stored in the browser in plain text. This is for demonstration only. Replace `src/context/AuthContext.jsx` with calls to the JWT or Better Auth backend.
- **SMS** does not send anything. The Credit Records page imitates Twilio's queued, sent and delivered states.
- **Google sign-in, password reset emails, 2FA and payment gateway tests** are also simulated.
- **Data** is saved in this browser's localStorage. Use Settings > Reset Demo Data to restore the original sample data.

To connect a backend, replace the `dispatch` calls in the pages with API requests. The reducer in `src/context/StoreContext.jsx` shows the business rules each endpoint needs to apply.

## Changing the numbers and colours

- **Total Products counter:** the brief asks for 828, while the sample table lists 8 products. `UNLISTED_PRODUCTS` in `src/data/mockData.js` makes up the difference. Set it to `0` to count only the listed products.
- **Theme:** colours are defined in `tailwind.config.js` under `cosmos`, `frost` and `brand`. The glass surface is `.glass` in `src/index.css`.
