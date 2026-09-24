import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Kufi_Arabic } from "next/font/google";
import { I18nProvider } from "@/components/i18n-provider";
import { getI18n } from "@/lib/i18n/server";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
// Only downloaded when a page has Arabic text in it. No metric fallback face:
// it would have no unicode range and catch Latin text before Geist.
const arabic = Noto_Kufi_Arabic({
  variable: "--font-arabic",
  subsets: ["arabic"],
  preload: false,
  adjustFontFallback: false,
});

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    title: { default: "AcadeMe", template: "%s · AcadeMe" },
    description: t("nav.metaDescription"),
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const { locale, dir } = await getI18n();
  return (
    <html
      lang={locale}
      dir={dir}
      className={`${geistSans.variable} ${geistMono.variable} ${arabic.variable} h-full antialiased`}
    >
      <body className="min-h-full font-sans">
        <I18nProvider locale={locale}>{children}</I18nProvider>
      </body>
    </html>
  );
}
