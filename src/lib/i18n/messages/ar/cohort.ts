import type { Message } from "../../format";
import type { cohort as en } from "../en/cohort";

export const cohort: { [K in keyof typeof en]: Message } = {};
