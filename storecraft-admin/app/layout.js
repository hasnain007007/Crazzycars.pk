/**
 * Root HTML layout and shared metadata.
 */
import { Inter } from "next/font/google";
import Script from "next/script";
import { Toaster } from "react-hot-toast";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata = {
  title: { default: `${process.env.NEXT_PUBLIC_STORE_NAME || 'Crazzycars.pk'} Admin`, template: `%s · ${process.env.NEXT_PUBLIC_STORE_NAME || 'Crazzycars.pk'} Admin` },
  description: `${process.env.NEXT_PUBLIC_STORE_NAME || 'Crazzycars.pk'} administration panel.`,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-white text-[#111827]">
        <Script id="sialkot-theme-init" strategy="beforeInteractive">
          {`(function(){try{var r=document.documentElement;var k='sialkot-theme';var s=localStorage.getItem(k);if(s==='dark'){r.classList.add('dark');}else{r.classList.remove('dark');if(s===null){localStorage.setItem(k,'light');}}}catch(e){try{document.documentElement.classList.remove('dark');}catch(_){}}})();`}
        </Script>
        {children}
        <Toaster position="top-right" toastOptions={{ className: "text-sm" }} />
      </body>
    </html>
  );
}
