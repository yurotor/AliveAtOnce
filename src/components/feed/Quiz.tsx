"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { track } from "@vercel/analytics";
import type { Person, QuizQuestion } from "@/lib/db";
import { labelName, shortName } from "@/lib/headline";
import { yearPart } from "@/lib/life";
import { portraitSources } from "@/lib/photo";
import { factPath, lifeYears, moments, plainHeadline, SITE_URL } from "@/lib/present";
import { CARD, cssUnit, Faces, Portrait, PORTRAIT_SIZES, pxUnit } from "../CardArt";
import { CloseIcon, ShareIcon } from "./icons";

const FONTS = { display: "var(--font-gloock), Georgia, serif", body: "var(--font-hanken), system-ui, sans-serif" };
const OPTION_U = pxUnit(0.14); // a 400u portrait → 56px

/** Score → verdict, from 5 down to 0. */
const VERDICTS: [title: string, quip: string][] = [
  ["Certified genius", "Five for five. Are you a time traveller?"],
  ["Time lord", "One slip. History bows anyway."],
  ["Sharp cookie", "More right than wrong, and that counts."],
  ["Time tourist", "You visited history. You didn’t stay long."],
  ["Lovable dummy", "One! Was it a guess? It was a guess."],
  ["Total dummy", "Zero. Impressive, in its own way."],
];
const verdict = (score: number, total: number) => VERDICTS[Math.round((1 - score / total) * (VERDICTS.length - 1))];

function preload(people: Person[]) {
  for (const p of people) {
    if (!p.photo) continue;
    const img = new Image();
    const { src, srcSet } = portraitSources(p.photo);
    img.sizes = PORTRAIT_SIZES;
    img.srcset = srcSet;
    img.src = src;
  }
}

/** Why a wrong pick can't be the bridge: born too late, or died too soon. */
function whyNot(p: Person, q: QuizQuestion) {
  const { early, late } = q.fact;
  return p.bLo > early.dHi!
    ? `${shortName(p)} was born in ${yearPart(p.bornLabel)}, after ${shortName(early)} died.`
    : `${shortName(p)} died in ${yearPart(p.diedLabel!)}, before ${shortName(late)} was born.`;
}

/**
 * Five bridges from the feed with the middle face hidden: pick who it was out
 * of four. The wrong options are near misses (see getQuiz).
 */
