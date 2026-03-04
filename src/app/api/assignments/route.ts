import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Assignment from "@/models/Assignment";

export async function GET() {
  await dbConnect();

  try {
    const assignments = await Assignment.find({}); 
    return NextResponse.json(assignments);
  } catch (error) {
    return NextResponse.json(
      { success: false },
      { status: 400 }
    );
  }
}

export async function POST(req: NextRequest) {
  await dbConnect();

  try {
    const body = await req.json();
    const assignment = await Assignment.create(body);
    return NextResponse.json(assignment, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false },
      { status: 400 }
    );
  }
}
