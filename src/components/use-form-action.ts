"use client";

import { startTransition, useActionState, useEffect, useRef, type FormEvent } from "react";
import type { FormState } from "@/lib/actions";

/**
 * useActionState for forms, without React 19's automatic form reset.
 *
 * With `<form action={fn}>`, React clears every uncontrolled field once the
 * action finishes, even when the server rejected the input. That wipes what
 * the person typed (a post body, grading feedback) just to show an error.
 * Submitting through onSubmit keeps the fields; `resetOnSuccess` clears them
 * only when the save worked. `action` stays on the form so it still submits
 * before JavaScript loads.
 */
export function useFormAction(
  action: (prev: FormState, form: FormData) => Promise<FormState>,
  { resetOnSuccess = false }: { resetOnSuccess?: boolean } = {},
) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (resetOnSuccess && state.ok) ref.current?.reset();
  }, [state, resetOnSuccess]);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startTransition(() => formAction(data));
  }

  return { state, pending, formProps: { ref, action: formAction, onSubmit } };
}
