"use client";

import { startTransition, useOptimistic } from "react";
import clsx from "clsx";
import { Check } from "lucide-react";
import { toggleLesson } from "@/lib/actions";
import { useToast } from "@/components/toast";
import { useT } from "@/components/i18n-provider";

/**
 * Flips instantly, saves in the background, and offers Undo. Without
 * JavaScript it's a plain form that posts the same action.
 */
export function LessonDoneToggle({
  lessonId,
  done,
  variant = "button",
}: {
  lessonId: string;
  done: boolean;
  variant?: "button" | "link";
}) {
  const [optimisticDone, setOptimisticDone] = useOptimistic(done);
  const toast = useToast();
  const t = useT();

  function flip(next: boolean, withUndo: boolean) {
    startTransition(async () => {
      setOptimisticDone(next);
      await toggleLesson(lessonId);
    });
    if (withUndo) {
      toast({
        message: next ? t("lessons.toastDone") : t("lessons.toastNotDone"),
        action: { label: t("lessons.undo"), onClick: () => flip(!next, false) },
      });
    }
  }

  return (
    <form
      action={toggleLesson.bind(null, lessonId)}
      onSubmit={(e) => {
        e.preventDefault();
        flip(!optimisticDone, true);
      }}
    >
      {variant === "link" ? (
        <button className="text-sm text-muted underline-offset-4 hover:text-ink hover:underline">
          {optimisticDone ? t("lessons.completedMarkNotDone") : t("lessons.markDone")}
        </button>
      ) : (
        <button
          aria-pressed={optimisticDone}
          className={clsx(
            "flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
            optimisticDone ? "border-ink bg-ink text-paper" : "border-line hover:border-ink",
          )}
        >
          {optimisticDone && <Check size={12} strokeWidth={3} />}
          {optimisticDone ? t("lessons.done") : t("lessons.markDone")}
        </button>
      )}
    </form>
  );
}
