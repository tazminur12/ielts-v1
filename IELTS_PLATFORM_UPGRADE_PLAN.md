# IELTS Platform Upgrade Plan

## 📋 Current Status Analysis

**Good News:** Most of the requested features are **already implemented**! Here's what's working:

✅ Admin dashboard for Mock Test & Practice Test management
✅ Section → Group → Question structure
✅ AI-based test generation (OpenAI)
✅ Public test listing with access control
✅ Redis caching
✅ Full exam engine with timer system
✅ Auto-save answers
✅ Real exam UI (split-pane for reading)
✅ Results & analytics with band scores
✅ AI writing/speaking evaluation
✅ Listening system with audio upload
✅ Speaking system with recording

---

## 🎯 Upgrade Roadmap

### Phase 1: Enhanced Question Navigation (Priority: High)
1. Add "Mark for Review" feature
2. Question navigation grid (1–40)
3. Jump to question functionality
4. Answered/unanswered indicators

### Phase 2: Practice Mode Enhancements (Priority: Medium)
1. Instant feedback mode
2. Topic-wise filtering
3. Question-type filtering
4. Show explanations

### Phase 3: Progress Dashboard (Priority: Medium)
1. Performance history charts
2. Weak area detection
3. Progress tracking over time

### Phase 4: Backend Optimizations (Priority: Low)
1. Enhanced data models
2. Performance optimizations
3. Additional API endpoints

---

## 📁 Folder Structure (Already Organized)

```
src/
├── app/
│   ├── (main)/              # Public pages
│   │   ├── mock-tests/
│   │   ├── practice/
│   │   └── ...
│   ├── api/                 # API routes
│   │   ├── admin/
│   │   ├── ai/
│   │   ├── attempts/
│   │   ├── tests/
│   │   └── ...
│   ├── dashboard/           # Admin & user dashboards
│   └── exam/                # Exam pages
├── components/
│   ├── admin/
│   ├── chatbot/
│   ├── dashboard/
│   └── exam/
├── lib/
├── models/
└── types/
```

---

## 🎨 Key React Components to Add/Enhance

### 1. Question Navigation Panel
**File:** `src/components/exam/QuestionNavPanel.tsx`
- Grid of question numbers (1–40)
- Color indicators:
  - 🟢 Answered
  - ⚪ Unanswered
  - 🟡 Marked for review
- Jump to any question
- Toggle review status

### 2. Progress Chart Component
**File:** `src/components/dashboard/ProgressChart.tsx`
- Using Recharts library
- Line chart for band score progress
- Bar chart for module-wise performance
- Pie chart for weak areas

### 3. Practice Filter Panel
**File:** `src/components/practice/FilterPanel.tsx`
- Topic selector
- Question type selector
- Difficulty selector
- Instant feedback toggle

---

## 🗄️ MongoDB Schema Updates (Already Implemented)

### Test Model (Already Good)
```typescript
// src/models/Test.ts
- isFullMock: boolean (can add if needed)
- sectionsOrder: string[] (already ordered via 'order' field)
- totalQuestions: number (already exists)
```

### Question Model (Enhancements)
**File to update:** `src/models/Question.ts`
```typescript
// Add these fields:
- skill: "listening" | "reading" | "writing" | "speaking"
- bandLevel: number (1-9)
- topic: string
- explanation: string (already exists!)
```

### Attempt/Result Model (Already Implemented)
```typescript
// src/models/Attempt.ts
- sectionScores: { listening?: number; reading?: number; ... } (already exists!)
- answers: Answer[] (via Answer model)
- timeSpent: number (already exists!)
- submittedAt: Date (already exists!)
```

---

## 🔌 API Endpoints (Already Implemented)

| Endpoint | Purpose | Status |
|----------|---------|--------|
| `POST /api/attempts` | Start new attempt | ✅ |
| `GET /api/attempts` | Get user's attempts | ✅ |
| `PATCH /api/attempts/:id` | Submit attempt | ✅ |
| `GET /api/attempts/:id` | Get attempt results | ✅ |
| `POST /api/answers` | Save answer | ✅ |
| `GET /api/answers` | Get answers for attempt | ✅ |
| `POST /api/admin/tests/generate` | AI generate test | ✅ |
| `POST /api/ai/generate-questions` | AI generate questions | ✅ |
| `POST /api/ai/writing` | Evaluate writing | ✅ |
| `POST /api/ai/speaking` | Evaluate speaking | ✅ |

---

## 💡 Critical Logic Snippets

### Timer Logic (Already Implemented)
**Location:** `src/app/exam/take/page.tsx`
```typescript
// Countdown timer
useEffect(() => {
  if (!timerActive) return;
  const id = setInterval(() => {
    setTimeLeft((prev) => (prev <= 1 ? 0 : prev - 1));
  }, 1000);
  timerRef.current = id;
  return () => clearInterval(id);
}, [timerActive]);

// Auto-submit when time ends
useEffect(() => {
  if (timerActive && timeLeft === 0) {
    if (timerRef.current) clearInterval(timerRef.current);
    handleSubmitRef.current(true);
  }
}, [timeLeft, timerActive]);
```

### Auto-Save Logic (Already Implemented)
**Location:** `src/app/exam/take/page.tsx`
```typescript
const saveAnswer = useCallback(async (questionId: string, value: string, questionType: string) => {
  if (!attemptId) return;
  const questionNumber = questionNumberById.get(String(questionId));
  if (questionNumber == null || !Number.isFinite(questionNumber)) return;
  if (saveInFlight.current.has(questionId)) return;
  saveInFlight.current.add(questionId);

  const body: Record<string, unknown> = { attemptId, questionId, questionNumber, questionType };
  const selectTypes = ["multiple_choice", "true_false_not_given", "matching", "matching_headings"];
  if (selectTypes.includes(questionType)) {
    body.selectedOption = value;
  } else {
    body.textAnswer = value;
  }

  try {
    await fetch("/api/answers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } finally {
    saveInFlight.current.delete(questionId);
  }
}, [attemptId, questionNumberById]);
```

### Exam UI Layout (Already Implemented)
**Reading split-pane:**
```typescript
// Left: Passage, Right: Questions
<div className="flex h-full min-h-0 overflow-hidden">
  <div className="w-1/2 min-w-0 shrink-0 overflow-y-auto border-r border-[#d4cfc4] bg-[#faf9f6]">
    {/* Passage content */}
  </div>
  <div className="flex-1 min-w-0 overflow-y-auto bg-[#e8e4dc]">
    {/* Questions */}
  </div>
</div>
```

---

## 🚀 Let's Start Implementing!

Now let's implement the key enhancements.
