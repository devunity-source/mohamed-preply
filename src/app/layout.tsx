import type { Metadata } from "next";
import { Geist_Mono, Inter, Noto_Kufi_Arabic, Sora } from "next/font/google";
import { I18nProvider } from "@/components/i18n-provider";
import { getI18n } from "@/lib/i18n/server";
import "./globals.css";

// Inter for text, Sora for headings and the marketing pages. Neither has
// Arabic letters, so those fall through to Noto Kufi Arabic (listed after them
// in globals.css). No metric fallback face: it would be local Arial, which
// has Arabic and would catch those letters before Kufi.
const inter = Inter({ variable: "--font-inter", subsets: ["latin"], adjustFontFallback: false });
const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  adjustFontFallback: false,
});
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
// Only downloaded when a page has Arabic text in it. It ships Latin glyphs
// too, so it goes after the Latin fonts in every stack.
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
      className={`${inter.variable} ${sora.variable} ${geistMono.variable} ${arabic.variable} h-full antialiased`}
    >
      <body className="min-h-full font-sans">
        <I18nProvider locale={locale}>{children}</I18nProvider>
      </body>
    </html>
  );
}
