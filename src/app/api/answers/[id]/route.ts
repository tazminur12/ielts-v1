import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/mongodb";
import { getGuestId } from "@/lib/guestSession";
import Answer from "@/models/Answer";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: answerId } = await params;
    if (!answerId) {
      return NextResponse.json({ message: "Answer ID required" }, { status: 400 });
    }

    const session = await getServerSession(authOptions);
    const guestId = session ? null : getGuestId(req);
    if (!session && !guestId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const answer = await Answer.findById(answerId).lean();
    if (!answer) {
      return NextResponse.json({ message: "Answer not found" }, { status: 404 });
    }

    // Check permission
    if (session?.user?.id) {
      if (String(answer.userId) !== session.user.id) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
      }
    } else if (String(answer.guestId) !== guestId) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    // Support field filtering (e.g., ?field=aiAudioUrl)
    const field = req.nextUrl.searchParams.get("field");
    if (field) {
      const value = (answer as any)[field];
      return NextResponse.json({ [field]: value || null });
    }

    // Return full answer
    return NextResponse.json(answer);
  } catch (error: any) {
    console.error("Error fetching answer:", error);
    return NextResponse.json(
      { message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
