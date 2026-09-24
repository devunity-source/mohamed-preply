// Sends one real email through Resend, with the app's own sending code, to
// check the key and the sender address.
//
// Run with: npm run email:test -- you@example.com      (add `ar` for Arabic)
// (reads RESEND_API_KEY and EMAIL_FROM from .env.local)
import { deliver, sender } from "@/lib/email/send";
import { waitlistEmail } from "@/lib/email/templates";

async function main() {
  const to = process.argv[2];
  if (!to || !to.includes("@")) {
    console.error("Usage: npm run email:test -- you@example.com");
    process.exit(1);
  }
  if (!process.env.RESEND_API_KEY) {
    console.error("Set RESEND_API_KEY in .env.local first.");
    process.exit(1);
  }
  const locale = process.argv[3] === "ar" ? "ar" : "en";
  await deliver({ to, tag: "test", ...waitlistEmail("DevOps Engineer (test email)", locale) });
  console.log(`Sent from ${sender()} to ${to}. Check the inbox (and spam).`);
  if (sender().includes("resend.dev")) {
    console.log("With the test sender, Resend only delivers to your own Resend account's address.");
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
