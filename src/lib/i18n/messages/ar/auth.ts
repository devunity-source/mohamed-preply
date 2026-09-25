import type { Message } from "../../format";
import type { auth as en } from "../en/auth";

export const auth: { [K in keyof typeof en]: Message } = {
  signInTitle: "تسجيل الدخول",
  signInLead: "أهلًا بعودتك. تابع من حيث توقفت.",
  linkExpired: "انتهت صلاحية هذا الرابط أو سبق استخدامه. سجّل الدخول، أو اطلب رابطًا جديدًا لإعادة التعيين.",
  forgotPassword: "نسيت كلمة المرور؟",
  notStudent: "لست طالبًا بعد؟ <link>انضم إلى قائمة الانتظار</link>",
  demoAccounts:
    "تستخدم الحسابات التجريبية <mono>handle@academe.demo</mono> مع كلمة المرور <pw>{password}</pw>، مثل ahmed@academe.demo.",
  demoMode: "الوضع التجريبي",
  demoModeBody:
    "تسجيل دخول بنقرة واحدة للتطوير المحلي. يُعطَّل تلقائيًا في بيئة الإنتاج ما لم يُضبط <mono>DEMO_LOGIN=true</mono>.",
  roleStudent: "طالب",
  roleInstructor: "مدرّب",
  roleAdmin: "مسؤول",

  email: "البريد الإلكتروني",
  password: "كلمة المرور",
  signingIn: "جارٍ تسجيل الدخول…",
  signIn: "تسجيل الدخول",

  resetTitle: "أعد تعيين كلمة المرور",
  resetLead: "سنرسل إليك رابطًا لاختيار كلمة مرور جديدة.",
  remembered: "تذكّرتها؟ <link>سجّل الدخول</link>",
  sending: "جارٍ الإرسال…",
  emailResetLink: "أرسل إليّ رابط إعادة التعيين",

  chooseMetaTitle: "اختر كلمة مرور",
  welcomeName: "أهلًا بك يا {name}",
  chooseNewTitle: "اختر كلمة مرور جديدة",
  welcomeLead: "اختر كلمة مرور لحسابك في AcadeMe. ستستخدمها مع هذا البريد من الآن فصاعدًا.",
  chooseNewLead: "اختر كلمة لم تستخدمها هنا من قبل. سيُسجَّل خروجك من الأجهزة الأخرى.",
  newPassword: "كلمة المرور الجديدة",
  newPasswordAgain: "أعد كتابة كلمة المرور الجديدة",
  passwordHint: "10 أحرف على الأقل. تصلح جملة قصيرة لذلك.",
  saving: "جارٍ الحفظ…",
  savePassword: "حفظ كلمة المرور",

  continueMetaTitle: "متابعة",
  invitedTitle: "أنت مدعو إلى AcadeMe",
  invitedLead: "تابع لاختيار كلمة المرور.",
  resetContinueLead: "تابع لاختيار كلمة مرور جديدة.",
  continue: "متابعة",

  unsubMetaTitle: "إعدادات البريد",
  unsubDoneTitle: "ألغيت اشتراكك",
  unsubDoneBody:
    "لن تصلك رسائل <strong>{kind}</strong> بعد الآن. ستظل تظهر في إشعاراتك. يمكنك تغيير رأيك في أي وقت من <link>إعدادات البريد</link>.",
  unsubConfirmTitle: "أتريد إيقاف رسائل {kind}؟",
  unsubConfirmBody: "ستظل تراها في إشعاراتك على AcadeMe.",
  unsubscribe: "إلغاء الاشتراك",
  unsubInvalidTitle: "هذا الرابط لا يعمل",
  unsubInvalidBody: "ربما نُسخ ناقصًا. يمكنك اختيار الرسائل التي تصلك من <link>إعدادات البريد</link> بعد تسجيل الدخول.",
};
