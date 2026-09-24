"use client";

import { useEffect } from "react";
import { markSpaceSeen } from "@/lib/actions";

export function MarkSpaceSeen({ slug }: { slug: string }) {
  useEffect(() => {
    void markSpaceSeen(slug);
  }, [slug]);
  return null;
}
