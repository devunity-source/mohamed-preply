import type { Message } from "../../format";
import type { labs as en } from "../en/labs";

export const labs: { [K in keyof typeof en]: Message } = {
  statusNotStarted: "لم يبدأ",
  statusInProgress: "قيد التنفيذ",
  statusSubmitted: "سُلّم",
  statusPassed: "معتمد",
  overdue: "متأخر",
  allSubmitted: "سلّمت جميع المختبرات. أحسنت.",
  completed: "المكتملة",
  labNumber: "المختبر رقم {number}",
  difficulty: "الصعوبة",
  difficultyOf: "{level} من 5",
  estMinutes: {
    one: "نحو دقيقة واحدة",
    two: "نحو دقيقتين",
    few: "نحو {count} دقائق",
    many: "نحو {count} دقيقة",
    other: "نحو {count} دقيقة",
  },
  due: "موعد التسليم",
  starting: "جارٍ البدء…",
  start: "شغّل بيئة المختبر",
  submitting: "جارٍ التسليم…",
  submit: "سلّم المختبر",
  sandboxNote: "ستتوفر بيئات سحابية معزولة في مرحلة لاحقة. استخدم اشتراكك الخاص حاليًا.",
  submitNote: "سلّم بعد أن يعمل كل هدف من البداية إلى النهاية.",
};
