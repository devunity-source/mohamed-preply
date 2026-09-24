import type { Message } from "../../format";
import type { profile as en } from "../en/profile";

export const profile: { [K in keyof typeof en]: Message } = {};
