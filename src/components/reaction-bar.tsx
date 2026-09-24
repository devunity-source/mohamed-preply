"use client";

import { startTransition, useOptimistic } from "react";
import clsx from "clsx";
import { toggleReaction } from "@/lib/actions";

const EMOJI = ["👍", "🔥", "🎉", "💡", "❤️"];

type R = { emoji: string; count: number; mine: boolean };

/** Reactions update the moment you click; the server catches up in the background. */
export function ReactionBar({ postId, reactions }: { postId: string; reactions: R[] }) {
  const [current, toggle] = useOptimistic(reactions, (state: R[], emoji: string) => {
    const r = state.find((x) => x.emoji === emoji);
    if (!r) return [...state, { emoji, count: 1, mine: true }];
    return state.map((x) => (x.emoji === emoji ? { ...x, mine: !x.mine, count: x.count + (x.mine ? -1 : 1) } : x));
  });

  return (
    <div className="mt-6 flex flex-wrap gap-2">
      {EMOJI.map((e) => {
        const r = current.find((x) => x.emoji === e);
        return (
          <form
            key={e}
            action={toggleReaction.bind(null, postId, e)}
            onSubmit={(ev) => {
              ev.preventDefault();
              startTransition(async () => {
                toggle(e);
                await toggleReaction(postId, e);
              });
            }}
          >
            <button
              aria-pressed={!!r?.mine}
              aria-label={`React ${e}${r?.count ? `, ${r.count}` : ""}`}
              className={clsx(
                "rounded-md border px-2.5 py-1 font-mono text-sm transition-colors",
                r?.mine ? "border-accent bg-accent/10" : "border-line hover:border-ink",
              )}
            >
              {e} {r && r.count > 0 ? r.count : ""}
            </button>
          </form>
        );
      })}
    </div>
  );
}
