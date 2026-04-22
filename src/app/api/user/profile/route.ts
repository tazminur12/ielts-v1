import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";

function normalizePassportName(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  const raw = String(value).trim();
  if (!raw) return "";
  // Keep letters, spaces, comma, apostrophe, hyphen.
  const cleaned = raw
    .replace(/\s+/g, " ")
    .toUpperCase()
    .replace(/[^A-Z ,'-]/g, "");
  return cleaned;
}

// GET user profile
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    await dbConnect();

    const user = await User.findById(session.user.id)
      .select("-password")
      .lean();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: user,
    });
  } catch (error: any) {
    console.error("Error fetching profile:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch profile" },
      { status: 500 }
    );
  }
}

// PUT update user profile
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    await dbConnect();

    const body = await req.json();
    const {
      name,
      phone,
      location,
      bio,
      targetScore,
      nextExamDate,
      dateOfBirth,
      gender,
      nationality,
      firstLanguage,
      image,
      passportName,
      timeZone,
      preferredExamType,
      targetTestDate,
      practiceReason,
      hasIeltsScore,
      ieltsScore,
      country,
      currency,
      acceptedTerms,
      onboardingCompletedAt,
      completeOnboarding,
    } = body;

    const updateData: any = {};
    if (name) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (location !== undefined) updateData.location = location;
    if (bio !== undefined) updateData.bio = bio;
    if (targetScore !== undefined) updateData.targetScore = targetScore;
    if (nextExamDate !== undefined) updateData.nextExamDate = nextExamDate;
    if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth;
    if (gender !== undefined) updateData.gender = gender;
    if (nationality !== undefined) updateData.nationality = nationality;
    if (firstLanguage !== undefined) updateData.firstLanguage = firstLanguage;
    if (image !== undefined) updateData.image = image;
    if (passportName !== undefined) {
      const normalized = normalizePassportName(passportName);
      if (normalized !== undefined) {
        // Empty string clears it.
        if (normalized.length > 80) {
          return NextResponse.json(
            { success: false, error: "Passport name is too long" },
            { status: 400 }
          );
        }
        // If not empty, require at least one letter.
        if (normalized && !/[A-Z]/.test(normalized)) {
          return NextResponse.json(
            { success: false, error: "Passport name must contain letters" },
            { status: 400 }
          );
        }
        updateData.passportName = normalized;
      }
    }
    if (timeZone !== undefined) updateData.timeZone = timeZone;
    if (preferredExamType !== undefined) updateData.preferredExamType = preferredExamType;
    if (targetTestDate !== undefined) updateData.targetTestDate = targetTestDate;

    const allowedReasons = new Set(["study_abroad", "immigration", "job_requirements", "other"]);
    if (practiceReason !== undefined) {
      if (practiceReason === null || practiceReason === "") {
        updateData.practiceReason = undefined;
      } else if (!allowedReasons.has(String(practiceReason))) {
        return NextResponse.json(
          { success: false, error: "Invalid practice reason" },
          { status: 400 }
        );
      } else {
        updateData.practiceReason = practiceReason;
      }
    }

    if (hasIeltsScore !== undefined) updateData.hasIeltsScore = Boolean(hasIeltsScore);

    if (ieltsScore !== undefined) {
      const raw = String(ieltsScore).trim();
      if (!raw) {
        updateData.ieltsScore = "";
      } else {
        const n = Number(raw);
        if (!Number.isFinite(n) || n < 0 || n > 9) {
          return NextResponse.json(
            { success: false, error: "IELTS score must be between 0 and 9" },
            { status: 400 }
          );
        }
        // keep one decimal when needed, e.g. 6.5
        updateData.ieltsScore = n % 1 === 0 ? n.toFixed(1) : raw;
      }
    }

    if (country !== undefined) updateData.country = String(country ?? "").trim();
    if (currency !== undefined) updateData.currency = String(currency ?? "").trim();
    if (acceptedTerms !== undefined) updateData.acceptedTerms = Boolean(acceptedTerms);

    // Allow onboarding page to finalize completion timestamp.
    if (onboardingCompletedAt !== undefined) {
      updateData.onboardingCompletedAt = onboardingCompletedAt ? new Date(onboardingCompletedAt) : null;
    }

    if (completeOnboarding === true) {
      if (acceptedTerms !== undefined && !Boolean(acceptedTerms)) {
        return NextResponse.json(
          { success: false, error: "You must accept Terms to finish onboarding" },
          { status: 400 }
        );
      }
      updateData.onboardingCompletedAt = new Date();
    }

    const updateRes = await User.updateOne(
      { _id: session.user.id },
      { $set: updateData }
    );

    if (updateRes.matchedCount === 0) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    const updatedUser = await User.findById(session.user.id)
      .select("-password")
      .lean();

    return NextResponse.json({
      success: true,
      data: updatedUser,
      message: "Profile updated successfully",
    });
  } catch (error: any) {
    console.error("Error updating profile:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update profile" },
      { status: 500 }
    );
  }
}
