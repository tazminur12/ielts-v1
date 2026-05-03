import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Attempt from "@/models/Attempt";
import { submitAttemptDoc } from "@/lib/attemptSubmission";
import { getAutosubmitQueue } from "@/lib/bullmq";

export async function POST(req: NextRequest) {
  try {
    const secret = process.env.CRON_SECRET;
    if (!secret) return NextResponse.json({ message: "Not configured" }, { status: 500 });

    const provided = req.headers.get("x-cron-secret");
    if (!provided || provided !== secret) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const queue = getAutosubmitQueue();
    if (queue) {
      const now = Date.now();
      const minute = Math.floor(now / 60000);
      await queue.add(
        "scan",
        { minute },
        {
          jobId: `autosubmit:scan:${minute}`,
        }
      );
      return NextResponse.json({ enqueued: true });
    }

    await connectDB();

    const now = new Date();
    const attempts = await Attempt.find({
      status: "in_progress",
      expiresAt: { $exists: true, $lte: now },
    })
      .sort({ expiresAt: 1 })
      .limit(100);

    let submitted = 0;
    let evaluated = 0;

    for (const attempt of attempts as any[]) {
      const actor = attempt.userId
        ? ({ userId: String(attempt.userId) } as const)
        : ({ guestId: String(attempt.guestId) } as const);
      const r = await submitAttemptDoc({ attempt, actor, now });
      if (r.status === "evaluated") evaluated += 1;
      else submitted += 1;
    }

    return NextResponse.json({ processed: attempts.length, submitted, evaluated, enqueued: false });
  } catch (error: any) {
    return NextResponse.json({ message: error?.message || "Internal Server Error" }, { status: 500 });
  }
}
