import { connection } from "next/server";
import { getQuiz } from "@/lib/db";

/** A fresh five-question quiz, different every time. */
export async function GET() {
  await connection();
  return Response.json(await getQuiz(), { headers: { "Cache-Control": "no-store" } });
}
