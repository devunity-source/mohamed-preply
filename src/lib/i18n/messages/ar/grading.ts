import type { Message } from "../../format";
import type { grading as en } from "../en/grading";

export const grading: { [K in keyof typeof en]: Message } = {};
