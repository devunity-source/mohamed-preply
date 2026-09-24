import type { Message } from "../../format";
import type { projects as en } from "../en/projects";

export const projects: { [K in keyof typeof en]: Message } = {};
