# Ecommerce-All

A full-featured e-commerce web application built with **Node.js**, **Express.js**, **MongoDB**, and **EJS** templating. Supports user authentication, product management, a shopping cart, Stripe payments, PDF invoice generation, and email-based password reset.

---

## Features

- **Authentication** — Signup, login, logout with session-based auth and CSRF protection
- **Password Reset** — Token-based password reset via email (SendGrid)
- **Product Management** — Admins can add, edit, and delete products with image uploads
- **Shopping Cart** — Add/remove products, persistent per-user cart
- **Checkout & Payments** — Stripe Checkout integration for secure payments
- **Orders & Invoices** — View past orders and download PDF invoices
- **Security** — Helmet headers, CSRF tokens, input validation, bcrypt password hashing, compressed responses
- **Logging** — HTTP request logging to `access.log` via Morgan

---

## Tech Stack

| Layer          | Technology                                |
| -------------- | ----------------------------------------- |
| Runtime        | Node.js                                   |
| Framework      | Express.js                                |
| Database       | MongoDB (Mongoose ODM)                    |
| Templating     | EJS                                       |
| Auth           | express-session + connect-mongodb-session |
| Payments       | Stripe                                    |
| File Uploads   | Multer                                    |
| Email          | Nodemailer + SendGrid                     |
| PDF Generation | PDFKit                                    |
| Validation     | express-validator                         |
| Security       | Helmet, csurf, bcryptjs                   |

---

## Project Structure

```
├── app.js                  # Entry point
├── controllers/
│   ├── admin.js            # Product CRUD (admin)
│   ├── auth.js             # Signup, login, password reset
│   ├── shop.js             # Products, cart, checkout, orders
│   └── error.js            # 404/500 handlers
├── models/
│   ├── user.js
│   ├── product.js
│   └── order.js
├── routes/
│   ├── admin.js
│   ├── auth.js
│   └── shop.js
├── middleware/
│   └── is-auth.js          # Auth guard middleware
├── views/                  # EJS templates
│   ├── admin/
│   ├── auth/
│   ├── shop/
│   └── includes/
├── public/                 # Static CSS & JS
├── util/
│   ├── file.js             # File deletion helper
│   └── path.js
└── images/                 # Uploaded product images (gitignored)
```

---

## Getting Started

### Prerequisites

- Node.js v18+
- A [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster
- A [Stripe](https://stripe.com) account (test keys)
- A [SendGrid](https://sendgrid.com) account and API key

### Installation

```bash
git clone https://github.com/dhirendrapratapsingh/Ecommerce-all.git
cd Ecommerce-all
npm install
```

### Environment Variables

Create a `.env` file in the root (never commit this):

```env
MONGO_USER=your_mongo_username
MONGO_PASSWORD=your_mongo_password
MONGO_DEFAULT_DATABASE=shop
STRIPE_KEY=sk_test_your_stripe_secret_key
SENDGRID_API_KEY=SG.your_sendgrid_api_key
```

### SSL Certificates (local dev only)

Generate self-signed certificates for local HTTPS:

```bash
openssl req -nodes -new -x509 -keyout server.key -out server.cert
```

### Run Locally

```bash
# Development (nodemon)
npm start

# Production
npm run start-server
```

Visit `https://localhost:3000` in your browser.

---

## Deployment (Render)

1. Push this repo to GitHub
2. Create a new **Web Service** on [Render](https://render.com)
3. Connect your GitHub repository
4. Set the following:
   - **Build Command:** `npm install`
   - **Start Command:** `node app.js`
5. Add all environment variables from `.env` in the Render dashboard under **Environment**

> **Note:** Render provides HTTPS automatically in production, so the `server.key`/`server.cert` files are only needed locally.

---

## Routes Overview

### Shop (public)

| Method | Path            | Description         |
| ------ | --------------- | ------------------- |
| GET    | `/`             | Home / product list |
| GET    | `/products`     | All products        |
| GET    | `/products/:id` | Product detail      |

### Shop (authenticated)

| Method | Path                | Description          |
| ------ | ------------------- | -------------------- |
| GET    | `/cart`             | View cart            |
| POST   | `/cart`             | Add to cart          |
| POST   | `/cart-delete-item` | Remove from cart     |
| GET    | `/checkout`         | Stripe checkout      |
| GET    | `/orders`           | Order history        |
| GET    | `/orders/:id`       | Download PDF invoice |

### Admin (authenticated)

| Method | Path                      | Description       |
| ------ | ------------------------- | ----------------- |
| GET    | `/admin/add-product`      | Add product form  |
| POST   | `/admin/add-product`      | Create product    |
| GET    | `/admin/edit-product/:id` | Edit product form |
| POST   | `/admin/edit-product`     | Update product    |
| DELETE | `/admin/product/:id`      | Delete product    |

### Auth

| Method   | Path            | Description            |
| -------- | --------------- | ---------------------- |
| GET/POST | `/login`        | Login                  |
| GET/POST | `/signup`       | Signup                 |
| POST     | `/logout`       | Logout                 |
| GET/POST | `/reset`        | Request password reset |
| GET/POST | `/reset/:token` | Set new password       |
