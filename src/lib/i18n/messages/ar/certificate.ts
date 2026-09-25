import type { Message } from "../../format";
import type { certificate as en } from "../en/certificate";

export const certificate: { [K in keyof typeof en]: Message } = {
  period: "من {start} إلى {end}",
  studentName: "اسم الطالب",
  preview: "معاينة",
  revoked: "ملغاة",
  yourCertificate: "شهادتك",
  issued: "صدرت في {date}",
  shareNote: "شارك رابط التحقّق في سيرتك الذاتية أو على LinkedIn. يستطيع أي شخص التحقّق منه دون تسجيل الدخول.",
  print: "اطبع / احفظ بصيغة PDF",
  howToEarn: "كيف تحصل عليها",
  earnLessons: "أكمل كل الدروس",
  earnSubmit: "سلّم كل المختبرات والواجبات",
  earnCapstone: "اعرض مشروع التخرج",
  percentComplete: "مكتمل بنسبة {percent}%",
  revokedNote: "أُلغيت هذه الشهادة. تواصل مع الأكاديمية إن كنت تظن أن ذلك خطأ.",
  issueNote: "عندما تنهي البرنامج، تصدر الأكاديمية شهادتك مع رابط تحقّق عام.",
};
