"use client";

import { CheckCheck } from "lucide-react";
import { buttonClass } from "@/components/ui";

/**
 * Attendance starts blank so nobody is marked present by accident. This fills
 * every student still unmarked with the given value, leaving explicit
 * choices (late, absent) alone.
 */
export function MarkRemaining({ value, label }: { value: string; label: string }) {
  return (
    <button
      type="button"
      className={buttonClass("ghost")}
      onClick={(e) => {
        const form = e.currentTarget.form;
        if (!form) return;
        const names = new Set(
          [...form.querySelectorAll<HTMLInputElement>("input[type=radio][name^='att:']")].map((r) => r.name),
        );
        for (const name of names) {
          if (form.querySelector(`input[name="${CSS.escape(name)}"]:checked`)) continue;
          const radio = form.querySelector<HTMLInputElement>(`input[name="${CSS.escape(name)}"][value="${value}"]`);
          if (radio) radio.checked = true;
        }
      }}
    >
      <CheckCheck size={14} /> {label}
    </button>
  );
}
