import type { Message } from "../../format";
import type { projects as en } from "../en/projects";

export const projects: { [K in keyof typeof en]: Message } = {
  teachEmpty: "أنت مدرّب في هذه الدفعة. أدِر الفرق من الإدارة ← المشاريع.",
  noTeam: "لم تُضَف إلى فريق لمشروع التخرج بعد. يحدّد مدرّبك الفرق قبل الأسبوع 5.",
  tickHint: "علّم المراحل عندما ينهيها فريقك.",
  allTeams: "كل الفرق · {count}",
  noTeams: "لا توجد فرق بعد.",
  you: "(أنت)",
  presentation: "العرض: ",
  notScheduled: "لم يُحدَّد موعده بعد",
  saveRepo: "احفظ المستودع",
  repository: "المستودع",
  noRepo: "لم يُربط أي مستودع بعد.",
};
