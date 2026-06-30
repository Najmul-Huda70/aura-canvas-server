# Aura Canvas – Online Art Marketplace

Aura Canvas is a full-stack digital platform that connects art lovers, collectors, and buyers with talented artists. The platform allows users to browse, discover, and purchase original artworks, while artists can upload and manage their creations, and an admin oversees the entire system.

---

## Live Site

**Live URL:** [https://aura-canvas-client.vercel.app](https://aura-canvas-client.vercel.app)

**Backend (API Gateway):** [https://aura-canvas-server.onrender.com](https://aura-canvas-server.onrender.com)

## GitHub Repository

**Client :** [https://github.com/Najmul-Huda70/aura-canvas-client](https://github.com/Najmul-Huda70/aura-canvas-client)

**Server:** [https://github.com/Najmul-Huda70/aura-canvas-server](https://github.com/Najmul-Huda70/aura-canvas-server)

---

## Key Features

### Authentication & Authorization
- Email/password registration and login with JWT (7-day expiry)
- Google OAuth login via BetterAuth
- Role-based access control: **User (Buyer)**, **Artist**, **Admin**
- Persistent login across page reloads (no false redirects on private routes)

### Public Pages
- Animated hero banner with carousel/slider
- Featured Artworks section (auto-refreshing latest 6 artworks)
- Top Artists section (top 3 by sales)
- Art Categories grid with filter linking
- Browse Artworks page with search, category & price-range filters, sorting, and pagination
- Artwork Details page with high-resolution images, artist info, and purchase/comment actions

### Buyer (User) Dashboard
- Purchase history table
- Gallery of bought artworks
- Profile management
- Subscription tiers: Free (3 purchases), Pro ($9.99 – 9 purchases), Premium ($19.99 – unlimited)
- Comment system on purchased artworks (edit/delete own comments)

### Artist Dashboard
- Full CRUD on own artworks (create, edit, delete) with image upload
- Sales history table (buyer, date, amount)
- Profile management

### Admin Dashboard
- Manage users (role updates)
- Manage all artworks (delete)
- View all platform transactions (purchases + subscriptions)
- Analytics overview cards (total users, artists, artworks sold, revenue)
- Sales chart & category-wise pie chart

### Payments
- Stripe Checkout for artwork purchases
- Stripe Checkout for subscription upgrades (Pro/Premium)
- Subscription-tier-based purchase limit validation
- "Sold" badge with automatic artwork unpublishing after purchase

### UX & Reliability
- Global loading spinner and skeleton loaders
- Custom 404 error page
- Error boundary fallback UI
- Toast notifications for API errors
- Fully responsive design (mobile, tablet, desktop)
- No CORS / 404 / 504 errors on production
- No broken state on page reload from any route

---

## Tech Stack

**Frontend:** Next.js, React, Tailwind CSS
**Backend:** Node.js, Express.js
**Database:** MongoDB (Mongoose)
**Authentication:** JWT, BetterAuth (Google OAuth)
**Payments:** Stripe
**Image Hosting:** imgBB API

---

## NPM Packages Used

### Client (Next.js)
| Package | Purpose |
|---|---|
| `next` | React framework (SSR/routing) |
| `react`, `react-dom` | UI library |
| `better-auth` | Authentication (email/password + Google OAuth) |
| `axios` | HTTP client for API requests |
| `tailwindcss` | Utility-first CSS styling |
| `react-hot-toast` | Toast notifications |
| `recharts` | Charts for admin analytics |
| `swiper` | Hero banner carousel/slider |
| `lucide-react` | Icon library |
| `next-themes` | Dark mode toggle |
| `@stripe/stripe-js` | Stripe Checkout integration (client) |
| `jose` | JWT decoding/verification on client |
| `framer-motion` | UI animations |

### Server (Express.js)
| Package | Purpose |
|---|---|
| `express` | Web server framework |
| `mongodb` | Database driver/ODM |
| `cors` | Cross-origin resource sharing |
| `dotenv` | Environment variable management |
| `jose-cjs` | JWT verification via JWKS |
| `jsonwebtoken` | JWT signing/verification |
| `bcrypt` | Password hashing |
| `stripe` | Stripe payment processing (server) |

---

## Environment Variables

Both client and server require `.env` files for sensitive configuration (MongoDB URI, JWT secrets, Stripe keys, imgBB API key). These are excluded from version control via `.gitignore` and configured separately in the deployment platforms (Vercel for client, Render for server).

---

## Deployment

- **Frontend:** Deployed on [Vercel](https://vercel.com)
- **Backend:** Deployed on [Render](https://render.com)
- **Database:** MongoDB Atlas

## Installation and Setup

### 1. Clone the Repository
```bash
git clone [https://github.com/Najmul-Huda70/aura-canvas-server.git](https://github.com/Najmul-Huda70/aura-canvas-server.git)
cd aura-canvas-server