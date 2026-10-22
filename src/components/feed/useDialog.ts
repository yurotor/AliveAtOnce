import { useEffect, useRef } from "react";

const FOCUSABLE = ["a[href]", "button:not([disabled])", "input:not([disabled])", "[tabindex]"].map((s) => `${s}:not([tabindex="-1"])`).join(", ");

/**
 * Modal behaviour for the share sheet and the menu: focus moves in on open,
 * Tab stays inside, Escape closes, and focus goes back to whatever opened it.
 */
export function useDialog<T extends HTMLElement>(onClose: () => void) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const box = ref.current;
    const items = () => [...(box?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])].filter((el) => el.offsetParent !== null);
    const start = box?.querySelector<HTMLElement>("[data-autofocus]") ?? items()[0];
    start?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return onClose();
      if (e.key !== "Tab") return;
      const all = items();
      if (!all.length) return;
      const first = all[0], last = all[all.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      opener?.focus?.();
    };
  }, [onClose]);
  return ref;
}
