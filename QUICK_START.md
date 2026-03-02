# 🚀 Quick Start Guide - IELTS Subscription System

## একনজরে যা করা হয়েছে

আপনার IELTS platform এ এখন একটি **Professional Subscription Management System** আছে যেখানে:

✅ **Dynamic Pricing** - Admin panel থেকে pricing plans control করা যায়  
✅ **Access Control** - User যা কিনবে শুধু সেটাই access পাবে  
✅ **Usage Tracking** - Mock tests, evaluations এর usage track হয়  
✅ **Payment Ready** - bKash, Nagad, Rocket, Card support  
✅ **Trial System** - Free trial দেওয়া যায়  

---

## 📦 Install & Setup (3 Steps)

### Step 1: Database Seed করুন

```bash
node scripts/seedPlans.mjs
```

এটি 3টি default plan তৈরি করবে (Free, Pro, Ultimate)

### Step 2: Environment Variables

`.env.local` তে এগুলো আছে কিনা check করুন:

```env
MONGODB_URI=your_mongodb_connection_string
NEXTAUTH_SECRET=your_secret_key
```

### Step 3: Server Run করুন

```bash
npm run dev
```

---

## 🎯 কিভাবে ব্যবহার করবেন

### 1️⃣ Pricing Page দেখুন

```
http://localhost:3000/pricing
```

- Plans automatically load হবে database থেকে
- Monthly/Yearly toggle করা যাবে
- User signup বা login করতে পারবে

### 2️⃣ Exam Page Protect করুন

আপনার exam page এ access control add করুন:

```typescript
// src/app/exam/page.tsx
import { getUserAccessFromSession } from "@/lib/accessControl";

export default async function ExamPage() {
  const access = await getUserAccessFromSession();

  // Check if user has access
  if (!access || !access.hasAccess) {
    return <NoSubscriptionMessage />;
  }

  // Check if can take mock test
  if (!access.features.canTakeMockTest) {
    return <LimitReachedMessage />;
  }

  // Allow exam
  return <YourExamComponent />;
}
```

### 3️⃣ Feature Usage Track করুন

যখন user mock test complete করবে:

```typescript
import { useFeature } from "@/lib/accessControl";

// After exam completion
await useFeature(userId, "mockTest");
```

---

## 🛠️ Admin: New Plan তৈরি করুন

### API দিয়ে:

```bash
POST /api/plans
Content-Type: application/json

{
  "name": "Premium Plus",
  "slug": "premium-plus",
  "description": "Our best plan ever",
  "price": {
    "monthly": 99,
    "yearly": 79
  },
  "features": {
    "mockTests": "unlimited",
    "speakingEvaluations": "unlimited",
    "writingCorrections": "unlimited",
    "hasAnalytics": true,
    "hasPersonalizedPlan": true,
    "hasPrioritySupport": true,
    "has1on1Coaching": true
  },
  "displayOrder": 4,
  "isPremium": true,
  "trialDays": 14
}
```

### MongoDB তে directly:

MongoDB Compass open করে `plans` collection এ new document insert করুন।

---

## 🔍 User Subscription Check করুন

### Frontend এ (Client Component):

```typescript
"use client";
import { useEffect, useState } from "react";

export default function MyComponent() {
  const [subscription, setSubscription] = useState(null);

  useEffect(() => {
    fetch("/api/subscriptions")
      .then(res => res.json())
      .then(data => setSubscription(data.data));
  }, []);

  return (
    <div>
      {subscription ? (
        <p>Active Plan: {subscription.planId.name}</p>
      ) : (
        <p>No active subscription</p>
      )}
    </div>
  );
}
```

### Backend এ (Server Component):

```typescript
import { checkUserAccess } from "@/lib/accessControl";

const access = await checkUserAccess(userId);
console.log(access.features.remainingMockTests); // "unlimited" or number
```

---

## 💳 Payment Integration করুন

`src/app/(main)/checkout/page.tsx` তে `handleCheckout` function এ:

