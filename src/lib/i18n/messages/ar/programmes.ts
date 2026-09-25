import type { Message } from "../../format";
import type { programmes as en } from "../en/programmes";

export const programmes: { [K in keyof typeof en]: Message } = {
  metaTitle: "البرامج",
  eyebrow: "برامجي",
  title: "البرامج",
  newProgramme: "برنامج جديد",
  cohortCode: "الدفعة {code}",
  weekPill: "الأسبوع {week}/{total}",
  statusUpcoming: "قادمة",
  statusActive: "جارية",
  statusCompleted: "مكتملة",
  dateRange: "من {start} إلى {end}",
  asInstructor: " · مدرّب",
  explore: "اكتشف البرامج",
  weeksLive: {
    one: "أسبوع واحد · دفعة مباشرة",
    two: "أسبوعان · دفعة مباشرة",
    few: "{count} أسابيع · دفعة مباشرة",
    many: "{count} أسبوعًا · دفعة مباشرة",
    other: "{count} أسبوع · دفعة مباشرة",
  },
  checkoutSoon: "الدفع عبر Stripe يأتي في المرحلة الثانية",
  enrol: "سجّل الآن",
};
