"use client";

import { useEffect } from "react";

/** If the URL's #hash points inside a collapsed <details>, open it and scroll there. */
export function OpenOnHash() {
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    const el = id ? document.getElementById(id) : null;
    const details = el?.closest("details");
    if (el && details && !details.open) {
      details.open = true;
      el.scrollIntoView({ block: "start" });
    }
  }, []);
  return null;
}