```typescript
const handleCheckout = async (paymentMethod: string) => {
  // 1. Call your payment gateway API
  const paymentResponse = await fetch("YOUR_PAYMENT_GATEWAY_URL", {
    method: "POST",
    body: JSON.stringify({
      amount: totalPrice,
      method: paymentMethod,
      // ... other payment details
    })
  });

  // 2. If payment successful, create subscription
  if (paymentResponse.ok) {
    const response = await fetch("/api/subscriptions", {
      method: "POST",
      body: JSON.stringify({
        planSlug: plan.slug,
        billingCycle,
        paymentMethod,
        transactionId: paymentResponse.transactionId,
      }),
    });
    
    // 3. Redirect to dashboard
    router.push("/dashboard");
  }
};
```

---

## 📊 Common Tasks

### Task 1: Plan এর Price Change করুন

```bash
PUT /api/plans/pro-achiever
{
  "price": {
    "monthly": 39,
    "yearly": 29
  }
}
```

### Task 2: User এর Subscription Cancel করুন

```bash
PUT /api/subscriptions
{
  "action": "cancel"
}
```

### Task 3: Check User এর Remaining Tests

```typescript
const access = await checkUserAccess(userId);
console.log({
  mockTests: access.features.remainingMockTests,
  speaking: access.features.remainingSpeakingEvaluations,
  writing: access.features.remainingWritingCorrections,
});
```

---

## 🎨 UI Customization

### Pricing Card Color Change:

`src/app/(main)/pricing/page.tsx` তে:

```typescript
// Line ~210
className={`${isPopular ? 'border-blue-600' : 'border-slate-200'}`}
// Change blue-600 to your color
```

### Checkout Page Layout:

`src/app/(main)/checkout/page.tsx` customize করুন।

---

## 🐛 Troubleshooting

### Problem: Plans show হচ্ছে না

**Solution:**
```bash
node scripts/seedPlans.mjs
```

### Problem: User access পাচ্ছে না

**Check:**
1. MongoDB এ subscription আছে কিনা
2. `status: "active"` আছে কিনা
3. `endDate` future date কিনা

### Problem: TypeScript errors

**Solution:**
```bash
npm run build
```

---

## 📂 Important Files

| File | Purpose |
|------|---------|
| `src/models/Plan.ts` | Pricing plan schema |
| `src/models/Subscription.ts` | User subscription schema |
| `src/lib/accessControl.ts` | Access control logic |
| `src/app/api/plans/route.ts` | Plans CRUD API |
| `src/app/api/subscriptions/route.ts` | Subscription API |
| `src/app/(main)/pricing/page.tsx` | Pricing page |
| `src/app/(main)/checkout/page.tsx` | Payment page |
| `middleware.ts` | Route protection |

---

## 🎓 Next Steps

1. ✅ Default plans seed করুন
2. ✅ Pricing page test করুন
3. ✅ Exam page এ access control add করুন
4. ⏳ Payment gateway integrate করুন (bKash/SSL Commerz)
5. ⏳ Admin dashboard বানান plan management এর জন্য
6. ⏳ Email notifications add করুন (subscription expiry)
7. ⏳ Analytics dashboard তৈরি করুন

---

## 📞 Need Help?

- Check `BACKEND_DOCUMENTATION.md` for detailed docs
- See `src/app/exam/example-protected-page.tsx` for usage example
- MongoDB queries test করুন MongoDB Compass দিয়ে

---

## ✨ Features Overview

```
┌─────────────────────────────────────────┐
│     User visits /pricing                │
│     ↓                                   │
│     Selects plan (Pro Achiever)         │
│     ↓                                   │
│     Redirects to /checkout              │
│     ↓                                   │
│     Selects payment method (bKash)      │
│     ↓                                   │
│     Payment processed                   │
│     ↓                                   │
│     Subscription created in DB          │
│     ↓                                   │
│     User can access /exam               │
│     ↓                                   │
│     Takes mock test                     │
│     ↓                                   │
│     Usage tracked (mockTestsUsed++)     │
│     ↓                                   │
│     If limit reached → Upgrade prompt   │
└─────────────────────────────────────────┘
```

**এখন আপনার platform fully professional! 🎉**

Good luck with your IELTS business! 💼📚
