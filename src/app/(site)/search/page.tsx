import type { Metadata } from "next";
import { Search } from "@/components/Search";

export const metadata: Metadata = {
  title: "Find a person",
  description: "Search 50,000 famous people and see whose lifetimes overlapped with theirs.",
};

export default function SearchPage() {
  return (
    <section className="pt-10 sm:pt-16 min-h-[50vh]">
      <h1 className="font-display text-4xl sm:text-5xl mb-3">Find a person</h1>
      <p className="text-muted mb-8 max-w-prose">
        See who was already alive when they were born, and who was born during their lifetime.
      </p>
      <div className="max-w-xl">
        <Search autoFocus />
      </div>
    </section>
  );
}
