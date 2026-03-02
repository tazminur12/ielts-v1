# IELTS Platform - Professional Backend Documentation

## 📋 Overview

এই প্রজেক্টে একটি Professional Subscription-Based IELTS Preparation Platform তৈরি করা হয়েছে যেখানে:

- ✅ **Dynamic Pricing Plans** - Admin panel থেকে plans manage করা যায়
- ✅ **Subscription Management** - User-specific subscriptions with usage tracking
- ✅ **Access Control** - Feature-based access control system
- ✅ **Payment Integration Ready** - Multiple payment methods support (bKash, Nagad, Rocket, Card)
- ✅ **Usage Tracking** - Mock tests, speaking evaluations, writing corrections tracking

## 🗂️ Project Structure

```
src/
├── models/
│   ├── User.ts                    # User model with subscription reference
│   ├── Plan.ts                    # Pricing plans model
│   └── Subscription.ts            # User subscriptions model
├── lib/
│   ├── mongodb.ts                 # Database connection
│   └── accessControl.ts           # Access control utilities
├── app/
│   ├── api/
│   │   ├── plans/                 # Plans CRUD API
│   │   │   ├── route.ts
│   │   │   └── [slug]/route.ts
│   │   └── subscriptions/         # Subscription management API
│   │       └── route.ts
│   └── (main)/
│       ├── pricing/               # Dynamic pricing page
│       │   └── page.tsx
│       └── checkout/              # Payment checkout page
│           └── page.tsx
├── middleware.ts                  # Route protection middleware
└── scripts/
    └── seedPlans.mjs              # Default plans seeder
```

## 🚀 Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

`.env.local` file এ MongoDB URI add করুন:

```env
MONGODB_URI=mongodb://localhost:27017/ielts
NEXTAUTH_SECRET=your-secret-key-here
```

### 3. Seed Default Plans

```bash
node scripts/seedPlans.mjs
```

এটি 3টি default plan তৈরি করবে:
- **Free Trial** (1 mock test, no signup)
- **Pro Achiever** ($29/mo or $19/mo yearly)
- **Ultimate** ($59/mo or $49/mo yearly)

### 4. Run Development Server

```bash
npm run dev
```

## 📊 Database Models

### Plan Model

```typescript
{
  name: string;                    // Plan name
  slug: string;                    // URL-friendly identifier
  description: string;             // Plan description
  price: {
    monthly: number;
    yearly: number;
  };
  features: {
    mockTests: number | "unlimited";
    speakingEvaluations: number | "unlimited";
    writingCorrections: number | "unlimited";
    hasAnalytics: boolean;
    hasPersonalizedPlan: boolean;
    hasPrioritySupport: boolean;
    has1on1Coaching: boolean;
    customFeatures?: string[];     // Additional features
  };
  isActive: boolean;               // Show/hide plan
  isPremium: boolean;              // Highlight as popular
  displayOrder: number;            // Sort order
  trialDays: number;               // Free trial days
}
```

### Subscription Model

```typescript
{
  userId: ObjectId;                // Reference to User
  planId: ObjectId;                // Reference to Plan
  status: "active" | "cancelled" | "expired" | "trial";
  startDate: Date;
  endDate: Date;
  autoRenew: boolean;
  paymentMethod: "card" | "bkash" | "nagad" | "rocket" | "bank_transfer";
  transactionId: string;
  features: {
    mockTests: number | "unlimited";
    mockTestsUsed: number;         // Usage counter
    speakingEvaluations: number | "unlimited";
    speakingEvaluationsUsed: number;
    writingCorrections: number | "unlimited";
    writingCorrectionsUsed: number;
    hasAnalytics: boolean;
    hasPersonalizedPlan: boolean;
    hasPrioritySupport: boolean;
    has1on1Coaching: boolean;
  };
}
```

## 🔐 Access Control System

### Usage Example

```typescript
import { checkUserAccess, useFeature } from "@/lib/accessControl";

// Check user's access
const access = await checkUserAccess(userId);

if (access?.features.canTakeMockTest) {
  // Allow mock test
  // After user completes test:
  await useFeature(userId, "mockTest");
}

// Check remaining resources
console.log(access?.features.remainingMockTests); // "unlimited" or number
```

### Protected Route Example

```typescript
// In your exam page
import { getUserAccessFromSession, requireAccess } from "@/lib/accessControl";

export default async function ExamPage() {
  const access = await getUserAccessFromSession();
  
  try {
    requireAccess(access);
  } catch (error) {
    redirect("/pricing");
  }

  if (!access.features.canTakeMockTest) {
    return <UpgradePrompt />;
  }

  return <ExamComponent />;
}
```

