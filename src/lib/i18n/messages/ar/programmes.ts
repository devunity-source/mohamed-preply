import type { Message } from "../../format";
import type { programmes as en } from "../en/programmes";

export const programmes: { [K in keyof typeof en]: Message } = {};
