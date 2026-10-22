import type { Metadata } from "next";
import { Quiz } from "@/components/feed/Quiz";

export const metadata: Metadata = {
  title: "Quiz",
  description: "Five famous pairs who never met, and one life that caught both. Can you spot who it was?",
  alternates: { canonical: "/quiz" },
};

export default function QuizPage() {
  return <Quiz />;
}