## 🛒 API Endpoints

### Plans API

```bash
# Get all active plans
GET /api/plans

# Get single plan
GET /api/plans/:slug

# Create plan (admin only)
POST /api/plans
Body: { name, slug, description, price, features, ... }

# Update plan (admin only)
PUT /api/plans/:slug
Body: { ...updates }

# Delete plan (admin only)
DELETE /api/plans/:slug
```

### Subscriptions API

```bash
# Get user's subscription
GET /api/subscriptions

# Create subscription (subscribe to plan)
POST /api/subscriptions
Body: {
  planSlug: string,
  billingCycle: "monthly" | "yearly",
  paymentMethod: string,
  transactionId: string
}

# Update subscription (cancel/renew)
PUT /api/subscriptions
Body: { action: "cancel" | "renew" }
```

## 💳 Payment Integration

Checkout page এ multiple payment methods আছে:

1. **Credit/Debit Card** - Stripe/Paddle integration এর জন্য ready
2. **bKash** - Bangladesh mobile payment
3. **Nagad** - Bangladesh mobile payment
4. **Rocket** - Bangladesh mobile payment

### Payment Flow

1. User selects a plan → Redirects to `/checkout?plan=slug&billing=monthly`
2. User selects payment method
3. Payment processed (currently simulated)
4. Subscription created via `/api/subscriptions`
5. User redirected to dashboard with access

## 🎯 Features by Plan

| Feature | Free Trial | Pro Achiever | Ultimate |
|---------|-----------|--------------|----------|
| Mock Tests | 1 | Unlimited | Unlimited |
| Speaking Evaluations | 1 | 10/month | Unlimited |
| Writing Corrections | 1 | 10/month | Unlimited |
| Analytics | ❌ | ✅ | ✅ |
| Personalized Plan | ❌ | ❌ | ✅ |
| Priority Support | ❌ | ✅ | ✅ |
| 1-on-1 Coaching | ❌ | ❌ | ✅ |

## 📱 Frontend Components

### Pricing Page (`/pricing`)

- Dynamic plans loading from API
- Monthly/Yearly toggle with discount
- Feature comparison table
- FAQ section
- Responsive design

### Checkout Page (`/checkout`)

- Order summary
- Payment method selection
- Loading states
- Success/Error handling with SweetAlert2

## 🔧 Admin Features

Admins can:

1. **Create new plans** via `/api/plans`
2. **Edit existing plans** - change prices, features, availability
3. **View all users' subscriptions** via `/dashboard/admin`
4. **Track usage** - see how many mock tests/evaluations users have consumed

## 📈 Usage Tracking

যখন user একটি feature ব্যবহার করে:

```typescript
// Increment usage count
await useFeature(userId, "mockTest");
await useFeature(userId, "speakingEvaluation");
await useFeature(userId, "writingCorrection");
```

এটি automatically check করে:
- User এর কাছে কি limit আছে?
- Limit exceed করছে কিনা?
- Usage counter increment করে

## 🚦 Route Protection

`middleware.ts` automatically protects routes:

- **Public**: `/`, `/pricing`, `/about`, `/login`, `/signup`
- **Free Trial**: `/exam` (1 test without login)
- **Protected**: `/dashboard`, `/exam/results`, `/start-mock` (requires login)
- **Admin Only**: `/dashboard/admin/*` (requires admin role)

## 🎨 Customization

### Add New Payment Method

1. Update `Subscription` model enum
2. Add button in `checkout/page.tsx`
3. Implement payment gateway logic in `handleCheckout`

### Add New Feature

1. Update `Plan` model features
2. Update `Subscription` model features
3. Add access check in `accessControl.ts`
4. Update UI to show feature

### Change Plan Pricing

```bash
# Via API
PUT /api/plans/pro-achiever
{
  "price": {
    "monthly": 39,
    "yearly": 29
  }
}

# Or edit directly in MongoDB
```

## 🐛 Troubleshooting

### Plans not showing?

```bash
# Re-run seed script
node scripts/seedPlans.mjs
```

### User can't access features?

Check:
1. User has active subscription? (`status: "active" or "trial"`)
2. Subscription not expired? (`endDate > now`)
3. Usage limits not exceeded?

### TypeScript errors?

```bash
# Rebuild types
npm run build
```

## 📞 Support

For questions or issues:
- Check MongoDB connection
- Verify environment variables
- Check console for API errors
- Use SweetAlert2 for user-friendly error messages

## 🎉 Success!

You now have a fully functional subscription-based IELTS platform with:
- Dynamic pricing
- Access control
- Payment integration
- Usage tracking
- Admin management

Good luck with your IELTS platform! 🚀
