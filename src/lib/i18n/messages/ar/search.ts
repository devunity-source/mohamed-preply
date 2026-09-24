import type { Message } from "../../format";
import type { search as en } from "../en/search";

export const search: { [K in keyof typeof en]: Message } = {};
