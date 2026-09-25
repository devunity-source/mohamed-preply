import type { Message } from "../../format";
import type { verify as en } from "../en/verify";

export const verify: { [K in keyof typeof en]: Message } = {
  metaTitle: "تحقّق من شهادة",
  metaTitleId: "تحقّق من {id}",
  title: "تحقّق من شهادة",
  lead: "أدخل الرقم المطبوع أسفل شهادة AcadeMe.",
  idLabel: "رقم الشهادة",
  submit: "تحقّق",
  valid: "شهادة صالحة",
  revoked: "أُلغيت هذه الشهادة",
  notFound: "لم يُعثر على الشهادة",
  issuedOn: "أصدرتها AcadeMe في {date}.",
  revokedBody: "لم تعد صالحة. تواصل مع AcadeMe إن كانت لديك أسئلة.",
  notFoundBody: "راجع الرقم. يبدو هكذا: ACM-DEV-2026-00001.",
  period: "من {from} إلى {to}",
  about: "عن AcadeMe",
  certOfCompletion: "شهادة إتمام",
  hasCompleted: "أتمّ برنامج <b>{programme}</b>",
  print: "طباعة / حفظ بصيغة PDF",
};
