# IELTS Practice Pro

> Professional IELTS preparation platform with comprehensive mock tests, AI-powered speaking evaluation, and standardized grading.

[![Built with Next.js 16](https://img.shields.io/badge/Built%20with-Next.js%2016-black)](https://nextjs.org)
[![React 19](https://img.shields.io/badge/React-19-blue)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-enabled-blue)](https://www.typescriptlang.org)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind%20CSS-v4-06B6D4)](https://tailwindcss.com)
[![MongoDB](https://img.shields.io/badge/MongoDB-enabled-green)](https://www.mongodb.com)
[![OpenAI](https://img.shields.io/badge/OpenAI-TTS%20%26%20GPT-412991)](https://openai.com)
[![License](https://img.shields.io/badge/License-MIT-green)](#license)

## 🎯 Overview

IELTS Practice Pro is a comprehensive online platform designed to help students prepare for the IELTS examination with AI-powered assistance. Our platform offers:

- **500+ Mock Tests** - Authentic exam-style practice tests (Reading, Writing, Listening, Speaking)
- **AI-Powered Speaking Module** - Real-time interview simulation with OpenAI-powered follow-up questions and TTS audio
- **Standardized Grading** - Fair and consistent evaluation via OpenAI rubric scoring
- **Unlimited Practice** - All four modules with instant feedback and detailed analytics
- **Vocabulary Builder** - Interactive word definitions with pronunciation support
- **Progress Tracking** - Detailed analytics, band prediction, and performance monitoring
- **24/7 Access** - Learn at your own pace, anytime, anywhere

## 🎤 AI-Powered Speaking Module

The platform features a sophisticated speaking practice system with real-time AI interaction:

### Interactive Speaking Practice
- **Part 1: Personal Interview** - AI examiner asks dynamic follow-up questions based on student responses
- **Part 2: Cue Card Task** - Auto-generated cue cards with 1-minute prep time and 2-minute speaking task
- **Part 3: Discussion** - Multi-turn conversation with contextual AI follow-ups
- **Live Audio Feedback** - OpenAI TTS with British English accent (alloy voice) for natural exam experience

### AI-Powered Evaluation
- **Automatic Transcription** - OpenAI Whisper API converts student audio to text
- **Rubric-Based Scoring** - AI evaluates against official IELTS criteria:
  - Fluency & Coherence
  - Lexical Resources
  - Grammatical Accuracy & Range
  - Pronunciation
- **Detailed Performance Metrics** - Band scores (1-9) with specific improvement suggestions
- **Attempt History** - Track all attempts with timestamps and progressive improvement

### Technical Features
- **Real-time Audio Processing** - MediaRecorder API for client-side audio capture (WebM format)
- **S3 Audio Storage** - Secure cloud storage for all student recordings
- **Offline Backup** - IndexedDB local storage with automatic retry when connectivity restored
- **Graceful Fallbacks** - Multiple TTS sources: Pre-recorded → OpenAI TTS → Browser SpeechSynthesis API
- **Speaking Question Builder** - Admin interface for creating Part 1, 2, and 3 questions with marking guides

### Admin Speaking Configuration
- **Part-wise instruction templates** for Parts 1, 2, and 3 groups
- **Speaking question builder** with prompt customization and duration presets
- **Cue card template builder** for Part 2 with automatic image/text formatting
- **Speaking section audio reference upload** for examiner voice samples
- **Client-side parity checks** before publishing to ensure exam compliance

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

**Core Configuration:**
```bash
# Database
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/ielts-v1

# Authentication
NEXTAUTH_SECRET=your_generated_secret_key
NEXTAUTH_URL=http://localhost:3000

# Next.js
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**AI & Speech Synthesis (OpenAI):**
```bash
# OpenAI API
OPENAI_API_KEY=sk-...

# Text-to-Speech Configuration
OPENAI_TTS_MODEL=tts-1-hd
OPENAI_TTS_VOICE=alloy
OPENAI_TTS_SPEED=1
OPENAI_TTS_INSTRUCTIONS=Clear British English, natural exam pace

# Speech Generation Behavior
SPEAKING_TTS_INLINE=true              # Generate TTS inline when queue unavailable
LISTENING_AUTO_TTS=true               # Auto-generate missing listening audio
```

**AWS S3 Configuration:**
```bash
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name
NEXT_PUBLIC_S3_BUCKET=your-bucket-name
```

**Payment (Stripe):**
```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Redis & Background Jobs:**
```bash
BULLMQ_REDIS_URL=redis://localhost:6379
REDIS_URL=redis://localhost:6379                    # BullMQ queue
UPSTASH_REDIS_REST_URL=https://your-upstash-url     # Production fallback
UPSTASH_REDIS_REST_TOKEN=your_upstash_token
```

**Monitoring & Analytics:**
```bash
NEXT_PUBLIC_SENTRY_DSN=https://your-sentry-dsn
SENTRY_AUTH_TOKEN=your_sentry_token
SENTRY_ENVIRONMENT=development
```

**Dictionary API:**
```bash
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
- **Framework:** Next.js 16 with App Router (React 19)
- **Language:** TypeScript 5+
- **Styling:** Tailwind CSS v4
- **Icons:** Lucide React
- **Authentication:** NextAuth.js v5 with MongoDB Adapter
- **State Management:** React Context, Zustand (client state)
- **Audio:** MediaRecorder API, Web Audio API, Web Speech API (SpeechSynthesis)
- **Storage:** IndexedDB (offline backup), localStorage (session data)

### Backend
- **Runtime:** Node.js 18+
- **Framework:** Next.js 16 Route Handlers
- **Database:** MongoDB + Mongoose ODM
- **API:** REST API with automatic validation
- **Payment:** Stripe integration (checkout & webhooks)
- **AI Services:** OpenAI (GPT-4, Whisper, TTS)
- **Background Jobs:** BullMQ (Redis-based queue) with optional inline processing
- **File Storage:** AWS S3 (audio files, documents)
- **Caching:** Redis (BullMQ queue, session caching)
- **Error Tracking:** Sentry for error monitoring
- **Logging:** Custom logger with request ID tracking

### DevOps & Infrastructure
- **Version Control:** Git (GitHub)
- **Deployment:** Vercel (auto-deploy from main)
- **Containerization:** Docker-ready
- **Package Manager:** npm
- **Linting:** ESLint + TypeScript strict mode
- **Environment Management:** dotenv with validation

### External APIs & Services
- **OpenAI:** GPT-4 (follow-up questions), Whisper (transcription), TTS (audio synthesis)
- **AWS S3:** Audio file storage and retrieval
- **Stripe:** Payment processing and subscription management
- **Upstash:** Serverless Redis (production fallback)
- **SendGrid/Email:** Notification system (planned)

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

### Authentication Endpoints
```
POST   /api/auth/[...nextauth]       - NextAuth routes (signin, signout, callback)
POST   /api/register                 - User registration
POST   /api/auth/forgot-password     - Request password reset
POST   /api/auth/reset-password      - Reset password with token
```

### Tests & Practice
```
GET    /api/tests                    - List available tests
GET    /api/tests/[id]               - Get test details
POST   /api/attempts                 - Create new test attempt
GET    /api/attempts/[id]            - Get attempt details
POST   /api/answers                  - Submit answer
GET    /api/answers/[id]             - Get answer details
```

### Speaking Module (AI-Powered)
```
POST   /api/ai/speaking-interview-turn
  - Generate AI follow-up question + TTS audio
  - Request: { sectionId, partNumber, attemptId, previousResponse, audioUrl }
  - Returns: { followUpQuestion, audioUrl, band }

POST   /api/speaking/evaluate
  - Evaluate speaking answer with transcription + rubric scoring
  - Request: { answerId, attemptId, [audioUrl] }
  - Returns: { transcription, metrics: { fluency, lexical, grammar, pronunciation }, band }

GET    /api/speaking/metadata
  - Get speaking section metadata (parts, timings, instructions)
```

### Results & Analytics
```
GET    /api/results/[attemptId]      - Get attempt results
GET    /api/analytics/user-progress  - User performance analytics
POST   /api/analytics/attempt-metrics - Store attempt metrics
```

### Plans & Subscriptions
```
GET    /api/plans                    - List subscription plans
GET    /api/plans/[slug]             - Get single plan details
POST   /api/subscriptions            - Create subscription
GET    /api/subscriptions            - Get user subscriptions
```

### Stripe Payment
```
POST   /api/stripe/checkout          - Create Stripe checkout session
POST   /api/stripe/webhook           - Stripe webhook handler
```

### Admin Endpoints
```
GET    /api/admin/users              - List all users
GET    /api/admin/users/[id]         - Get user details
PUT    /api/admin/users/[id]         - Update user
GET    /api/admin/tests              - List tests
POST   /api/admin/tests              - Create test
PUT    /api/admin/tests/[id]         - Update test
POST   /api/admin/questions          - Create question
GET    /api/admin/speaking           - Speaking questions management
POST   /api/admin/speaking           - Create speaking question
```

### Upload & File Management
```
POST   /api/upload                   - Upload file to S3 (audio, documents)
GET    /api/upload/signed-url        - Get signed S3 URL
```

### Internal & Background Jobs
```
POST   /api/internal/queue-failed    - Log failed background jobs
GET    /api/internal/health          - Health check endpoint
```

## 🚀 Deployment

### Development

```bash
# Install dependencies
npm install

# Configure environment (see section above)
# Make sure Redis is running for background jobs:
redis-server

# Run development server with hot reload
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Vercel (Recommended for Production)

1. Push to GitHub:
```bash
git push origin main
```

2. Connect repository to Vercel dashboard

3. Add environment variables in Vercel Settings:
   - All variables from `.env.local`
   - Ensure `MONGODB_URI`, `OPENAI_API_KEY`, `STRIPE_SECRET_KEY` are set

4. Deploy automatically on push

```bash
vercel deploy --prod
```

### Docker

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Dependencies
COPY package*.json ./
RUN npm ci --only=production

# Source code
COPY . .

# Build
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

Build and run:
```bash
docker build -t ielts-v1 .
docker run -p 3000:3000 --env-file .env.local ielts-v1
```

### Production Checklist

- [ ] Environment variables configured in Vercel/hosting
- [ ] Redis instance deployed (or Upstash for serverless)
- [ ] MongoDB Atlas connection string verified
- [ ] S3 bucket configured with CORS headers
- [ ] Stripe keys updated to production keys
- [ ] OpenAI API key with sufficient quota
- [ ] Sentry project configured
- [ ] Domain SSL certificate active
- [ ] Backups configured for MongoDB

## 🎯 Key Features Summary

### For Students
✅ Complete IELTS exam simulation (Reading, Writing, Listening, Speaking)  
✅ Real-time AI examiner interaction during speaking practice  
✅ Detailed performance analytics with band predictions  
✅ Vocabulary builder with pronunciation  
✅ Progress tracking across multiple attempts  
✅ 24/7 accessible from any device  

### For Instructors/Admins
✅ Admin dashboard for test/question management  
✅ Speaking question builder with marking guidelines  
✅ Cue card template editor for Part 2  
✅ User performance analytics and exports  
✅ Subscription management  
✅ Student attempt history and detailed metrics  

### Technical Highlights
✅ AI-powered follow-up questions using GPT-4  
✅ Automatic speech transcription with Whisper API  
✅ Natural TTS audio with multiple fallbacks  
✅ Offline-first architecture with IndexedDB backup  
✅ Background job queue for heavy processing  
✅ S3 cloud storage for scalability  
✅ Real-time error tracking with Sentry  

## ⚙️ Known Limitations & Future Improvements

### Current Limitations
- Speaking evaluation depends on OpenAI API availability
- S3 storage required for audio files (no local-only mode)
- Redis required for background job processing (can use inline fallback)
- Audio playback subject to browser CORS policies

### Planned Features
- [ ] Batch evaluation for tests (run all at once)
- [ ] Export results as PDF report
- [ ] Speaking video recording with AI facial recognition
- [ ] Multi-language support (currently English only)
- [ ] Mobile app (iOS/Android)
- [ ] Live instructor-led sessions
- [ ] AI-powered essay plagiarism detection

## 📊 Performance

- **Core Web Vitals:** Optimized for LCP, FID, CLS
- **Image Optimization:** Next.js Image component
- **Code Splitting:** Automatic route-based splitting
- **Caching:** Strategic cache headers

## 🤝 Contributing

1. Create a feature branch: 
```bash
git checkout -b feature/amazing-feature
```

2. Commit changes with clear messages: 
```bash
git commit -m 'feat: Add amazing feature'
git commit -m 'fix: Resolve issue #123'
```

3. Push to branch: 
```bash
git push origin feature/amazing-feature
```

4. Open a Pull Request with:
   - Clear description of changes
   - Reference to related issues
   - Test results (run `npm run lint` before pushing)

### Code Style
- Follow ESLint configuration (enforce with `npm run lint`)
- TypeScript strict mode enabled
- Use functional components with hooks
- Components in TypeScript (.tsx)
- Utilities in TypeScript (.ts)

## 📊 Performance & Monitoring

### Core Web Vitals
- **LCP (Largest Contentful Paint):** < 2.5s
- **FID (First Input Delay):** < 100ms
- **CLS (Cumulative Layout Shift):** < 0.1

### Monitoring
- **Error Tracking:** Sentry (real-time alerts)
- **Performance:** Next.js Analytics
- **Background Jobs:** BullMQ dashboard
- **Database:** MongoDB Atlas monitoring

### Load Testing Results
- Tested with 100+ concurrent speaking attempts
- Average response time: 200-400ms
- 99th percentile: < 2s
- S3 upload: 2-5s for typical audio files

## 📞 Support & Documentation

### Getting Help
- **Issues:** GitHub Issues for bug reports
- **Discussions:** GitHub Discussions for questions
- **Email:** support@ieltspracticepro.com

### Documentation Files
- `README.md` - This file (project overview)
- `.env.example` - Environment variables reference
- API documentation - See API Documentation section above
- TypeScript types - See `src/types/` directory

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Built by:** [Tazminur Rahman](https://github.com/tazminur12) & Team
- **Powered by:** 
  - [OpenAI](https://openai.com) - AI & TTS
  - [MongoDB](https://www.mongodb.com) - Database
  - [Next.js](https://nextjs.org) - Framework
  - [Vercel](https://vercel.com) - Hosting
  - [AWS S3](https://aws.amazon.com/s3) - File Storage
  - [Stripe](https://stripe.com) - Payments
- **Icons:** [Lucide React](https://lucide.dev)
- **Styling:** [Tailwind CSS](https://tailwindcss.com)

---

## 📋 Project Metadata

| Property | Value |
|----------|-------|
| **Project Name** | IELTS Practice Pro |
| **Version** | 2.0.0 |
| **Status** | Active Development |
| **Last Updated** | May 6, 2026 |
| **Repository** | [tazminur12/ielts-v1](https://github.com/tazminur12/ielts-v1) |
| **Main Branch** | `main` |
| **Development Branch** | `tanim` |
| **Node Version** | 18+ |
| **npm Version** | 9+ |
| **License** | MIT |

### Version History
- **v2.0.0** (May 2026) - AI-powered speaking module, OpenAI integration, real-time evaluation
- **v1.0.0** (April 2026) - Initial release with core modules
