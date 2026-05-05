# IELTS Practice Pro

> Professional IELTS preparation platform with comprehensive mock tests, practice materials, and standardized grading.

[![Built with Next.js](https://img.shields.io/badge/Built%20with-Next.js-black)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-enabled-blue)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-v4-06B6D4)](https://tailwindcss.com)
[![License](https://img.shields.io/badge/License-MIT-green)](#license)

## 🎯 Overview

IELTS Practice Pro is a comprehensive online platform designed to help students prepare for the IELTS examination. Our platform offers:

- **500+ Mock Tests** - Authentic exam-style practice tests
- **Standardized Grading** - Fair and consistent evaluation system
- **Unlimited Practice** - Reading, Writing, Listening, and Speaking modules
- **Vocabulary Builder** - Interactive word definitions with pronunciation
- **Progress Tracking** - Detailed analytics and performance monitoring
- **24/7 Access** - Learn at your own pace, anytime, anywhere

## 🎤 Speaking Admin Configuration

The admin dashboard now includes speaking-specific tooling for creating IELTS-compliant questions:

- **Part-wise instruction templates** for Part 1/2/3 groups
- **Speaking question builder** with prompt, duration presets, and marking guide
- **Cue card template builder** for Part 2
- **Speaking section audio reference upload**
- **Client-side speaking parity checks** before publishing

## �� Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- MongoDB database
- Stripe API keys (for payments)

### Installation

1. **Clone the repository:**
```bash
git clone https://github.com/algowavelabs/ielts-v1.git
cd ielts-v1
```

2. **Install dependencies:**
```bash
npm install
# or
yarn install
```

3. **Set up environment variables:**
```bash
cp .env.example .env.local
```

Then configure these variables:
```
# Database
MONGODB_URI=your_mongodb_connection_string

# Authentication
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000

# Stripe
NEXT_PUBLIC_STRIPE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key

# Dictionary API
NEXT_PUBLIC_DICTIONARY_API_URL=https://api.dictionaryapi.dev/api/v2
```

4. **Run the development server:**
```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## 📂 Project Structure

```
src/
├── app/
│   ├── (main)/                 # Main user-facing pages
│   │   ├── page.tsx           # Home page
│   │   ├── about/             # About page
│   │   ├── pricing/           # Pricing and plans
│   │   ├── practice/          # Practice modules
│   │   ├── mock-tests/        # Mock test listings
│   │   ├── vocabulary/        # Word search with definitions
│   │   ├── login/             # User login
│   │   ├── signup/            # User registration
│   │   ├── privacy/           # Privacy policy
│   │   ├── terms/             # Terms of service
│   │   └── cookies/           # Cookie policy
│   ├── api/                    # Backend API routes
│   │   ├── auth/              # Authentication endpoints
│   │   ├── plans/             # Subscription plans
│   │   ├── subscriptions/      # Subscription management
│   │   ├── stripe/            # Payment processing
│   │   └── user/              # User profile endpoints
│   ├── dashboard/              # Student dashboard
│   │   ├── page.tsx           # Main dashboard
│   │   ├── profile/           # User profile management
│   │   ├── orders/            # Purchase history
│   │   ├── progress/          # Progress tracking
│   │   └── admin/             # Admin panel
│   └── exam/                   # Exam/test interface
├── components/
│   ├── dashboard/             # Dashboard components
│   ├── exam/                  # Exam interface components
│   └── Home/                  # Homepage components
├── lib/
│   ├── mongodb.ts            # MongoDB connection
│   └── accessControl.ts      # Authorization utilities
├── models/
│   ├── User.ts               # User schema
│   ├── Plan.ts               # Subscription plan schema
│   └── Subscription.ts       # Subscription schema
└── types/
    └── next-auth.d.ts        # NextAuth type definitions
```

## 🔧 Technology Stack

### Frontend
- **Framework:** Next.js 14+ with App Router
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **Icons:** Lucide React
- **Authentication:** NextAuth.js

### Backend
- **Runtime:** Node.js
- **Database:** MongoDB with Mongoose
- **API:** REST API with Next.js Route Handlers
- **Payment:** Stripe integration

### DevOps
- **Version Control:** Git
- **Deployment:** Vercel (recommended)
- **Package Manager:** npm

## 🎨 Design System

### Color Palette
- **Primary:** Blue (#2563eb)
- **Success:** Emerald (#059669)
- **Warning:** Amber (#d97706)
- **Danger:** Rose (#e11d48)
- **Neutral:** Slate (#0f172a - #f1f5f9)

### Typography
- **Headlines:** Bold, tracking-tight
- **Body:** Regular, leading-relaxed
- **Small:** Regular, uppercase tracking-wider

### Components
All components follow the professional white-theme aesthetic:
- Rounded corners (lg, xl)
- Subtle shadows (shadow-sm, shadow-md)
- Gradient backgrounds (bg-linear-to-r)
- Proper spacing and padding

## 🔐 Authentication & Security

- **Session Management:** NextAuth.js with MongoDB adapter
- **Password Security:** Bcrypt hashing
- **API Protection:** Role-based access control
- **Payment Security:** PCI-DSS compliant via Stripe

## 📱 Responsive Design

The platform is fully responsive across all devices:
- **Mobile:** 320px and up
- **Tablet:** 768px and up
- **Desktop:** 1024px and up
- **Large screens:** 1280px and up

Mobile navbar spacing: `mt-16 sm:mt-20` to prevent content overlap.

## 📝 Pages & Features

### Public Pages
- **Home** (`/`) - Landing page with feature highlights
- **About** (`/about`) - Company story and values
- **Pricing** (`/pricing`) - Plan comparison and billing
- **Practice** (`/practice`) - Practice module selection
- **Mock Tests** (`/mock-tests`) - Test library browser
- **Vocabulary** (`/vocabulary`) - Word search and definitions

### Policy Pages
- **Privacy Policy** (`/privacy`) - Data privacy information
- **Terms of Service** (`/terms`) - Usage terms
- **Cookie Policy** (`/cookies`) - Cookie usage details

### Authentication Pages
- **Login** (`/login`) - User login
- **Signup** (`/signup`) - User registration
- **Forgot Password** (`/forgot-password`) - Password recovery

### Protected Pages (Dashboard)
- **Dashboard** (`/dashboard`) - User home
- **Profile** (`/dashboard/profile`) - Account settings
- **Progress** (`/dashboard/progress`) - Performance analytics
- **Subscriptions** (`/dashboard/orders`) - Purchase history
- **Admin Panel** (`/dashboard/admin`) - Administrative tools

## 🌐 API Documentation

Key API endpoints:

```
# Authentication
POST   /api/auth/[...nextauth]       - NextAuth routes
POST   /api/register                 - User registration
POST   /api/auth/forgot-password     - Request password reset
POST   /api/auth/reset-password      - Reset password

# Plans & Subscriptions
GET    /api/plans                    - List all plans
GET    /api/plans/[slug]            - Get single plan
POST   /api/subscriptions           - Create subscription
GET    /api/subscriptions           - Get user subscriptions

# Stripe
POST   /api/stripe/checkout         - Create checkout session
POST   /api/stripe/webhook          - Stripe webhook handler

# User
GET    /api/user/profile            - Get user profile
PUT    /api/user/profile            - Update user profile

# Admin
GET    /api/admin/users             - List users
GET    /api/admin/subscriptions     - List subscriptions
PUT    /api/admin/users/[id]        - Update user
```

## 🚀 Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Connect repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically

```bash
git push origin main
```

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 📊 Performance

- **Core Web Vitals:** Optimized for LCP, FID, CLS
- **Image Optimization:** Next.js Image component
- **Code Splitting:** Automatic route-based splitting
- **Caching:** Strategic cache headers

## 🤝 Contributing

1. Create a feature branch: `git checkout -b feature/amazing-feature`
2. Commit changes: `git commit -m 'Add amazing feature'`
3. Push to branch: `git push origin feature/amazing-feature`
4. Open a Pull Request

## 📞 Support

For support, email support@ieltspracticepro.com or visit our website.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built by [Algowavelabs](https://algowavelabs.com)
- Icons by [Lucide React](https://lucide.dev)
- Styling with [Tailwind CSS](https://tailwindcss.com)
- Database by [MongoDB](https://www.mongodb.com)

---

**Last Updated:** April 12, 2026  
**Version:** 1.0.0
