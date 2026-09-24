"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui";
import { useT } from "@/components/i18n-provider";

export function PrintButton({ label }: { label?: string }) {
  const t = useT();
  return (
    <Button onClick={() => window.print()}>
      <Printer size={14} /> {label ?? t("verify.print")}
    </Button>
  );
}
