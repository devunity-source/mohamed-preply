import type { Message } from "../../format";
import type { community as en } from "../en/community";

export const community: { [K in keyof typeof en]: Message } = {};
