import type { Message } from "../../format";
import type { labs as en } from "../en/labs";

export const labs: { [K in keyof typeof en]: Message } = {};