export function Quiz() {
  const [questions, setQuestions] = useState<QuizQuestion[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const next = useRef<HTMLButtonElement>(null);

  const load = useCallback(() => {
    fetch("/api/quiz", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.statusText))))
      .then((qs: QuizQuestion[]) => {
        if (!qs.length) throw new Error("no questions");
        setQuestions(qs);
      })
      .catch(() => setFailed(true));
  }, []);
  useEffect(load, [load]);
  const start = useCallback(() => {
    setQuestions(null);
    setFailed(false);
    setI(0);
    setPicked(null);
    setAnswers([]);
    load();
  }, [load]);

  const q = questions?.[i];
  const finished = !!questions && i >= questions.length;
  const score = answers.filter(Boolean).length;

  // Load the next question's faces while this one is being answered.
  useEffect(() => {
    const n = questions?.[i + 1];
    if (questions?.[i]) preload([questions[i].fact.early, questions[i].fact.late, ...questions[i].options]);
    if (n) preload([n.fact.early, n.fact.late, ...n.options]);
  }, [questions, i]);

  const pick = useCallback((p: Person) => {
    if (!q || picked) return;
    setPicked(p.id);
    setAnswers((a) => [...a, p.id === q.fact.bridge.id]);
  }, [q, picked]);

  const advance = useCallback(() => {
    if (!questions) return;
    setPicked(null);
    setI((n) => n + 1);
    if (i + 1 >= questions.length) track("quiz_done", { score: answers.filter(Boolean).length });
  }, [questions, i, answers]);

  useEffect(() => {
    if (picked) next.current?.focus();
  }, [picked]);

  // 1–4 to answer.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!q || picked || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = Number(e.key);
      if (k >= 1 && k <= q.options.length) pick(q.options[k - 1]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [q, picked, pick]);

  async function share() {
    const [title] = verdict(score, questions!.length);
    const text = `I got ${score}/${questions!.length} on the Alive At Once quiz: ${title}. Can you beat that?`;
    const url = `${SITE_URL}/quiz`;
    track("share", { target: "quiz", score });
    if (navigator.share) {
      try { await navigator.share({ text, url }); } catch {}
      return;
    }
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      setToast("Copied, paste it anywhere");
    } catch {
      setToast(url);
    }
    setTimeout(() => setToast(null), 2200);
  }

  const pill = "flex h-11 items-center justify-center gap-2 rounded-full border border-rule px-5 text-sm font-medium transition hover:border-ink";
  const primary = "flex h-11 items-center justify-center gap-2 rounded-full bg-ink px-6 text-sm font-medium text-paper transition hover:opacity-90";

  return (
    <div
      className="theme-dark fixed inset-0 flex flex-col bg-paper text-ink"
      style={{
        "--cw": "min(calc(100vw - 32px), 560px, max(260px, calc((100dvh - 470px) * 1.25)))",
        "--u": "calc(var(--cw) / 1000)",
      } as CSSProperties}
    >
      <header className="relative z-10 flex h-14 shrink-0 items-center justify-between border-b border-rule/40 px-4">
        <Link href="/" className="font-display text-xl">Alive At Once</Link>
        {questions && !finished && (
          <span className="absolute left-1/2 -translate-x-1/2 text-sm text-muted tabular-nums max-[420px]:hidden">
            {i + 1} of {questions.length}
          </span>
        )}
        <Link href="/" aria-label="Close quiz" className="-mr-2 flex h-11 w-11 items-center justify-center rounded-full text-muted hover:bg-paper-2 hover:text-ink">
          <CloseIcon />
        </Link>
      </header>

      {questions && !finished && (
        <ol className="flex shrink-0 gap-1 px-4 pt-3" aria-label={`Question ${i + 1} of ${questions.length}`}>
          {questions.map((_, k) => (
            <li
              key={k}
              className={`h-1 flex-1 rounded-full ${
                k < answers.length ? (answers[k] ? "bg-bridge" : "bg-future") : k === i ? "bg-ink/60" : "bg-rule"
              }`}
            />
          ))}
        </ol>
      )}

      <main className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        {failed && (
          <div className="m-auto text-center">
            <p className="font-display text-2xl">History didn’t load.</p>
            <button type="button" className={`${pill} mx-auto mt-4`} onClick={start}>Try again</button>
          </div>
        )}
        {!questions && !failed && <p className="m-auto text-muted" role="status">Shuffling history…</p>}

        {q && (
          <div key={q.fact.slug} className="fade-up flex w-full max-w-xl flex-col items-center">
            <div className="mt-4 w-[var(--cw)] shrink-0">
              {/* Re-mounts on reveal, so the lifeline draws again through the real face. */}
              <Faces key={String(!!picked)} fact={q.fact} u={cssUnit} fonts={FONTS} live mystery={!picked} />
            </div>
            <h1 className="mt-2 text-balance text-center font-display text-2xl leading-tight sm:text-3xl">
              Who caught both {shortName(q.fact.early)} <em className="pr-[0.08em] text-bridge">and</em> {shortName(q.fact.late)}?
            </h1>
            <p className="mt-2 text-balance text-center text-sm text-muted">
              Alive when {shortName(q.fact.early)} died in {moments(q.fact).earlyDied.year}, and still alive when{" "}
              {shortName(q.fact.late)} was born in {moments(q.fact).lateBorn.year}.
            </p>

            <div className="mt-5 grid w-full grid-cols-2 gap-2 sm:gap-3">
              {q.options.map((p, k) => {
                const right = p.id === q.fact.bridge.id;
                const state = !picked ? "idle" : right ? "right" : p.id === picked ? "wrong" : "other";
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => pick(p)}
                    disabled={!!picked}
                    aria-keyshortcuts={String(k + 1)}
                    className={`flex min-h-[4.5rem] items-center gap-3 rounded-2xl border p-2 pr-3 text-left transition ${
                      state === "idle" ? "border-rule hover:border-ink hover:bg-paper-2"
                        : state === "right" ? "border-bridge bg-bridge/15"
                          : state === "wrong" ? "border-future bg-future/10"
                            : "border-rule opacity-50"
                    }`}
                  >
                    <span className="shrink-0">
                      <Portrait person={p} size={400} u={OPTION_U} live ring={state === "right" ? CARD.bridge : state === "wrong" ? CARD.future : CARD.ring} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium leading-tight sm:text-base">{labelName(p)}</span>
                      {picked && <span className="mt-0.5 block text-xs text-muted tabular-nums">{lifeYears(p)}</span>}
                    </span>
                  </button>
                );
              })}
            </div>

            {picked && (
              <div className="fade-up mt-5 flex w-full flex-col items-center text-center" aria-live="polite">
                <p className="font-display text-2xl">
                  {answers[i] ? <span className="text-bridge">Right.</span> : <><span className="text-future">Not quite.</span> It was {shortName(q.fact.bridge)}.</>}
                </p>
                <p className="mt-1 text-balance text-sm text-muted">
                  {answers[i]
                    ? `${moments(q.fact).earlyDied.fact} ${moments(q.fact).lateBorn.fact}`
                    : whyNot(q.options.find((p) => p.id === picked)!, q)}
                </p>
                <button ref={next} type="button" className={`${primary} mt-4`} onClick={advance}>
                  {i + 1 < questions!.length ? "Next question" : "See your score"}
                </button>
              </div>
            )}
          </div>
        )}

        {finished && (
          <Result
            score={score}
            questions={questions!}
            answers={answers}
            onAgain={start}
            onShare={share}
            pill={pill}
            primary={primary}
          />
        )}
      </main>

      {toast && (
        <p role="status" className="fade-up absolute inset-x-0 top-20 z-50 flex justify-center">
          <span className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper shadow-lg">{toast}</span>
        </p>
      )}
    </div>
  );
}

