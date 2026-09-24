import type { Message } from "../../format";
import type { classes as en } from "../en/classes";

export const classes: { [K in keyof typeof en]: Message } = {};
