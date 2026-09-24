import type { Message } from "../../format";
import type { assignments as en } from "../en/assignments";

export const assignments: { [K in keyof typeof en]: Message } = {
  stateGraded: "مُقيَّم",
  stateSubmitted: "سُلّم",
  stateLate: "متأخر",
  stateNotSubmitted: "لم يُسلَّم",
  handedInCount: "سلّم {done} من {total}",
  allHandedIn: "سلّمت كل شيء. أحسنت.",
  handedIn: "المسلَّمة",
  dueAt: "موعد التسليم {date} · {time}",
  assignment: "الواجب",
  dueFull: "موعد التسليم {when}",
  instructions: "التعليمات",
  yourSubmission: "تسليمك",
  submittedAgo: "سلّمته {ago}. يمكنك تحديثه حتى يُقيَّم.",
  resources: "الموارد",
  submissions: "التسليمات",
  repo: "المستودع",
  openInGrading: "افتح في التقييم",
  repoUrl: "رابط المستودع",
  note: "ملاحظة لمدرّبك <muted>(اختياري)</muted>",
  submittedOk: "تم التسليم. أُبلغ مدرّبك.",
  submitting: "جارٍ التسليم…",
  update: "حدّث التسليم",
  submit: "سلّم الواجب",
  zipNote: "رفع ملفات ZIP سيتوفر مع تخزين الملفات في المرحلة الثانية.",
};
