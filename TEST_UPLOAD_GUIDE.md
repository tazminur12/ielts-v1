# IELTS Test Management Guide

এই ডকুমেন্টে admin dashboard থেকে mock test ও practice test upload করা, AI দিয়ে generate করা এবং public view-এ দেখানোর পুরো প্রক্রিয়া বর্ণনা করা হয়েছে।

---

## Table of Contents
1. [Mock Test & Practice Test Upload করার প্রক্রিয়া](#1-mock-test--practice-test-upload-করার-প্রক্রিয়া)
2. [AI দিয়ে Test Generate করা](#2-ai-দিয়ে-test-generate-করা)
3. [Test কিভাবে Public-এ দেখায়](#3-test-কিভাবে-public-এ-দেখায়)

---

## 1. Mock Test & Practice Test Upload করার প্রক্রিয়া

### Step 1: Test Create করা (Draft হিসেবে)

1. Admin Dashboard-এ গিয়ে **Mock Tests** বা **Practice Tests** পেজে যান
2. **Create Mock Test** বা **Create Practice Test** বাটনে ক্লিক করুন
3. নিচের ফিল্ডগুলো পূরণ করুন:
   - **Title**: Test-এর নাম (required)
   - **Description**: Test সম্পর্কে সংক্ষিপ্ত বর্ণনা
   - **Type**: Academic / General / Speaking Only / Other
   - **Module**: Listening / Reading / Writing / Speaking / Full Mock (for mock test)
   - **Access Level**: Free / কোনো specific plan (required)
   - **Duration**: মিনিটে সময়
   - **Difficulty**: Easy / Medium / Hard
   - **Rating**: 0-5 এর মধ্যে (optional)
   - **Users Taken**: কতজন user এই test দিয়েছে (optional)
   - **Tags**: comma-separated tags
   - **Instructions**: Test শুরু করার আগে student-দের দেখানো নির্দেশনা
4. Submit করলে test **Draft** status-এ create হয়ে যাবে

### Step 2: Test-এ Section, Group, Question যোগ করা

Test create করার পর **Manage** বাটনে ক্লিক করে test details পেজে যান। এখানে ৪টি step follow করুন:

#### Step 2.1: Add Section
- **Add Section** বাটনে ক্লিক করুন
- Section type নির্বাচন করুন (Listening Part / Reading Passage / Writing Task / Speaking Part)
- Section title, instructions, passage (যদি প্রয়োজন) দিন
- Save করুন

#### Step 2.2: Add Question Group
- Section expand করুন
- **Add Group** বাটনে ক্লিক করুন
- Group title, question type, question number range সেট করুন
- Save করুন

#### Step 2.3: Question Add করার ৩টি উপায়
1. **Add Question**: একক question manually যোগ করা
2. **Bulk Upload**: .xlsx, .docx, .pdf, .json file থেকে bulk-এ question upload করা
3. **Generate with AI**: AI দিয়ে automatically question generate করা (বিস্তারিত নিচে দেখুন)

#### Step 2.4: Listening Audio Upload (optional)
- Listening section-এর জন্য **Audio Uploader** থেকে audio file upload করুন

### Step 3: Test Publish করা
- সব question যোগ করার পর **Publish** বাটনে ক্লিক করুন
- Confirm করলে test status "published" হয়ে যাবে এবং public-এ দেখা যাবে

---

## 2. AI দিয়ে Test Generate করা

AI দিয়ে test generate করার দুইটি পদ্ধতি আছে:

### Option 1: পুরো Test AI দিয়ে Generate করা
1. Mock Tests / Practice Tests পেজে **Generate with AI** বাটনে ক্লিক করুন
2. ফর্ম পূরণ করুন:
   - **Module**: Listening / Reading / Writing / Speaking / Full Mock
   - **Title**: Test-এর নাম (optional)
   - **Topic**: কোন বিষয়বস্তুর উপর test হবে
   - **Difficulty**: Easy / Medium / Hard
   - **Access Level**: কোন plan-এর জন্য
   - **Question Count**: কতগুলো question generate হবে
   - **Question Types**: কোন ধরনের question (multiple choice, true/false, etc.)
   - **IELTS Type**: Academic / General
3. Generate করুন

### Option 2: নির্দিষ্ট Group-এর জন্য AI দিয়ে Question Generate করা
1. Test details পেজে যান
2. যে section-এ question যোগ করতে চান সেটি expand করুন
3. **Generate with AI** বাটনে ক্লিক করুন
4. ফর্ম পূরণ করুন:
   - **Topic**: question-এর বিষয়
   - **Question Type**: Multiple Choice / True/False/Not Given / Fill in the Blank / etc.
   - **Number of Questions**: কতগুলো question
   - **Start Question Number**: কত নম্বর থেকে শুরু হবে
5. Generate করুন

### AI Generation কিভাবে কাজ করে?
- **Model**: GPT-4o (default, configurable via `OPENAI_TEST_GENERATION_MODEL` env variable)
- **System Prompt**: `src/lib/ieltsGeneration.ts`-এ `AUTHENTIC_IELTS_SYSTEM` constant দ্বারা নিয়ন্ত্রিত
- **Generation Flow**:
  1. Admin input অনুযায়ী specific prompt তৈরি হয় (listening/reading/writing/speaking/full mock-এর জন্য আলাদা prompt)
  2. OpenAI API call করা হয়
  3. Response থেকে JSON parse করা হয়
  4. Sections, Question Groups, Questions database-এ save করা হয়
  5. Listening section-এর জন্য automatically TTS (Text-to-Speech) দিয়ে audio generate করে S3-এ upload করা হয় (if applicable)
- **Sanitization**: `sanitizeIeltsCandidateText()` function দ্বারা AI-এর response থেকে "as an AI model" এর মতো phrase remove করা হয়

---

## 3. Test কিভাবে Public-এ দেখায়

### Access Control
Test কে দেখার জন্য:
- Test status অবশ্যই **published** হতে হবে
- User-এর access level test-এর `accessLevel`-এর সাথে মিলতে হবে অথবা test "free" হলে সবাই দেখতে পারবে
- Subscription-based access: `/api/tests` endpoint-এ user-এর subscription অনুযায়ী accessible plans determine করা হয়

### Public Routes
- **Mock Tests**: `/mock-tests` → `src/app/(main)/mock-tests/page.tsx`
- **Practice Tests**: `/practice` → `src/app/(main)/practice/page.tsx`
- **Individual Module Practice**: `/practice/[module]` (e.g., `/practice/reading`)

### API Endpoint for Public Tests
- **GET `/api/tests`**: Published tests list return করে
  - Query params: `examType` (mock/practice), `module`, `page`, `limit`
  - Return করে:
    - `tests`: tests array
    - `accessibleSlugs`: user-accessible plans
    - `plansBySlug`: plans metadata
    - `pagination`: pagination info

### Caching
- **Redis Cache**: Test lists, plans, user entitlements Redis-এ cache করা হয়
- **Cache Buster**: Test create/update/delete করলে `bumpCacheBuster("tests")` call করে cache invalidate করা হয়
- Cache keys:
  - Tests list: `ielts:tests:list:v1:{buster}:{examType}:{module}:{page}:{limit}`
  - Plans: `ielts:plans:activeSlugs:v1`, `ielts:plans:meta:v1`
  - User entitlements: `ielts:entitlements:v1:{userId}`

### User Flow (Public)
1. User `/mock-tests` বা `/practice` পেজে আসে
2. SWR (React Hooks for Data Fetching) দ্বারা `/api/tests` থেকে data fetch করা হয়
3. Test card-এ lock/unlock indicator দেখায় (access level অনুযায়ী)
4. Unlocked test-এর জন্য **Start test** বাটন দেখায়
5. Locked test-এর জন্য:
   - Logged in user: **Upgrade to unlock** → pricing page
   - Guest user: **Login to unlock** → login page (with redirect)

---

## Key Files & Locations

| Functionality | File Path |
|---------------|-----------|
| Admin Mock Tests Page | `src/app/dashboard/admin/mock-tests/page.tsx` |
| Admin Practice Tests Page | `src/app/dashboard/admin/practice-tests/page.tsx` |
| Admin Test Details Page | `src/app/dashboard/admin/tests/[id]/page.tsx` |
| Test API (Admin) | `src/app/api/admin/tests/route.ts` |
| AI Test Generate API | `src/app/api/admin/tests/generate/route.ts` |
| AI Question Generate API | `src/app/api/ai/generate-questions/route.ts` |
| Public Tests API | `src/app/api/tests/route.ts` |
| Test Model | `src/models/Test.ts` |
| AI Generation Logic | `src/lib/ieltsGeneration.ts` |
| Listening TTS | `src/lib/listeningTts.ts` |
| Public Mock Tests Page | `src/app/(main)/mock-tests/page.tsx` |
| Public Practice Page | `src/app/(main)/practice/page.tsx` |

---

## Environment Variables

নিচের variables configure করা প্রয়োজন:
- `OPENAI_API_KEY`: OpenAI API key
- `OPENAI_TEST_GENERATION_MODEL`: (optional) Default: "gpt-4o"
- AWS S3 related variables (for audio/file upload)

---
