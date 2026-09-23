"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui";

export function PrintButton({ label = "Print / Save as PDF" }: { label?: string }) {
  return (
    <Button onClick={() => window.print()}>
      <Printer size={14} /> {label}
    </Button>
  );
}
