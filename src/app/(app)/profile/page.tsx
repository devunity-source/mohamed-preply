import clsx from "clsx";
import { Check, LogOut } from "lucide-react";
import { Avatar, Button, Card, Label, PageHeader, ProgressBar } from "@/components/ui";
import { achievementsFor, listProfiles, primaryCohort, progressFor } from "@/lib/data/repo";
import { demoSignInForm, signOut } from "@/lib/auth-actions";
import { demoLoginEnabled } from "@/lib/auth/config";
import { accountEmail, currentUser } from "@/lib/session";

export const metadata = { title: "Profile" };

export default async function Profile() {
  const user = await currentUser();
  const primary = primaryCohort(user.id);
  const isStudent = primary?.role === "student";
  const progress = primary && isStudent ? progressFor(user.id, primary.cohort) : null;
  const achievements = primary && isStudent ? achievementsFor(user.id, primary.cohort) : [];

  return (
    <>
      <PageHeader eyebrow="Profile" title={user.fullName} />
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {progress && primary && (
            <Card title={primary.programme.title}>
              <p className="mb-3 text-5xl font-semibold tracking-tight">{progress.percent}%</p>
              <ProgressBar value={progress.percent} />
              <ol className="mt-6 grid gap-2 sm:grid-cols-2">
                {progress.modules.map(({ module, status }) => (
                  <li key={module.id} className="flex items-center gap-3 text-sm">
                    <span
                      className={clsx(
                        "flex size-5 shrink-0 items-center justify-center rounded-[4px]",
                        status === "done" && "bg-ink text-paper",
                        status === "in_progress" && "bg-accent",
                        status === "not_started" && "border border-line",
                      )}
                    >
                      {status === "done" && <Check size={12} strokeWidth={3} />}
                    </span>
                    <span className={clsx(status === "not_started" && "text-muted")}>{module.title}</span>
                  </li>
                ))}
              </ol>
            </Card>
          )}

          {achievements.length > 0 && (
            <Card title="Achievements">
              <ul className="grid gap-3 sm:grid-cols-2">
                {achievements.map((a) => (
                  <li
                    key={a.id}
                    className={clsx(
                      "flex items-center gap-3 rounded-md border p-3",
                      a.earned ? "border-ink" : "border-dashed border-line text-muted",
                    )}
                  >
                    <span
                      className={clsx("size-8 shrink-0 rotate-45 rounded-[4px]", a.earned ? "bg-accent" : "bg-line")}
                      aria-hidden
                    />
                    <span>
                      <span className="block text-sm font-medium">{a.label}</span>
                      <span className="block text-xs text-muted">{a.description}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card title="Portfolio and certificates">
            <p className="text-sm text-muted">
              Your capstone, graded assignments and certificates collect here once issued (Phase 3).
            </p>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <div className="flex items-center gap-4">
              <Avatar profile={user} size={56} />
              <div>
                <p className="font-semibold">{user.fullName}</p>
                <p className="font-mono text-xs text-muted">@{user.handle}</p>
              </div>
            </div>
            <p className="mt-4 text-sm">{user.headline}</p>
          </Card>

          <Card title="Account">
            <p className="text-sm">
              Signed in as <span className="font-mono">{accountEmail(user.id)}</span>
            </p>
            <form action={signOut} className="mt-4">
              <Button variant="ghost" className="w-full">
                <LogOut size={14} /> Sign out
              </Button>
            </form>
          </Card>

          {demoLoginEnabled() && (
            <Card title="Demo mode">
              <p className="mb-4 text-sm text-muted">
                Switch to another seeded account. Only available in local development (or with{" "}
                <span className="font-mono">DEMO_LOGIN=true</span>).
              </p>
              <form action={demoSignInForm} className="space-y-3">
                <select
                  name="userId"
                  defaultValue={user.id}
                  className="w-full rounded-md border border-line bg-paper px-3 py-2 text-sm"
                >
                  {listProfiles().map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.fullName} ({p.role})
                    </option>
                  ))}
                </select>
                <Button className="w-full">Switch account</Button>
              </form>
              <Label className="mt-4">Data resets when the server restarts</Label>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
