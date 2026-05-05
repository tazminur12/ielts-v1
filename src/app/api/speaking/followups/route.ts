import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { requestLogger } from "@/lib/logger";
import { captureException } from "@/lib/sentryServer";
import { generateFollowUpQuestions } from "@/lib/speakingEnhancementComplete";

export async function POST(req: NextRequest) {
  const log = requestLogger(req);
  try {
    const session = await getServerSession(authOptions);
    if (!session)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const {
      transcript,
      originalQuestion,
      partNumber,
      speakingRate,
      hesitationRate,
      fluencyScore,
      pronunciationScore,
    } = body;

    if (!transcript || !originalQuestion || !partNumber) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    const followUps = await generateFollowUpQuestions({
      candidateAnswer: transcript,
      originalQuestion,
      partNumber: partNumber as 1 | 2 | 3,
      speakingRate: speakingRate || 100,
      hesitationRate: hesitationRate || 0,
      fluencyScore: fluencyScore || 5,
      pronunciationScore: pronunciationScore || 5,
    });

    return NextResponse.json({ followUps });
  } catch (error: any) {
    log.error({ error }, "speaking_followups_error");
    captureException(error, {
      requestId: req.headers.get("x-request-id") || "unknown",
      route: "/api/speaking/followups",
    });
    return NextResponse.json(
      { message: error?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
