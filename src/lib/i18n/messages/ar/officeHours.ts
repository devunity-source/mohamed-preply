import type { Message } from "../../format";
import type { officeHours as en } from "../en/officeHours";

export const officeHours: { [K in keyof typeof en]: Message } = {};
