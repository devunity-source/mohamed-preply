import type { Message } from "../../format";
import type { landing as en } from "../en/landing";

export const landing: { [K in keyof typeof en]: Message } = {};
