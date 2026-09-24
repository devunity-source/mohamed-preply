import type { Message } from "../../format";
import type { notify as en } from "../en/notify";

export const notify: { [K in keyof typeof en]: Message } = {
  mentioned: "أشار إليك {name} في «{where}»",
  commented: "علّق {name} على «{title}»",
  submitted: "سلّم {name} «{title}»",
  officeMessage: "الساعات المكتبية: أرسل إليك {name} رسالة",
  officeReply: "ردّ {name} على رسالتك في الساعات المكتبية",
  graded: "واجبك «{title}»: {grade}/100",
  regraded: "تحديث درجة واجبك «{title}»: {grade}/100",
  reminder: "تذكير: لم يُسلَّم «{title}» بعد",
  labPassed: "اجتزت المختبر رقم {number}",
  labReturned: "أُعيد إليك المختبر رقم {number}. راجع الأهداف وأعد التسليم.",
  certificate: "شهادتك في {programme} جاهزة",
  teaching: "أنت مدرّب {cohort} (الدفعة {code})",
  welcome: "مرحبًا بك في {cohort}",
};
