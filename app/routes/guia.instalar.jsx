// "Baixar o app" (pedido 12/11/2026): o Central de Reservas é um app web instalável.
// Android/Chrome: botão Instalar. iPhone: passo a passo do Safari.
// Funciona sem login, para a gestão mandar o link a quem vai começar.
import { useEffect, useState } from "react";
import { Link, useRouteLoaderData } from "react-router";
import { GIcon, GuideShell, useT } from "../components/guide/GuideShell";

const APP_URL = "https://central.portugalmeandyou.com/guia";

export default function GuideInstall() {
  const t = useT();
  const layout = useRouteLoaderData("routes/guia");
  const [prompt, setPrompt] = useState(null);
  const [device, setDevice] = useState("other"); // ios | android | other
  const [installed, setInstalled] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent || "";
    setDevice(/iphone|ipad|ipod/i.test(ua) || (ua.includes("Mac") && navigator.maxTouchPoints > 1) ? "ios" : /android/i.test(ua) ? "android" : "other");
    setInstalled(window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true);
    const onPrompt = (e) => { e.preventDefault(); setPrompt(e); };
    const onInstalled = () => { setInstalled(true); setPrompt(null); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = async () => {
    if (!prompt) return;
    prompt.prompt();
    const choice = await prompt.userChoice.catch(() => null);
    if (choice?.outcome === "accepted") setInstalled(true);
    setPrompt(null);
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText(APP_URL); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch { /* sem área de transferência */ }
  };

  return (
    <GuideShell title={t("Instalar o app")}>
      <div className="g-top">
        <div>
          <h1>{t("Instalar o app")}</h1>
          <small>{t("A Central de Reservas abre como um app, com ícone na tela inicial.")}</small>
        </div>
        {layout?.person ? <Link to="/guia/preferencias" className="g-link">{t("Perfil")}</Link> : <Link to="/guia/login" className="g-link">{t("Entrar")}</Link>}
      </div>

      <div className="g-prefs">
        {installed ? (
          <section className="g-card">
            <div className="g-ok"><GIcon name="check" /> {t("O app já está instalado neste aparelho.")}</div>
          </section>
        ) : (
          <>
            {prompt && (
              <section className="g-card">
                <h2>{t("Instalar agora")}</h2>
                <p>{t("Toque no botão e confirme. O ícone aparece na tela inicial.")}</p>
                <button type="button" className="g-btn primary" onClick={install}><GIcon name="download" /> {t("Instalar a Central de Reservas")}</button>
              </section>
            )}
            {(device === "ios" || device === "other") && (
              <section className="g-card">
                <h2>iPhone / iPad</h2>
                <ol className="g-steps">
                  <li>{t("Abra este endereço no Safari.")}</li>
                  <li>{t("Toque em Compartilhar (o quadrado com a seta para cima).")}</li>
                  <li>{t("Escolha “Adicionar à Tela de Início” e toque em Adicionar.")}</li>
                </ol>
              </section>
            )}
            {(device === "android" || device === "other") && !prompt && (
              <section className="g-card">
                <h2>Android</h2>
                <ol className="g-steps">
                  <li>{t("Abra este endereço no Chrome.")}</li>
                  <li>{t("Toque no menu ⋮ (canto de cima).")}</li>
                  <li>{t("Escolha “Instalar app” ou “Adicionar à tela inicial”.")}</li>
                  <li>{t("Se aparecer “Não é possível instalar”, feche o Chrome, abra de novo este endereço e tente outra vez. Ou escolha “Criar atalho”.")}</li>
                </ol>
              </section>
            )}
          </>
        )}

        <section className="g-card">
          <h2>{t("Link do app")}</h2>
          <p>{t("Mande este link para quem vai usar o app.")}</p>
          <div className="g-secret">{APP_URL}</div>
          <div className="g-row" style={{ gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            <button type="button" className="g-btn" onClick={copy}>{copied ? t("Copiado") : t("Copiar link")}</button>
            <a className="g-btn" href={`https://wa.me/?text=${encodeURIComponent(APP_URL)}`} target="_blank" rel="noreferrer">{t("Enviar por WhatsApp")}</a>
          </div>
        </section>
      </div>
    </GuideShell>
  );
}
