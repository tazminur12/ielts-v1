import { generateTest } from "../route";

export async function POST(req: Request) {
  return generateTest(req, "mock");
}

