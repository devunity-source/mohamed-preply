import type { Message } from "../../format";
import type { certificate as en } from "../en/certificate";

export const certificate: { [K in keyof typeof en]: Message } = {};