function Result({ score, questions, answers, onAgain, onShare, pill, primary }: {
  score: number; questions: QuizQuestion[]; answers: boolean[]; onAgain: () => void; onShare: () => void; pill: string; primary: string;
}) {
  const [title, quip] = verdict(score, questions.length);
  return (
    <div className="fade-up my-auto flex w-full max-w-md flex-col items-center py-8 text-center">
      <p className="text-sm uppercase tracking-[0.12em] text-muted">You got</p>
      <p className="mt-2 font-display text-8xl leading-none tabular-nums">
        {score}<span className="ml-3 text-4xl text-muted">out of <span className="ml-[0.15em]">{questions.length}</span></span>
      </p>
      <h1 className="mt-4 font-display text-4xl italic text-bridge">{title}</h1>
      <p className="mt-2 text-muted">{quip}</p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <button type="button" className={primary} onClick={onAgain} autoFocus>Play again</button>
        <button type="button" className={pill} onClick={onShare}><ShareIcon className="h-5 w-5" /> Share score</button>
      </div>
      <ol className="mt-8 w-full divide-y divide-rule/60 border-y border-rule/60 text-left text-sm">
        {questions.map((q, k) => (
          <li key={q.fact.slug}>
            <Link href={factPath(q.fact)} className="flex items-baseline gap-3 py-2.5 hover:text-bridge">
              <span className={answers[k] ? "text-bridge" : "text-future"} aria-label={answers[k] ? "Right" : "Wrong"}>
                {answers[k] ? "✓" : "✗"}
              </span>
              <span>{plainHeadline(q.fact)}</span>
            </Link>
          </li>
        ))}
      </ol>
      <Link href="/" className="mt-6 text-sm text-muted underline hover:text-ink">Back to the bridges</Link>
    </div>
  );
}
