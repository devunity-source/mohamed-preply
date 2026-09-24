import type { Message } from "../../format";
import type { nav as en } from "../en/nav";

export const nav: { [K in keyof typeof en]: Message } = {
  aWeek: "أسبوع نموذجي",
  programmes: "البرامج",
  faq: "الأسئلة الشائعة",
  signIn: "تسجيل الدخول",
  joinWaitlist: "انضم إلى قائمة الانتظار",
  footerTagline: "دفعات مباشرة لمن ينتقل إلى مجال التقنية.",
};
