import type { Message } from "../../format";
import type { errors as en } from "../en/errors";

export const errors: { [K in keyof typeof en]: Message } = {};
