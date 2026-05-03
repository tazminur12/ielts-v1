import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/mongodb";
import Test from "@/models/Test";

const ADMIN_ROLES = ["admin", "super-admin", "staff"];

// GET /api/admin/tests/[id]/versions
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !ADMIN_ROLES.includes(session.user.role)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const { id } = await params;

    const originalTest = await Test.findById(id);
    if (!originalTest) {
      return NextResponse.json({ message: "Test not found" }, { status: 404 });
    }

    const testIdToUse = originalTest.parentTestId || originalTest._id;

    const versions = await Test.find({
      $or: [
        { _id: testIdToUse },
        { parentTestId: testIdToUse },
      ],
    })
      .sort({ version: -1 })
      .lean();

    return NextResponse.json({ versions });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
