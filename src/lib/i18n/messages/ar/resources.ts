import type { Message } from "../../format";
import type { resources as en } from "../en/resources";

export const resources: { [K in keyof typeof en]: Message } = {};
