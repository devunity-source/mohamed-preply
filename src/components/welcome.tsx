import { BookOpen, FlaskConical, MessagesSquare, ShieldCheck, Video } from "lucide-react";
import { dismissWelcome } from "@/lib/actions";
import { SubmitButton } from "@/components/submit-button";
import { ButtonLink } from "@/components/ui";

const STUDENT = [
  { icon: BookOpen, text: "Each week is one module: a few short lessons to read, then a live class to go deeper." },
  {
    icon: FlaskConical,
    text: "Labs and assignments are the practice. Your instructor reviews them and gives feedback.",
  },
  { icon: MessagesSquare, text: "Stuck? Ask in your cohort's community space. Someone has usually hit the same wall." },
];

const STAFF = [
  { icon: Video, text: "Your cohorts, classes and calendar work the same way students see them." },
  { icon: ShieldCheck, text: "Grading, lab reviews, attendance and class scheduling live under Admin." },
  { icon: MessagesSquare, text: "You can pin, lock and moderate posts in the spaces you teach." },
];

/** Shown on the dashboard until dismissed. Server-rendered, so it works without JavaScript. */
export function Welcome({ firstName, staff, startHref }: { firstName: string; staff: boolean; startHref?: string }) {
  return (
    <section aria-labelledby="welcome-title" className="mb-8 rounded-md border border-ink bg-surface p-6 md:p-8">
      <h2 id="welcome-title" className="text-xl font-semibold tracking-tight">
        Welcome to AcadeMe, {firstName}
      </h2>
      <p className="mt-1 text-sm text-muted">How it works, in three lines.</p>
      <ol className="mt-5 grid gap-4 md:grid-cols-3">
        {(staff ? STAFF : STUDENT).map(({ icon: Icon, text }, i) => (
          <li key={i} className="flex gap-3 text-sm">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-ink text-paper">
              <Icon size={16} />
            </span>
            <span>{text}</span>
          </li>
        ))}
      </ol>
      <form action={dismissWelcome} className="mt-6 flex flex-wrap gap-3">
        {startHref && <ButtonLink href={startHref}>{staff ? "Open admin" : "Start this week's lessons"}</ButtonLink>}
        <SubmitButton variant="ghost">Got it</SubmitButton>
      </form>
    </section>
  );
}
