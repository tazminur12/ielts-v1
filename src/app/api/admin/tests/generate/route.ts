import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/mongodb";
import Test from "@/models/Test";
import Section from "@/models/Section";
import QuestionGroup from "@/models/QuestionGroup";
import Question from "@/models/Question";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Needs to be present in .env
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["admin", "super-admin"].includes(session.user?.role as string)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { module, title, topic, difficulty, accessLevel, questionCount = 5, questionTypes = ["mixed"] } = body;

    if (!module || !title) {
      return NextResponse.json({ success: false, error: "Module and Title are required" }, { status: 400 });
    }

    await dbConnect();

    // Generate prompt based on module
    let prompt = "";
    if (module === "writing") {
      prompt = `Act as an IELTS examiner and expert content creator. Generate a complete Academic Writing Practice Test.
Topic/Theme: ${topic || "General"}
Difficulty: ${difficulty || "Medium"}

Please provide the response strictly in the following JSON format without any markdown wrappers or extra text:

{
  "sectionTitle": "Writing Tasks",
  "groups": [
    {
      "title": "Task 1",
      "instruction": "You should spend about 20 minutes on this task.",
      "passage": "A description of the chart/graph/diagram problem.",
      "questions": [
        {
          "type": "essay",
          "text": "Write a report for a university lecturer describing the information shown below.",
          "marks": 1
        }
      ]
    },
    {
      "title": "Task 2",
      "instruction": "You should spend about 40 minutes on this task.",
      "passage": "",
      "questions": [
        {
          "type": "essay",
          "text": "Give reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words about the topic.",
          "marks": 1
        }
      ]
    }
  ]
}
`;
    } else if (module === "speaking") {
      prompt = `Act as an IELTS examiner. Generate a complete Speaking Practice Test.
Topic/Theme: ${topic || "General"}

Please provide strictly in the following JSON format:

{
  "sectionTitle": "Speaking Test",
  "groups": [
    {
      "title": "Part 1: Introduction and Interview",
      "instruction": "Answer the following questions about yourself.",
      "questions": [
        { "type": "short_answer", "text": "Question 1?", "marks": 1 },
        { "type": "short_answer", "text": "Question 2?", "marks": 1 }
      ]
    },
    {
      "title": "Part 2: Long Turn (Cue Card)",
      "instruction": "Describe a time when you... You should say: where it was, when it was, who you were with, and explain why you remember it so well.",
      "questions": [
        { "type": "essay", "text": "Talk about the topic on your cue card.", "marks": 1 }
      ]
    },
    {
      "title": "Part 3: Discussion",
      "instruction": "Let's discuss this topic further.",
      "questions": [
        { "type": "short_answer", "text": "Question 1?", "marks": 1 },
        { "type": "short_answer", "text": "Question 2?", "marks": 1 }
      ]
    }
  ]
}`;
    } else {
        // generic for reading/listening for now
        const typesList = Array.isArray(questionTypes) && questionTypes.length > 0 ? questionTypes.join(", ") : "mixed (multiple choice, true/false, fill in the blanks)";
        prompt = `Act as an IELTS expert. Generate one complete section for an IELTS ${module} practice test.
Topic: ${topic || "History"}
Difficulty: ${difficulty || "Medium"}

Requirements:
- Create exactly ${questionCount} questions in total.
- Use the following question types: ${typesList}.
- If the types require different instruction sets, split them into appropriate "groups". For example, use one group for multiple choice and another for true/false.
- Provide a reading/listening passage as context for the questions.

Please provide strictly in the following JSON format without any markdown wrappers or extra text:

{
  "sectionTitle": "${module} Passage 1",
  "groups": [
    {
      "title": "Questions 1-3",
      "instruction": "Choose the correct letter A, B, C, or D.",
      "passage": "Write a well-structured essay/passage about the topic.",
      "questions": [
        {
          "type": "multiple_choice",
          "text": "What is the main idea of the first paragraph?",
          "options": ["A", "B", "C", "D"],
          "correctAnswer": "A",
          "marks": 1
        }
      ]
    }
  ]
}`;
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // fallback to gpt-4o or gpt-3.5-turbo based on premium key
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" }
    });

    const responseContent = completion.choices[0].message.content;
    let aiData;
    if (responseContent) {
      aiData = JSON.parse(responseContent);
    } else {
      throw new Error("Empty response from AI");
    }

    // 1. Create Test
    // Create a unique slug for the test
    const baseSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
    const uniqueSlug = `${baseSlug}-${Date.now().toString().slice(-6)}`;
    
    const newTest = await Test.create({
      title: title,
      slug: uniqueSlug,
      examType: "practice",
      module: module,
      accessLevel: accessLevel || "free",
      status: "draft",
      difficulty: difficulty || "medium",
      duration: module === "writing" ? 60 : (module === "speaking" ? 15 : 40),
      totalQuestions: 0, 
      createdBy: session.user.id || "000000000000000000000000",
    });

    let totalQuestions = 0;

    // 2. Create Section
    const newSection = await Section.create({
      testId: newTest._id,
      title: aiData.sectionTitle || "Section 1",
      order: 1,
      sectionType: module === "writing" ? "writing_task" : module === "speaking" ? "speaking_part" : module === "reading" ? "reading_passage" : "listening_part",
      instructions: "Read the instructions carefully.",
      passageText: aiData.groups?.[0]?.passage || "",
      totalQuestions: 0
    });

    // 3. Create Groups and Questions
    if (aiData.groups && Array.isArray(aiData.groups)) {
      for (let i = 0; i < aiData.groups.length; i++) {
         const groupData = aiData.groups[i];

         const newGroup = await QuestionGroup.create({
            sectionId: newSection._id,
            testId: newTest._id,
            title: groupData.title,
            instructions: groupData.instruction || "",
            order: i + 1,
            questionType: groupData.questions?.[0]?.type || "short_answer",
            questionNumberStart: totalQuestions + 1,
            questionNumberEnd: totalQuestions + (groupData.questions?.length || 1),
         });

         if (groupData.questions && Array.isArray(groupData.questions)) {
            for (let j = 0; j < groupData.questions.length; j++) {
               const qData = groupData.questions[j];
               
               const formattedOptions = (qData.options || []).map((opt: any, index: number) => {
                  if (typeof opt === 'object' && opt.label && opt.text) {
                     return opt;
                  }
                  const textStr = String(opt);
                  const match = textStr.match(/^([A-Z])[\)\.]?\s*(.*)$/i);
                  if (match) {
                     return { label: match[1].toUpperCase(), text: match[2].trim() || textStr };
                  }
                  return { label: String.fromCharCode(65 + index), text: textStr };
               });
               
               await Question.create({
                  testId: newTest._id,
                  sectionId: newSection._id,
                  groupId: newGroup._id,
                  questionText: qData.text,
                  questionType: qData.type || "short_answer",
                  questionNumber: totalQuestions + 1,
                  options: formattedOptions,
                  correctAnswer: qData.correctAnswer || "",
                  marks: qData.marks || 1,
                  order: j + 1
               });
               totalQuestions += 1;
            }
         }
      }
    }

    newTest.totalQuestions = totalQuestions;
    await newTest.save();

    return NextResponse.json({
      success: true,
      message: "Test generated successfully!",
      testId: newTest._id
    });

  } catch (error: any) {
    console.error("AI Gen Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}