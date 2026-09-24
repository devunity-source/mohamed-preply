import type { Message } from "../../format";
import type { admin as en } from "../en/admin";

export const admin: { [K in keyof typeof en]: Message } = {};
