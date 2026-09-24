"use client";

import { useFormStatus } from "react-dom";
import clsx from "clsx";
import { LoaderCircle } from "lucide-react";
import { buttonClass, type ButtonVariant } from "@/components/ui";

/**
 * A submit button that knows when its form's server action is running:
 * disabled, aria-busy and a spinner, so a slow round trip never looks like a
 * dead click (and can't be double-submitted). `unstyled` keeps the caller's
 * classes for custom buttons such as icon or pill buttons.
 */
export function SubmitButton({
  children,
  variant = "primary",
  unstyled,
  pendingLabel,
  className,
  ...props
}: Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "type"> & {
  variant?: ButtonVariant;
  unstyled?: boolean;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      {...props}
      type="submit"
      disabled={pending || props.disabled}
      aria-busy={pending || undefined}
      className={clsx(
        unstyled ? className : buttonClass(variant, className),
        pending && "cursor-wait",
        unstyled && pending && "opacity-60",
      )}
    >
      {pending && !unstyled && <LoaderCircle size={14} className="animate-spin" aria-hidden />}
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  );
}
