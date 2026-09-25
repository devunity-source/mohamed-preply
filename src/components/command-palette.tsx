"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { CornerDownLeft, Search } from "lucide-react";
import { searchIndex, type SearchItem } from "@/lib/search";
import { useT } from "@/components/i18n-provider";

const OPEN_EVENT = "academe:search";
const LIMIT = 30;

/** Any button can open the palette: it just fires this event. */
export function SearchButton({ className, compact }: { className?: string; compact?: boolean }) {
  const t = useT();
  return (
    <button
      type="button"
      aria-label={t("common.search")}
      onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))}
      className={className}
    >
      <Search size={compact ? 20 : 16} />
      {!compact && (
        <>
          <span className="flex-1 text-start">{t("common.search")}</span>
          <kbd className="rounded-[4px] border border-line px-1 font-mono text-[11px]">⌘K</kbd>
        </>
      )}
    </button>
  );
}

function rank(items: SearchItem[], query: string): SearchItem[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return items.filter((i) => i.kind === "Page");
  const scored: [number, SearchItem][] = [];
  for (const item of items) {
    const label = item.label.toLowerCase();
    const hay = `${label} ${item.hint.toLowerCase()} ${item.kindLabel.toLowerCase()}`;
    if (!words.every((w) => hay.includes(w))) continue;
    let score = 0;
    if (label.startsWith(words[0])) score += 3;
    if (words.every((w) => label.includes(w))) score += 2;
    if (new RegExp(`\\b${words[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(label)) score += 1;
    scored.push([score, item]);
  }
  return scored.sort((a, b) => b[0] - a[0]).map(([, i]) => i);
}

export function CommandPalette() {
  const t = useT();
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<SearchItem[] | null>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const results = useMemo(() => rank(items ?? [], query).slice(0, LIMIT), [items, query]);

  useEffect(() => {
    function open() {
      const d = dialog.current;
      if (!d || d.open) return;
      setQuery("");
      setActive(0);
      d.showModal();
      input.current?.focus();
      // Fetched on first open, then kept for the session. Pages visited later
      // (a new class, say) show up after a reload.
      if (!items) searchIndex().then(setItems, () => setItems([]));
    }
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (dialog.current?.open) dialog.current.close();
        else open();
        return;
      }
      const t = e.target as HTMLElement | null;
      if (e.key === "/" && !t?.closest("input, textarea, select, [contenteditable=true]")) {
        e.preventDefault();
        open();
      }
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_EVENT, open);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_EVENT, open);
    };
  }, [items]);

  function go(item: SearchItem | undefined) {
    if (!item) return;
    dialog.current?.close();
    router.push(item.href);
  }

  function onInputKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const n = results.length;
      if (n) setActive((a) => (a + (e.key === "ArrowDown" ? 1 : n - 1)) % n);
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(results[active]);
    }
  }

  useEffect(() => {
    document.getElementById(`search-opt-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  return (
    <dialog
      ref={dialog}
      aria-label={t("common.search")}
      onClick={(e) => e.target === dialog.current && dialog.current?.close()}
      className="m-auto mt-[12vh] w-[min(36rem,calc(100vw-2rem))] rounded-md border border-line bg-surface p-0 text-ink shadow-2xl backdrop:bg-ink/40 print:hidden"
    >
      <div className="flex items-center gap-3 border-b border-line px-4">
        <Search size={16} className="shrink-0 text-muted" />
        <input
          ref={input}
          role="combobox"
          aria-expanded="true"
          aria-controls="search-results"
          aria-activedescendant={results.length ? `search-opt-${active}` : undefined}
          aria-autocomplete="list"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={onInputKey}
          placeholder={t("search.placeholder")}
          className="w-full bg-transparent py-3.5 text-base outline-none placeholder:text-muted focus-visible:outline-none"
        />
        <kbd className="hidden rounded-[4px] border border-line px-1 font-mono text-[11px] text-muted sm:block">
          esc
        </kbd>
      </div>
      <ul
        id="search-results"
        role="listbox"
        aria-label={t("search.results")}
        className="max-h-[50vh] overflow-y-auto p-2"
      >
        {items === null ? (
          <li className="px-3 py-6 text-center text-sm text-muted">{t("search.loading")}</li>
        ) : results.length === 0 ? (
          <li className="px-3 py-6 text-center text-sm text-muted">{t("search.noMatch", { query })}</li>
        ) : (
          results.map((item, i) => (
            <li
              key={`${item.kind}:${item.href}`}
              id={`search-opt-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseMove={() => setActive(i)}
              onClick={() => go(item)}
              className={clsx(
                "flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm",
                i === active && "bg-violet/20 text-ink",
              )}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{item.label}</span>
                {item.hint && <span className="block truncate text-xs opacity-60">{item.hint}</span>}
              </span>
              <span className="shrink-0 text-xs opacity-60">{item.kindLabel}</span>
              {i === active && <CornerDownLeft size={14} className="shrink-0 opacity-60" aria-hidden />}
            </li>
          ))
        )}
      </ul>
    </dialog>
  );
}
