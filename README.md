# Fieldnote

Fieldnote is a full-stack MERN e-commerce application for discovering, saving, purchasing, and managing considered everyday goods. It includes a React storefront, a MongoDB-backed Express API, JWT authentication with HTTP-only cookies, persistent carts and wishlists, transactional COD orders, verified-purchaser reviews, and a protected admin workspace.

The project is designed around real application data. Product inventory, customer counts, order totals, revenue, reviews, and dashboard values are read from MongoDB. The catalog seed creates products only; it does not fabricate customer activity, reviews, ratings, popularity, sales, or revenue.

## Contents

- [Features](#features)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation and Setup](#installation-and-setup)
- [Running the Application](#running-the-application)
- [Database Design](#database-design)
- [API Reference](#api-reference)
- [Business Logic](#business-logic)
- [Security](#security)
- [Testing](#testing)
- [Screenshots](#screenshots)
- [Limitations and Future Improvements](#limitations-and-future-improvements)
- [License](#license)

## Features

### Customer Features

- Customer registration, login, logout, and cookie-backed sessions
- Product browsing with search, category, price, rating, and popularity filters
- Product sorting by price, rating, popularity, and newest products
- Server-side product pagination
- Product detail pages with stock, price, category, and persisted reviews
- MongoDB-backed shopping cart with quantity changes and removal
- MongoDB-backed wishlist with duplicate prevention
- Cash-on-delivery checkout
- Server-calculated order totals using current product prices
- Order confirmation and customer order history
- Customer cancellation for eligible processing orders
- Exactly-once inventory restoration after cancellation
- Reviews limited to verified purchasers of delivered orders
- Duplicate-review prevention and persisted rating aggregates
- Profile and shipping address management
- Loading, error, empty, unavailable, and out-of-stock states
- Privacy Policy and Terms and Conditions pages

### Admin Features

- Protected admin dashboard with real MongoDB statistics
- Active product count, customer count, order count, and delivered-order revenue
- Recent orders and low-stock product views
- Review moderation with transactional rating recalculation
- Paginated product management
- Product creation and editing
- Product image URL management
- Price, description, stock, configurable low-stock threshold, category, and active/archive management
- Category creation, editing, pagination, and safe deletion checks
- Paginated order management with search and status filters
- Order detail views with shipping and COD payment status
- Separate COD payment updates with an explicit Mark as Paid action
- Valid order-status transitions
- Inventory-safe order cancellation
- Paginated customer management
- Customer details and order history
- Server-side role-based authorization
- Password hashes excluded from customer-facing admin responses

## Technology Stack

| Area              | Technologies                                |
| ----------------- | ------------------------------------------- |
| Database          | MongoDB 9.0, Mongoose 8                     |
| Backend           | Node.js, Express 5                          |
| Frontend          | React 19, Vite 8                            |
| Routing           | React Router DOM 7                          |
| State             | React Context API                           |
| HTTP              | Axios with `withCredentials`                |
| Authentication    | JSON Web Tokens, HTTP-only cookies          |
| Password security | bcryptjs                                    |
| HTTP security     | Helmet, CORS, cookie-parser                 |
| Icons             | Lucide React                                |
| Testing           | Node test runner, Supertest                 |
| Styling           | CSS with responsive Fieldnote design tokens |

## Project Structure

```text
Fieldnote/
├── .env.example
├── .gitignore
├── README.md
├── package.json
├── package-lock.json
├── client/
│   ├── .env.example
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   ├── public/
│   │   └── favicon.svg
│   └── src/
│       ├── api.js
│       ├── App.jsx
│       ├── App.css
│       ├── admin-pages.jsx
│       ├── index.css
│       ├── main.jsx
│       ├── pages.jsx
│       ├── assets/
│       ├── components/
│       │   ├── Layout.jsx
│       │   ├── ProductCard.jsx
│       │   └── States.jsx
│       ├── contexts/
│       │   ├── AuthContext.jsx
│       │   ├── CartContext.jsx
│       │   ├── WishlistContext.jsx
│       │   └── contextObjects.js
│       └── hooks/
│           ├── useAuth.js
│           ├── useCart.js
│           └── useWishlist.js
└── server/
    ├── .env.example
    ├── package.json
    ├── package-lock.json
    ├── src/
    │   ├── app.js
    │   ├── server.js
    │   ├── config/
    │   │   ├── db.js
    │   │   └── env.js
    │   ├── middleware/
    │   │   ├── auth.js
    │   │   ├── error.js
    │   │   └── validate.js
    │   ├── models/
    │   │   ├── Cart.js
    │   │   ├── Category.js
    │   │   ├── Order.js
    │   │   ├── Product.js
    │   │   ├── Review.js
    │   │   ├── User.js
    │   │   └── Wishlist.js
    │   ├── routes/
    │   │   ├── admin.js
    │   │   ├── auth.js
    │   │   ├── cart.js
    │   │   ├── categories.js
    │   │   ├── orders.js
    │   │   ├── products.js
    │   │   ├── reviews.js
    │   │   └── wishlist.js
    │   ├── seed/
    │   │   ├── admin.js
    │   │   └── catalog.js
    │   ├── services/
    │   │   └── orderService.js
    │   └── utils/
    │       ├── sanitize.js
    │       └── slug.js
    └── tests/
        ├── admin.test.js
        ├── api.test.js
        ├── orders.test.js
        └── setup.js
```

## Prerequisites

- Windows 10 or Windows 11
- Node.js 20 or newer
- npm 10 or newer
- MongoDB Community Server 9.0 or a compatible MongoDB 7+ installation
- `mongosh`
- A local MongoDB replica set named `rs0`

Check installed tools in PowerShell:

```powershell
node --version
npm --version
mongod --version
mongosh --version
```

### Installing Node.js on Windows

Install the current LTS release from [nodejs.org](https://nodejs.org/), then open a new PowerShell window and verify `node --version` and `npm --version`.

### Installing MongoDB 9.0 on Windows

Install MongoDB Community Server 9.0 using the official Windows installer. Include `mongosh` if the installer offers that option. The MongoDB executable directory is commonly similar to:

```text
C:\Program Files\MongoDB\Server\9.0\bin
```

Add that directory to `PATH` if `mongod` or `mongosh` is not recognized.

## Installation and Setup

Run these commands from the repository root:

```powershell
npm run install:all
Copy-Item server\.env.example server\.env
Copy-Item client\.env.example client\.env
```

Do not commit either `.env` file. They are excluded by `.gitignore`.

### Configure `server/.env`

Start with `server/.env.example` and replace only the placeholder values:

```dotenv
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:5173
MONGODB_URI=mongodb://127.0.0.1:27017/fieldnote?replicaSet=rs0
JWT_SECRET=replace-with-a-long-random-development-secret
COOKIE_DOMAIN=
COOKIE_SECURE=false
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=replace-with-a-long-development-password
```

Use a random secret of at least 32 characters for local development. Production requires a secret of at least 64 characters, an HTTPS `CLIENT_URL`, and a configured `MONGODB_URI`. Never place real secrets in `.env.example`, source files, README files, screenshots, or commits.

`ADMIN_EMAIL` and `ADMIN_PASSWORD` are consumed only by the secure admin seed script. Public registration cannot create an administrator.

### Configure `client/.env`

The client has one public configuration value:

```dotenv
VITE_API_URL=http://localhost:5000/api
```

Vite variables are bundled into browser code. Do not put private credentials, JWT secrets, MongoDB URIs, admin passwords, or payment provider keys in `client/.env`.

### Configure MongoDB as a replica set

The order service uses MongoDB transactions, so local MongoDB must run as a replica set.

Create a database directory once:

```powershell
New-Item -ItemType Directory -Force C:\data\db
```

Start MongoDB in a PowerShell window:

```powershell
mongod --dbpath C:\data\db --replSet rs0 --port 27017
```

In a second PowerShell window, initialize the replica set once:

```powershell
mongosh --port 27017 --eval "rs.initiate()"
```

Confirm that the node is primary:

```powershell
mongosh --port 27017 --eval "rs.status().myState"
```

A result of `1` means the node is primary. Keep the `mongod` window running while using the application.

### Create the admin account

After MongoDB is running and `server/.env` contains local development values:

```powershell
Set-Location server
npm run seed:admin
Set-Location ..
```

The script hashes the environment-provided password with bcrypt and creates or updates one administrator record. It does not print the password.

### Seed the catalog

```powershell
Set-Location server
npm run seed:catalog
Set-Location ..
```

The catalog seed is idempotent and creates or updates 3 categories and 21 products with realistic prices, stock quantities, descriptions, and stable Unsplash image URLs. It creates no customer reviews or fabricated metrics and does not delete unrelated records.

## Running the Application

### Start both services

From the repository root:

```powershell
npm run dev
```

The root script runs the verified package scripts concurrently:

- `npm run dev:server` runs `npm --prefix server run dev`
- `npm run dev:client` runs `npm --prefix client run dev`

Vite uses port 5173 by default and selects the next available port if 5173 is occupied. The API uses port 5000 unless `PORT` is changed.

Expected local URLs:

```text
Frontend: http://localhost:5173
Backend:  http://localhost:5000
```

If Vite reports another port, use the URL printed in the terminal.

### Start services separately

Backend:

```powershell
Set-Location server
npm run dev
```

Frontend, in a second PowerShell window:

```powershell
Set-Location client
npm run dev
```

Production-like backend start:

```powershell
Set-Location server
npm start
```

### Health checks

```powershell
Invoke-WebRequest -UseBasicParsing http://localhost:5000/api/health/ping
Invoke-WebRequest -UseBasicParsing http://localhost:5000/api/health
```

`/api/health/ping` verifies the HTTP process. `/api/health` reports MongoDB status and returns HTTP 503 when the database is unavailable.

## Database Design

| Model      | Purpose and important fields                                                                                                                                                       |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `User`     | Customer or administrator account. Includes `name`, unique `email`, bcrypt password hash, `role`, shipping `address`, and timestamps. Passwords are excluded by default.           |
| `Category` | Product grouping with unique `name` and `slug`, description, and `isActive` state.                                                                                                 |
| `Product`  | Catalog item with name, description, price, category reference, image URL, stock, rating aggregate, review count, popularity, and active/archive state.                            |
| `Cart`     | One persistent cart per user. Contains product references and integer quantities.                                                                                                  |
| `Wishlist` | One persistent wishlist per user. Contains product references and uses set semantics to prevent duplicates.                                                                        |
| `Order`    | Immutable product and price snapshots, user reference, total, shipping address snapshot, COD payment fields, order status, cancellation details, and inventory restoration marker. |
| `Review`   | User, product, and order references with integer rating and comment. A unique user/product index prevents duplicate reviews.                                                       |

Relationships:

- A `User` owns one `Cart`, one `Wishlist`, and many `Order` and `Review` records.
- A `Category` is referenced by many `Product` records.
- A `Product` can appear in carts, wishlists, order snapshots, and reviews.
- An `Order` stores product references plus name, price, and quantity snapshots so later catalog changes do not rewrite order history.
- A `Review` references the delivered order used to verify the purchase.

## API Reference

All paths below are prefixed with `/api`. Protected routes require the HTTP-only `fieldnote_token` cookie. Admin routes require both authentication and the `admin` role.

### Authentication

| Method  | Endpoint         | Auth           | Purpose                                                                                                                     |
| ------- | ---------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `POST`  | `/auth/register` | Public         | Create a customer account and issue a cookie. The requested role is ignored; public registration always creates `customer`. |
| `POST`  | `/auth/login`    | Public         | Authenticate with email and password and issue a cookie.                                                                    |
| `POST`  | `/auth/logout`   | Public         | Clear the authentication cookie.                                                                                            |
| `GET`   | `/auth/me`       | Customer/admin | Return the current public user record.                                                                                      |
| `PATCH` | `/auth/me`       | Customer/admin | Update the current name and shipping address.                                                                               |

Registration example:

```json
{
  "name": "Avery Stone",
  "email": "avery@example.com",
  "password": "a-password-at-least-8-characters"
}
```

### Categories

| Method   | Endpoint                            | Auth   | Purpose                                                                         |
| -------- | ----------------------------------- | ------ | ------------------------------------------------------------------------------- |
| `GET`    | `/categories`                       | Public | List active categories.                                                         |
| `GET`    | `/categories/admin?page=1&limit=12` | Admin  | Paginated category management list.                                             |
| `POST`   | `/categories`                       | Admin  | Create a category with `name` and optional `description`.                       |
| `PATCH`  | `/categories/:id`                   | Admin  | Update `name`, `description`, or `isActive`.                                    |
| `DELETE` | `/categories/:id`                   | Admin  | Delete an unused category. Categories referenced by products return a conflict. |

Create example:

```json
{
  "name": "Travel Goods",
  "description": "Reliable objects for time away from home."
}
```

### Products

| Method   | Endpoint        | Auth   | Purpose                                                    |
| -------- | --------------- | ------ | ---------------------------------------------------------- |
| `GET`    | `/products`     | Public | Search, filter, sort, and paginate active products.        |
| `GET`    | `/products/:id` | Public | Return one active product with its category.               |
| `POST`   | `/products`     | Admin  | Create a product.                                          |
| `PATCH`  | `/products/:id` | Admin  | Update catalog fields, image URL, stock, or archive state. |
| `DELETE` | `/products/:id` | Admin  | Delete a product record.                                   |

Supported `GET /products` query parameters:

```text
search       Text search across product name and description
category     Category ObjectId
minPrice     Non-negative minimum price
maxPrice     Non-negative maximum price
minRating    Rating threshold from 0 to 5
sort         priceAsc, priceDesc, rating, popularity, newest
page         Positive page number
limit        Integer from 1 to 100
```

Product create example:

```json
{
  "name": "Canvas Tool Roll",
  "description": "A durable roll for carrying small everyday tools.",
  "price": 48,
  "category": "CATEGORY_OBJECT_ID",
  "image": "https://images.example.com/tool-roll.jpg",
  "stock": 12
}
```

### Cart

All cart endpoints require authentication.

| Method   | Endpoint                 | Purpose                                                                         |
| -------- | ------------------------ | ------------------------------------------------------------------------------- |
| `GET`    | `/cart`                  | Return the authenticated user's persistent cart.                                |
| `PUT`    | `/cart/items/:productId` | Set a quantity from 1 to 99 after checking current product existence and stock. |
| `DELETE` | `/cart/items/:productId` | Remove one product from the cart.                                               |
| `DELETE` | `/cart`                  | Clear the authenticated user's cart.                                            |

Set quantity example:

```json
{
  "quantity": 2
}
```

### Wishlist

All wishlist endpoints require authentication.

| Method   | Endpoint               | Purpose                                              |
| -------- | ---------------------- | ---------------------------------------------------- |
| `GET`    | `/wishlist`            | Return the authenticated user's persistent wishlist. |
| `PUT`    | `/wishlist/:productId` | Add a product using duplicate-safe set semantics.    |
| `DELETE` | `/wishlist/:productId` | Remove a product.                                    |

### Orders

All order endpoints require authentication unless stated otherwise.

| Method  | Endpoint             | Auth           | Purpose                                                                    |
| ------- | -------------------- | -------------- | -------------------------------------------------------------------------- |
| `POST`  | `/orders`            | Customer/admin | Place a COD order from the persistent cart.                                |
| `GET`   | `/orders`            | Customer/admin | Return the current user's orders. Admins may request `?all=true`.          |
| `GET`   | `/orders/:id`        | Owner/admin    | Return one order.                                                          |
| `POST`  | `/orders/:id/cancel` | Owner/admin    | Cancel an eligible processing order and restore stock exactly once.        |
| `PATCH` | `/orders/:id/status` | Admin          | Move an order through valid processing, shipped, or delivered transitions. |

Checkout example:

```json
{
  "paymentMethod": "cod",
  "shippingAddress": {
    "line1": "1 Market Street",
    "city": "Portland",
    "state": "Oregon",
    "postalCode": "97201",
    "country": "USA"
  }
}
```

Client-submitted totals and prices are ignored. The server reads current product prices and calculates the order total.

### Reviews

| Method | Endpoint                       | Auth           | Purpose                                                                                         |
| ------ | ------------------------------ | -------------- | ----------------------------------------------------------------------------------------------- |
| `GET`  | `/products/:productId/reviews` | Public         | Return persisted reviews with public reviewer names.                                            |
| `POST` | `/products/:productId/reviews` | Customer/admin | Submit a review only when the authenticated user owns a delivered order containing the product. |

Review example:

```json
{
  "orderId": "ORDER_OBJECT_ID",
  "rating": 5,
  "comment": "The materials and finish held up beautifully."
}
```

### Admin

All admin endpoints require an authenticated user with `role: "admin"`.

| Method   | Endpoint             | Query parameters                                     | Purpose                                                                                           |
| -------- | -------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `GET`    | `/admin/dashboard`   | `lowStock` optional                                  | Return actual product, customer, order, delivered-revenue, recent-order, and low-stock data.      |
| `GET`    | `/admin/products`    | `page`, `limit`, `search`, `category`, `status`      | Paginated product management list. `status` is `active` or `archived`.                            |
| `GET`    | `/admin/orders`      | `page`, `limit`, `search`, `status`, `paymentStatus` | Paginated order management list. Search supports order ID, customer name/email, and product name. |
| `GET`    | `/admin/users`       | `page`, `limit`, `search`                            | Paginated customer list without password fields.                                                  |
| `GET`    | `/admin/users/:id`   | None                                                 | Customer details and order history without password data.                                         |
| `GET`    | `/admin/categories`  | `page`, `limit`                                      | Paginated category management list.                                                               |
| `GET`    | `/admin/reviews`     | `page`, `limit`, `search`                            | Paginated review moderation list.                                                                 |
| `DELETE` | `/admin/reviews/:id` | None                                                 | Delete a review and recalculate the product aggregate transactionally.                            |

COD payment management uses `PATCH /orders/:id/payment` with `{ "paymentStatus": "Paid" }`. Only administrators can mark a COD order as paid. Delivery status does not automatically change payment status.

## Business Logic

### Authentication and authorization

- Passwords are hashed with bcryptjs before storage.
- Login signs a JWT containing the user identifier and sends it in an HTTP-only cookie named `fieldnote_token`.
- Axios is configured with `withCredentials: true` so browser requests include the cookie.
- Cookie settings use `Path=/`, a seven-day expiry, `Secure` in production, and `SameSite=None` in production. Local HTTP development uses `SameSite=Lax`.
- `requireAuth` verifies the token and loads the user from MongoDB.
- `requireRole('admin')` protects administrative API routes on the server.

### Orders and inventory

- Checkout runs inside a MongoDB transaction.
- The service reads the current product price from MongoDB.
- Stock is decremented with an atomic `stock >= quantity` predicate.
- Concurrent checkout attempts cannot oversell the same inventory.
- The order stores product name, current price, quantity, total, payment method, statuses, and a shipping address snapshot.
- Products persist `lowStockThreshold` separately from available `stock`; the dashboard flags products when `stock <= lowStockThreshold`.
- COD orders start with `orderStatus: "Processing"` and `paymentStatus: "Pending"`.
- The persistent cart is cleared in the same transaction after order creation.
- Cancellation is allowed only for processing orders and is also transactional.
- `inventoryRestoredAt` makes restoration exactly once and prevents duplicate stock increases.

### Reviews and ratings

- A review requires a delivered order belonging to the authenticated user and containing the product.
- A unique user/product index prevents duplicate reviews.
- Review creation and aggregate updates run inside a MongoDB transaction.
- Product rating and review count are calculated from persisted review documents.
- Seed data does not contain customer reviews or fabricated ratings.

## Security

- Secrets are environment-driven and excluded from source control.
- Production rejects JWT secrets shorter than 64 characters.
- Production requires an HTTPS `CLIENT_URL` and a configured `MONGODB_URI`.
- Passwords are never returned by public or admin customer APIs.
- JWT cookies are HTTP-only and secure in production.
- CORS allows the explicitly configured `CLIENT_URL` with credentials; wildcard origins are not used.
- Helmet supplies security headers.
- Request bodies, pagination values, product image URLs, prices, quantities, ratings, and identifiers are validated server-side.
- Admin authorization is enforced by backend middleware, not only by frontend route guards.
- Error responses return stable messages and codes without stack traces or filesystem paths.
- Do not commit `server/.env`, `client/.env`, database files, credentials, API keys, or payment secrets.

## Testing

Run the backend integration suite from the server directory:

```powershell
Set-Location server
npm test
```

The latest verified result was:

```text
16 tests passed
0 tests failed
```

The suite covers authentication, authorization, catalog APIs, cart and wishlist persistence, order transactions, concurrent checkout, cancellation, inventory restoration, reviews, rating aggregation, admin APIs, pagination, dashboard data, and password-data exclusion.

Run the frontend checks from the client directory:

```powershell
Set-Location client
npm run lint
npm run build
```

The latest production build passed. Lint completes with non-blocking React hook warnings related to asynchronous data-fetching effects and dependency expressions.

Run the root build and lint wrappers:

```powershell
Set-Location ..
npm run lint
npm run build
```

## Screenshots

Screenshots are not included yet. Add verified captures to these locations without fabricating application states or metrics:

```text
screenshots/
├── homepage.png
├── product-catalog.png
├── product-details.png
├── cart-checkout.png
├── admin-dashboard.png
├── product-management.png
└── order-management.png
```

## Limitations and Future Improvements

### Current limitations

- Checkout supports cash on delivery only.
- Stripe, PayPal, and other external payment integrations are not implemented.
- Deployment and custom-domain hosting configuration are not completed.
- Product images use external Unsplash URLs rather than an application-managed upload service. The UI falls back to the Fieldnote favicon when a remote image fails.
- No email notifications are implemented.
- No coupons, tax engine, shipping-rate engine, or multi-vendor workflows are implemented.
- Frontend lint still reports non-blocking React effect dependency warnings.
- Browser screenshot and automated visual regression coverage are not included in the current test suite.
- The expanded catalog seed has not been run against production. Review it and run it only against the intended database after backup and verification.

### Future improvements

- Add a payment provider with server-side webhook verification.
- Add image upload storage and image validation beyond URL format checks.
- Add email notifications for order creation and status changes.
- Add frontend unit and browser end-to-end tests.
- Refine React data-fetching effects and hook dependency handling.
- Add deployment-specific infrastructure and custom-domain documentation after hosting is selected.

## Screens and Routes

Customer routes:

```text
/                       Homepage
/shop                   Product catalog
/products/:id           Product details and reviews
/login                  Login
/register               Registration
/cart                   Shopping cart
/wishlist               Wishlist
/checkout               COD checkout
/confirmation/:id       Order confirmation
/orders                Customer order history
/profile               Profile and shipping address
/privacy               Privacy Policy
/terms                 Terms and Conditions
```

Admin routes:

```text
/admin                  Dashboard
/admin/products        Product management
/admin/categories      Category management
/admin/orders          Order management
/admin/customers       Customer management
```

## License

No license has been selected or included for this project yet. Add a license file and replace this section with the chosen license terms before public distribution.

## Project Information

- Project name: Fieldnote
- Version: `0.1.0` at the root and server package level
- Database: MongoDB replica set required for transaction-backed order workflows
- Deployment: not started
