import type { Message } from "../../format";
import type { assignments as en } from "../en/assignments";

export const assignments: { [K in keyof typeof en]: Message } = {};
