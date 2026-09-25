import "server-only";
import type { MeetingProvider } from "@/lib/types";

// Meeting creation for live classes. Until provider credentials are set,
// instructors paste a meeting link by hand; with ZOOM_ACCOUNT_ID,
// ZOOM_CLIENT_ID and ZOOM_CLIENT_SECRET set, this is where the Zoom
// Server-to-Server OAuth call goes (Phase 2).

export function canCreateMeetings(provider: MeetingProvider): boolean {
  if (provider === "zoom") {
    return !!(process.env.ZOOM_ACCOUNT_ID && process.env.ZOOM_CLIENT_ID && process.env.ZOOM_CLIENT_SECRET);
  }
  return false;
}

export async function createMeeting(provider: MeetingProvider): Promise<string> {
  if (!canCreateMeetings(provider)) {
    throw new Error(`Automatic ${provider} meetings aren't configured. Paste a meeting link instead.`);
  }
  throw new Error("Zoom API integration is not implemented yet.");
}
