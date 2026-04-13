/**
 * Google Analytics 4 — loads the gtag.js script when NEXT_PUBLIC_GA_ID is set.
 * Drop this into the root layout. Does nothing in dev or when the env var is
 * missing, so it's safe to include unconditionally.
 */
import Script from "next/script";

export function GoogleAnalytics() {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  if (!gaId) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${gaId}');
        `}
      </Script>
    </>
  );
}
