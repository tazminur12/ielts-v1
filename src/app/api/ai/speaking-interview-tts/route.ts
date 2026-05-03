import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getGuestId } from "@/lib/guestSession";
import { rateLimitOrThrow } from "@/lib/ratelimit";
import { z } from "zod";
import { synthesizeListeningAudioToS3 } from "@/lib/listeningTts";
import { createHash } from "crypto";
import { withCacheHeaders } from "@/lib/httpCache";

const BodySchema = z.object({
  text: z.string().min(1).max(1000),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const guestId = session ? null : getGuestId(req);
    if (!session && !guestId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const limiterKey = session?.user?.id ? `user:${session.user.id}` : `guest:${guestId}`;
    await rateLimitOrThrow(limiterKey, "ai_speaking_interview_tts");

    const body = BodySchema.parse(await req.json());
    const text = body.text.trim();

    const key = createHash("sha1").update(text).digest("hex").slice(0, 12);
    const tts = await synthesizeListeningAudioToS3(text, `speak-announce-${key}`);

    return withCacheHeaders(
      NextResponse.json({ audioUrl: tts?.url || null, text }),
      { kind: "no-store" }
    );
  } catch (error: any) {
    if (error?.message === "rate_limited") {
      const retryAfter = Number(error?.retryAfter || 30);
      return NextResponse.json(
        { message: "Too many requests. Please slow down." },
        { status: 429, headers: { "Retry-After": String(retryAfter) } }
      );
    }
    if (error?.name === "ZodError") {
      return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
    }
    return NextResponse.json({ message: error?.message || "Internal Server Error" }, { status: 500 });
  }
}

