import type { Message } from "../../format";
import type { curriculum as en } from "../en/curriculum";

export const curriculum: { [K in keyof typeof en]: Message } = {};
