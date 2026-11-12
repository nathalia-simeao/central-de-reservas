import { Links, Meta, Outlet, Scripts, ScrollRestoration, useLocation } from "react-router";

export default function App() {
  // App PMY Guias: o Chrome do Android só lê o manifesto (e libera "Instalar app")
  // quando o <link rel="manifest"> está no <head>; antes ele ficava no <body>.
  const isGuideApp = /^\/guia(\/|$)/.test(useLocation().pathname);
  return (
    <html lang="pt">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        {/* Ícone da aba: o azulejo verde da PMY (antes era o "R" padrão do React Router). */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" href="/guia-icon-192.png" />
        <link rel="preconnect" href="https://cdn.shopify.com/" />
        <link
          rel="stylesheet"
          href="https://cdn.shopify.com/static/fonts/inter/v4/styles.css"
        />
        {isGuideApp ? (
          <>
            <link rel="manifest" href="/guia.webmanifest" />
            <meta name="theme-color" content="#006600" />
            <meta name="mobile-web-app-capable" content="yes" />
            <meta name="apple-mobile-web-app-capable" content="yes" />
            <meta name="apple-mobile-web-app-title" content="PMY Guias" />
            <meta name="apple-mobile-web-app-status-bar-style" content="default" />
            <link rel="apple-touch-icon" href="/guia-apple-touch-icon.png" />
          </>
        ) : null}
        <Meta />
        <Links />
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
