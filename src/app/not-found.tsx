import Link from "next/link";
import { Logo } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <Logo className="size-10 text-ink" />
      <h1 className="text-3xl font-semibold tracking-tight">Not found</h1>
      <p className="text-muted">That page doesn&apos;t exist, or you don&apos;t have access to it.</p>
      <Link href="/dashboard" className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper hover:bg-accent">
        Back to dashboard
      </Link>
    </div>
  );
}
