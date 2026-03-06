import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/mongodb";
import Question from "@/models/Question";
import Test from "@/models/Test";
import * as XLSX from "xlsx";
import mammoth from "mammoth";

/**
 * Parse a Word (.docx) or PDF file into a JSON questions array.
 *
 * Expected plain-text format (one question per numbered block):
 *
 *   1. What is the main purpose...?
 *   A. To inform
 *   B. To entertain
 *   C. To persuade
 *   D. To describe
 *   Answer: A
 *   Explanation: ...
 *
 * Works for MCQ, True/False, Short Answer etc.
 */
function parseQuestionsFromText(
  text: string,
  defaults: { testId: string; sectionId: string; groupId: string }
): any[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const questions: any[] = [];
  let current: any = null;

  for (const line of lines) {
    // New numbered question: "1." or "1)"
    const qMatch = line.match(/^(\d+)[.)]\s+(.+)/);
    if (qMatch) {
      if (current) questions.push(current);
      current = {
        ...defaults,
        questionNumber: Number(qMatch[1]),
        order: Number(qMatch[1]),
        questionText: qMatch[2],
        questionType: "multiple_choice",
        options: [] as { label: string; text: string }[],
        correctAnswer: "",
        explanation: "",
        marks: 1,
      };
      continue;
    }
    if (!current) continue;

    // Options A-D
    const optMatch = line.match(/^([A-Da-d])[.)]\s+(.+)/);
    if (optMatch) {
      current.options.push({ label: optMatch[1].toUpperCase(), text: optMatch[2] });
      continue;
    }
    // Answer line
    const ansMatch = line.match(/^[Aa]nswer[:\s]+(.+)/);
    if (ansMatch) { current.correctAnswer = ansMatch[1].trim(); continue; }

    // Explanation line
    const expMatch = line.match(/^[Ee]xplanation[:\s]+(.+)/);
    if (expMatch) { current.explanation = expMatch[1].trim(); continue; }
  }
  if (current) questions.push(current);

  // Determine question type
  return questions.map((q) => {
    if (!q.options || q.options.length === 0) {
      q.options = undefined;
      q.questionType = "short_answer";
    } else {
      q.questionType = "multiple_choice";
    }
    return q;
  });
}

/** Map human-readable / flat type strings to internal questionType values */
function normalizeQuestionType(raw: string): string {
  const map: Record<string, string> = {
    "multiple choice":       "multiple_choice",
    "multiplechoice":        "multiple_choice",
    "multiple_choice":       "multiple_choice",
    "true/false/not given":  "true_false_not_given",
    "true false not given":  "true_false_not_given",
    "true_false_not_given":  "true_false_not_given",
    "yes/no/not given":      "yes_no_not_given",
    "yes no not given":      "yes_no_not_given",
    "yes_no_not_given":      "yes_no_not_given",
    "fill in the blank":     "fill_blank",
    "fill_blank":            "fill_blank",
    "fill blank":            "fill_blank",
    "matching":              "matching",
    "sentence completion":   "sentence_completion",
    "sentence_completion":   "sentence_completion",
    "short answer":          "short_answer",
    "short_answer":          "short_answer",
    "essay":                 "essay",
    "writing task":          "essay",
    "speaking":              "speaking",
  };
  return map[raw.toLowerCase().trim()] ?? "multiple_choice";
}

const ADMIN_ROLES = ["admin", "super-admin", "staff"];

// GET /api/admin/questions?testId=xxx&sectionId=xxx&groupId=xxx
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !ADMIN_ROLES.includes(session.user.role)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    await connectDB();

    const { searchParams } = new URL(req.url);
    const filter: Record<string, string> = {};
    ["testId", "sectionId", "groupId"].forEach((k) => {
      const v = searchParams.get(k);
      if (v) filter[k] = v;
    });

    const questions = await Question.find(filter)
      .select("+correctAnswer +explanation")
      .sort({ questionNumber: 1 })
      .lean();

    return NextResponse.json(questions);
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

