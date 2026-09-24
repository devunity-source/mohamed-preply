import type { Message } from "../../format";
import type { teaching as en } from "../en/teaching";

export const teaching: { [K in keyof typeof en]: Message } = {};
