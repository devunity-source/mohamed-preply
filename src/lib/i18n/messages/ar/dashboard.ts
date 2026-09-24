import type { Message } from "../../format";
import type { dashboard as en } from "../en/dashboard";

export const dashboard: { [K in keyof typeof en]: Message } = {};
