import type { Message } from "../../format";
import type { notifications as en } from "../en/notifications";

export const notifications: { [K in keyof typeof en]: Message } = {};
