import type { Message } from "../../format";
import type { verify as en } from "../en/verify";

export const verify: { [K in keyof typeof en]: Message } = {};
