import type { Message } from "../../format";
import type { lessons as en } from "../en/lessons";

export const lessons: { [K in keyof typeof en]: Message } = {};
