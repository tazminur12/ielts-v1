import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { requestLogger } from "@/lib/logger";
import { captureException } from "@/lib/sentryServer";
import {
  analyzePronunciation,
  analyzeHesitations,
} from "@/lib/speakingEnhancementComplete";

export async function POST(req: NextRequest) {
  const log = requestLogger(req);
  try {
    const session = await getServerSession(authOptions);
    if (!session)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { audioBase64, mimeType } = body;

    if (!audioBase64 || !mimeType) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    const binaryString = atob(audioBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const arrayBuffer = bytes.buffer;
    const blob = new Blob([arrayBuffer], { type: mimeType });

    const [pronunciation, hesitation] = await Promise.all([
      analyzePronunciation(blob),
      analyzeHesitations(blob),
    ]);

    return NextResponse.json({ pronunciation, hesitation });
  } catch (error: any) {
    log.error({ error }, "speaking_analyze_error");
    captureException(error, {
      requestId: req.headers.get("x-request-id") || "unknown",
      route: "/api/speaking/analyze",
    });
    return NextResponse.json(
      { message: error?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