// POST /api/admin/questions  — single question
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !ADMIN_ROLES.includes(session.user.role)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    await connectDB();

    const body = await req.json();
    const { testId, sectionId, groupId, questionNumber, questionText, questionType, order } = body;

    if (!testId || !sectionId || !groupId || questionNumber === undefined || !questionText || !questionType || order === undefined) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    const question = await Question.create(body);

    // Update totalQuestions on the test
    const count = await Question.countDocuments({ testId });
    await Test.findByIdAndUpdate(testId, { totalQuestions: count });

    return NextResponse.json(question, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

// PUT /api/admin/questions  — bulk upload via Excel, JSON, Word (.docx) or PDF
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !ADMIN_ROLES.includes(session.user.role)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    await connectDB();

    const contentType = req.headers.get("content-type") || "";
    let questions: any[] = [];

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json({ message: "No file provided" }, { status: 400 });
      }

      const testId  = (formData.get("testId")  as string) || "";
      const sectionId = (formData.get("sectionId") as string) || "";
      const groupId = (formData.get("groupId") as string) || "";
      const defaults = { testId, sectionId, groupId };

      const buffer = Buffer.from(await file.arrayBuffer());
      const fileName = file.name.toLowerCase();

      if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
        // ── Excel ──────────────────────────────────────────────────
        const workbook = XLSX.read(buffer, { type: "buffer" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(sheet);
        questions = rows.map((row, i) => ({
          testId:         row.testId   || testId,
          sectionId:      row.sectionId || sectionId,
          groupId:        row.groupId  || groupId,
          questionNumber: Number(row.questionNumber),
          questionText:   String(row.questionText || ""),
          questionType:   String(row.questionType || "multiple_choice"),
          options:        row.options ? JSON.parse(row.options) : undefined,
          correctAnswer:  row.correctAnswer,
          explanation:    row.explanation,
          marks:          Number(row.marks) || 1,
          order:          Number(row.order || i + 1),
        }));

      } else if (fileName.endsWith(".docx") || fileName.endsWith(".doc")) {
        // ── Word ───────────────────────────────────────────────────
        const result = await mammoth.extractRawText({ buffer });
        questions = parseQuestionsFromText(result.value, defaults);

      } else if (fileName.endsWith(".pdf")) {
        // ── PDF ────────────────────────────────────────────────────
        // Lazy require to avoid DOMMatrix crash during module evaluation
        const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string }>;
        const result = await pdfParse(buffer);
        questions = parseQuestionsFromText(result.text, defaults);

      } else if (fileName.endsWith(".json") || file.type.includes("json")) {
        // ── JSON file ──────────────────────────────────────────────
        const text = buffer.toString("utf-8");
        const parsed = JSON.parse(text);
        const rawList: any[] = Array.isArray(parsed) ? parsed : (parsed.questions ?? []);

        questions = rawList.map((row: any, i: number) => {
          // Build options array from flat option_a/b/c/d fields if needed
          let options: { label: string; text: string }[] | undefined = undefined;
          if (row.options && Array.isArray(row.options)) {
            options = row.options;
          } else if (row.option_a || row.option_b || row.option_c || row.option_d) {
            options = (["a", "b", "c", "d"] as const)
              .filter((k) => row[`option_${k}`])
              .map((k) => ({ label: k.toUpperCase(), text: String(row[`option_${k}`]) }));
          }

          return {
            testId:         testId,
            sectionId:      sectionId,
            groupId:        groupId,
            questionNumber: Number(row.questionNumber ?? row.question_number ?? i + 1),
            questionText:   String(row.questionText   ?? row.question_text   ?? ""),
            questionType:   normalizeQuestionType(String(row.questionType ?? row.type ?? "multiple_choice")),
            options,
            correctAnswer:  row.correctAnswer ?? row.correct_answer ?? "",
            explanation:    row.explanation   ?? row.explanation    ?? "",
            marks:          Number(row.marks) || 1,
            order:          Number(row.order  ?? row.question_number ?? row.questionNumber ?? i + 1),
          };
        });

      } else {
        return NextResponse.json(
          { message: "Unsupported file type. Use .xlsx, .xls, .docx, .pdf, or .json" },
          { status: 400 }
        );
      }
    } else {
      // JSON body
      const body = await req.json();
      questions = Array.isArray(body) ? body : body.questions;
    }

    if (!questions || questions.length === 0) {
      return NextResponse.json({ message: "No questions found in file" }, { status: 400 });
    }

    // Bulk insert
    const inserted = await Question.insertMany(questions, { ordered: false });

    // Update test totalQuestions count
    const testIds = [...new Set(questions.map((q) => q.testId).filter(Boolean))];
    await Promise.all(
      testIds.map(async (id) => {
        const count = await Question.countDocuments({ testId: id });
        return Test.findByIdAndUpdate(id, { totalQuestions: count });
      })
    );

    return NextResponse.json({
      message: `${inserted.length} questions uploaded successfully`,
      count: inserted.length,
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
