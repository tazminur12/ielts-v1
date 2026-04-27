import OpenAI from "openai";
import { NextResponse } from "next/server";

type Role = "user" | "assistant";
type ApiRole = Role | "system";

type HistoryItem = {
  role: Role;
  content: string;
};

const SYSTEM_PROMPT =
  "You are a professional IELTS instructor. Provide clear, concise, and helpful guidance. " +
  "You can correct writing, suggest vocabulary upgrades, give speaking tips, and estimate band score. " +
  "Be supportive, but do not invent user scores—explain assumptions. " +
  "When correcting writing, show: (1) corrected version, (2) key improvements, (3) band estimate with reasons.";

const MAX_INPUT_CHARS = 6000;
const MAX_HISTORY_ITEMS = 12;
const MAX_OUTPUT_TOKENS = 600;

// Basic in-memory rate limit (best-effort in serverless)
const rl = globalThis as unknown as {
  __ieltsChatRL?: Map<string, number[]>;
};
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 20;

function getClientIp(req: Request) {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]?.trim() || "unknown";
  return req.headers.get("x-real-ip") || "unknown";
}

function rateLimitOrThrow(key: string) {
  if (!rl.__ieltsChatRL) rl.__ieltsChatRL = new Map();
  const now = Date.now();
  const arr = rl.__ieltsChatRL.get(key) || [];
  const next = arr.filter((t) => now - t < RATE_WINDOW_MS);
  if (next.length >= RATE_MAX) {
    const retryAfter = Math.max(1, Math.ceil((RATE_WINDOW_MS - (now - next[0])) / 1000));
    const err = new Error("rate_limited");
    (err as any).retryAfter = retryAfter;
    throw err;
  }
  next.push(now);
  rl.__ieltsChatRL.set(key, next);
}

export async function POST(req: Request) {
  try {
    rateLimitOrThrow(getClientIp(req));

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { ok: false, error: "Server misconfigured: missing OPENAI_API_KEY." },
        { status: 500 }
      );
    }

    const body = (await req.json()) as {
      message?: unknown;
      history?: unknown;
    };

    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (!message) {
      return NextResponse.json(
        { ok: false, error: "Message is required." },
        { status: 400 }
      );
    }
    if (message.length > MAX_INPUT_CHARS) {
      return NextResponse.json(
        { ok: false, error: `Message too long (max ${MAX_INPUT_CHARS} chars).` },
        { status: 400 }
      );
    }

    const historyRaw = Array.isArray(body.history) ? body.history : [];
    const history: HistoryItem[] = historyRaw
      .slice(-MAX_HISTORY_ITEMS)
      .map((h: any) => {
        const role: Role = h?.role === "assistant" ? "assistant" : "user";
        const content = typeof h?.content === "string" ? String(h.content) : "";
        return { role, content };
      })
      .filter((h) => h.content.trim().length > 0)
      .map((h) => ({
        ...h,
        content: h.content.slice(0, MAX_INPUT_CHARS),
      }));

    const client = new OpenAI({ apiKey });

    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_CHAT_MODEL || "gpt-4.1-mini",
      max_tokens: MAX_OUTPUT_TOKENS,
      temperature: 0.4,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...history.map((h) => ({ role: h.role as ApiRole, content: h.content })),
        { role: "user", content: message },
      ],
    });

    const text = (completion.choices?.[0]?.message?.content || "").trim();
    if (!text) {
      return NextResponse.json(
        { ok: false, error: "Empty response from AI. Please try again." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: { role: "assistant", content: text },
    });
  } catch (err: any) {
    if (err?.message === "rate_limited") {
      const retryAfter = Number(err?.retryAfter || 30);
      return NextResponse.json(
        { ok: false, error: "Too many requests. Please slow down." },
        {
          status: 429,
          headers: { "Retry-After": String(retryAfter) },
        }
      );
    }

    return NextResponse.json(
      { ok: false, error: "Server error. Please try again." },
      { status: 500 }
    );
  }
}

