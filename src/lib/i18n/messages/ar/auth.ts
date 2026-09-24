import type { Message } from "../../format";
import type { auth as en } from "../en/auth";

export const auth: { [K in keyof typeof en]: Message } = {};
