import type { Message } from "../../format";
import type { calendar as en } from "../en/calendar";

export const calendar: { [K in keyof typeof en]: Message } = {};
