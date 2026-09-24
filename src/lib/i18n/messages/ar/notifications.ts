import type { Message } from "../../format";
import type { notifications as en } from "../en/notifications";

export const notifications: { [K in keyof typeof en]: Message } = {
  metaTitle: "الإشعارات",
  eyebrow: "البريد الوارد",
  title: "الإشعارات",
  markAllRead: "تعليم الكل كمقروء",
  allCaughtUp: "لا جديد. اطّلعت على كل شيء.",
  phase2: "الإرسال عبر البريد والإشعارات الفورية يأتي في المرحلة الثانية.",
};
