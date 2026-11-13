// App Central de Reservas → Perfil (pedido 12/11/2026): idioma do app, foto, senha e
// verificação em duas etapas. Vale para guias e para a equipe que usa o app.
import { Buffer } from "node:buffer";
import { useEffect, useRef, useState } from "react";
import { Form, Link, useActionData, useFetcher, useLoaderData, useNavigation } from "react-router";
import db from "../db.server";
import { GIcon, GuideShell, useT } from "../components/guide/GuideShell";
import {
  getGuideFromRequest,
  hashPassword,
  passwordProblem,
  redirectTo,
  revokeOtherSessions,
  verifyPassword,
} from "../utils/guide-portal.server";
import { GUIDE_LANGS, guideLang } from "../utils/guide-i18n.js";
import { generateTotpSecret, otpauthUri, verifyTotp } from "../utils/totp.server.js";
import QRCode from "qrcode";
import { randomBytes } from "node:crypto";
import { calendarLinks } from "../utils/guide-calendar.js";

const SITE = "https://central.portugalmeandyou.com";
const newCalendarToken = () => randomBytes(24).toString("base64url");

/** Link da agenda do guia (cria na primeira vez). */
async function calendarFor(guide) {
  let token = guide.calendarToken;
  if (!token) {
    token = newCalendarToken();
    await db.guide.update({ where: { id: guide.id }, data: { calendarToken: token } });
  }
  return calendarLinks(`${SITE}/guia-agenda/${token}`);
}

const PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_PHOTO_BYTES = 1024 * 1024; // a tela já reduz para ~400 px antes de enviar

export const loader = async ({ request }) => {
  const guide = await getGuideFromRequest(db, request);
  if (!guide) return redirectTo("/guia/login");
  return {
    name: guide.name,
    email: guide.email || "",
    lang: guideLang(guide.portalLanguage),
    hasOwnPhoto: Boolean(guide.portalPhotoType),
    photo: guide.portalPhotoType ? `/guia/foto/${guide.id}?v=${new Date(guide.updatedAt || 0).getTime()}` : guide.photoUrl || null,
    totpEnabled: Boolean(guide.totpEnabled),
    calendar: await calendarFor(guide),
  };
};

// QR code da verificação em duas etapas (SVG gerado aqui, sem serviço externo).
async function qrSvg(uri) {
  try {
    return await QRCode.toString(uri, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#1b1b1b", light: "#ffffff" } });
  } catch {
    return null;
  }
}

export const action = async ({ request }) => {
  const guide = await getGuideFromRequest(db, request);
  if (!guide) return redirectTo("/guia/login");
  const form = await request.formData();
  const intent = String(form.get("intent") || "");

  // Novo link da agenda: o antigo para de funcionar (se alguém recebeu o link por engano).
  if (intent === "calendarReset") {
    await db.guide.update({ where: { id: guide.id }, data: { calendarToken: newCalendarToken() } });
    return { ok: "calendar", message: "Link da agenda trocado. Adicione de novo no seu calendário." };
  }

  if (intent === "lang") {
    await db.guide.update({ where: { id: guide.id }, data: { portalLanguage: guideLang(form.get("lang")) } });
    return { ok: "lang", message: "Idioma salvo." };
  }

  if (intent === "photo") {
    const file = form.get("photo");
    if (!file || typeof file === "string" || !file.size) return { error: "Escolha uma foto." };
    if (!PHOTO_TYPES.has(file.type)) return { error: "Use uma foto JPG, PNG ou WebP." };
    if (file.size > MAX_PHOTO_BYTES) return { error: "Foto grande demais. Tente outra." };
    await db.guide.update({
      where: { id: guide.id },
      data: { portalPhoto: Buffer.from(await file.arrayBuffer()), portalPhotoType: file.type },
    });
    return { ok: "photo", message: "Foto atualizada." };
  }

  if (intent === "photoRemove") {
    await db.guide.update({ where: { id: guide.id }, data: { portalPhoto: null, portalPhotoType: null } });
    return { ok: "photo", message: "Foto removida." };
  }

  if (intent === "password") {
    const current = String(form.get("current") || "");
    const next = String(form.get("next") || "");
    const repeat = String(form.get("repeat") || "");
    // select já traz o campo (não misturar select com omit: o Prisma recusa).
    const row = await db.guide.findUnique({ where: { id: guide.id }, select: { passwordHash: true } });
    if (!row?.passwordHash || !verifyPassword(current, row.passwordHash)) return { error: "A senha atual não confere.", section: "password" };
    const problem = passwordProblem(next);
    if (problem) return { error: problem, section: "password" };
    if (next !== repeat) return { error: "As duas senhas novas não são iguais.", section: "password" };
    if (next === current) return { error: "A senha nova precisa ser diferente da atual.", section: "password" };
    await db.guide.update({ where: { id: guide.id }, data: { passwordHash: hashPassword(next) } });
    // Quem estiver logado com a senha antiga em outro aparelho sai.
    await revokeOtherSessions(db, guide.id, request);
    return { ok: "password", message: "Senha trocada. Os outros aparelhos precisam entrar de novo." };
  }

  if (intent === "totpStart") {
    const secret = generateTotpSecret();
    await db.guide.update({ where: { id: guide.id }, data: { totpSecret: secret, totpEnabled: false } });
    const uri = otpauthUri(secret, guide.email || guide.name);
    return { ok: "totpStart", secret, uri, qr: await qrSvg(uri) };
  }

  if (intent === "totpConfirm" || intent === "totpOff") {
    const row = await db.guide.findUnique({ where: { id: guide.id }, select: { totpSecret: true } });
    const code = String(form.get("code") || "");
    if (!row?.totpSecret || !verifyTotp(row.totpSecret, code)) {
      return {
        error: "Código inválido. Confira o código de 6 dígitos no app autenticador e tente de novo.",
        section: "totp",
        ...(intent === "totpConfirm" && row?.totpSecret ? { ok: "totpStart", secret: row.totpSecret, uri: otpauthUri(row.totpSecret, guide.email || guide.name), qr: await qrSvg(otpauthUri(row.totpSecret, guide.email || guide.name)) } : {}),
      };
    }
    if (intent === "totpConfirm") {
      await db.guide.update({ where: { id: guide.id }, data: { totpEnabled: true } });
      return { ok: "totp", message: "Verificação em duas etapas ativada." };
    }
    await db.guide.update({ where: { id: guide.id }, data: { totpEnabled: false, totpSecret: null } });
    return { ok: "totp", message: "Verificação em duas etapas desativada." };
  }

  return { error: "Ação inválida." };
};

/** Reduz a foto no próprio telemóvel (400 px, JPEG) antes de enviar. */
async function shrinkPhoto(file) {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const size = 400;
  const scale = Math.min(1, size / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  return blob ? new File([blob], "foto.jpg", { type: "image/jpeg" }) : file;
}

function initials(name) {
  const w = String(name || "").trim().split(/\s+/).filter(Boolean);
  return w.length ? (w.length === 1 ? w[0].slice(0, 2) : w[0][0] + w[w.length - 1][0]).toUpperCase() : "?";
}

function PasswordInput({ name, label, autoComplete }) {
  const t = useT();
  const [show, setShow] = useState(false);
  return (
    <label className="g-field">
      {label}
      <span className="g-row" style={{ gap: 6 }}>
        <input name={name} type={show ? "text" : "password"} autoComplete={autoComplete} required style={{ flex: 1 }} />
        <button type="button" className="g-btn" onClick={() => setShow(!show)} aria-pressed={show}>{show ? t("Esconder") : t("Mostrar")}</button>
      </span>
    </label>
  );
}

// Agenda pessoal (Google, iPhone, Outlook): o guia assina um link e as saídas
// aparecem no calendário dele, sem digitar e-mail nem conectar conta.
function CalendarSection({ calendar, busy, message }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  if (!calendar) return null;
  const copy = async () => {
    try { await navigator.clipboard.writeText(calendar.https); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* sem permissão */ }
  };
  return (
    <section className="g-card" aria-labelledby="pref-cal">
      <h2 id="pref-cal">{t("Minha agenda")}</h2>
      <p>{t("Suas saídas aparecem no calendário do telemóvel, junto da sua agenda pessoal. Atualiza sozinho.")}</p>
      <div className="g-row">
        <a className="g-btn primary" href={calendar.google} target="_blank" rel="noreferrer"><GIcon name="calendar" /> {t("Adicionar ao Google Agenda")}</a>
        <a className="g-btn" href={calendar.webcal}>{t("iPhone / Outlook")}</a>
        <button type="button" className="g-btn" onClick={copy}>{copied ? t("Copiado!") : t("Copiar link")}</button>
      </div>
      <p className="g-hint">{t("O Google pode levar algumas horas para mostrar mudanças. Não compartilhe este link: quem tiver ele vê suas saídas.")}</p>
      <Form method="post">
        <input type="hidden" name="intent" value="calendarReset" />
        <button type="submit" className="g-link-btn" disabled={busy}>{t("Gerar um link novo")}</button>
      </Form>
      {message}
    </section>
  );
}

export default function GuidePreferences() {
  const data = useLoaderData();
  const result = useActionData();
  const navigation = useNavigation();
  const photoFetcher = useFetcher();
  const t = useT();
  const busy = navigation.state !== "idle";
  const passwordForm = useRef(null);
  const [photoError, setPhotoError] = useState("");
  const photoResult = photoFetcher.data;

  useEffect(() => {
    if (result?.ok === "password") passwordForm.current?.reset();
  }, [result]);

  const sendPhoto = async (file) => {
    setPhotoError("");
    if (!file) return;
    const small = await shrinkPhoto(file);
    const fd = new FormData();
    fd.append("intent", "photo");
    fd.append("photo", small);
    photoFetcher.submit(fd, { method: "post", encType: "multipart/form-data" });
  };

  const message = (section) => (result?.section === section || result?.ok === section) && (
    result.error
      ? <div className="g-error" role="alert">{t(result.error)}</div>
      : result.message ? <div className="g-ok" role="status">{t(result.message)}</div> : null
  );
  const settingUp = result?.ok === "totpStart" ? result : null;

  return (
    <GuideShell title={t("Perfil")}>
      <div className="g-top">
        <div>
          <h1>{t("Perfil")}</h1>
          <small>{data.name}{data.email ? ` · ${data.email}` : ""}</small>
        </div>
        <Link to="/guia/sair" className="g-link">{t("Sair")}</Link>
      </div>

      <div className="g-prefs">
        <section className="g-card" aria-labelledby="pref-lang">
          <h2 id="pref-lang">{t("Idioma do app")}</h2>
          <p>{t("Os mesmos idiomas em que os passeios são vendidos no site.")}</p>
          <Form method="post" className="g-langs">
            <input type="hidden" name="intent" value="lang" />
            {GUIDE_LANGS.map((l) => (
              <button key={l.key} type="submit" name="lang" value={l.key} className={`g-btn ${data.lang === l.key ? "on" : ""}`} aria-pressed={data.lang === l.key} disabled={busy}>
                {l.name}
              </button>
            ))}
          </Form>
          {message("lang")}
        </section>

        <section className="g-card" aria-labelledby="pref-photo">
          <h2 id="pref-photo">{t("Foto")}</h2>
          <div className="g-photo">
            {photoFetcher.state !== "idle"
              ? <span className="g-photo__empty">…</span>
              : data.photo ? <img src={data.photo} alt={t("Sua foto")} /> : <span className="g-photo__empty">{initials(data.name)}</span>}
            <div className="g-row" style={{ gap: 8, flexWrap: "wrap" }}>
              <label className="g-btn primary">
                {data.hasOwnPhoto ? t("Trocar foto") : t("Escolher foto")}
                <input type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; sendPhoto(f).catch(() => setPhotoError(t("Não foi possível ler a foto."))); }} />
              </label>
              {data.hasOwnPhoto && (
                <photoFetcher.Form method="post">
                  <input type="hidden" name="intent" value="photoRemove" />
                  <button type="submit" className="g-btn">{t("Remover")}</button>
                </photoFetcher.Form>
              )}
            </div>
          </div>
          {photoError && <div className="g-error" role="alert" style={{ marginTop: 10 }}>{photoError}</div>}
          {photoResult?.error && <div className="g-error" role="alert" style={{ marginTop: 10 }}>{t(photoResult.error)}</div>}
          {photoResult?.message && <div className="g-ok" role="status" style={{ marginTop: 10 }}>{t(photoResult.message)}</div>}
        </section>

        <section className="g-card" aria-labelledby="pref-pass">
          <h2 id="pref-pass">{t("Trocar senha")}</h2>
          <Form method="post" ref={passwordForm}>
            <input type="hidden" name="intent" value="password" />
            <PasswordInput name="current" label={t("Senha atual")} autoComplete="current-password" />
            <PasswordInput name="next" label={t("Senha nova (mínimo 8 caracteres)")} autoComplete="new-password" />
            <PasswordInput name="repeat" label={t("Repita a senha nova")} autoComplete="new-password" />
            {message("password")}
            <button type="submit" className="g-btn primary" disabled={busy}>{t("Salvar senha")}</button>
          </Form>
        </section>

        <section className="g-card" aria-labelledby="pref-2fa">
          <h2 id="pref-2fa">{t("Verificação em duas etapas")}</h2>
          {data.totpEnabled ? (
            <>
              <div className="g-ok"><GIcon name="check" /> {t("Ativada: além da senha, o app pede o código do autenticador.")}</div>
              <Form method="post">
                <input type="hidden" name="intent" value="totpOff" />
                <label className="g-field">{t("Para desativar, digite o código de 6 dígitos")}
                  <input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" maxLength={7} required />
                </label>
                {message("totp")}
                <button type="submit" className="g-btn danger" disabled={busy}>{t("Desativar")}</button>
              </Form>
            </>
          ) : settingUp ? (
            <>
              <ol className="g-steps">
                <li>{t("Instale um app autenticador (Google Authenticator, Microsoft Authenticator ou o app Senhas do iPhone).")}</li>
                <li>{t("No autenticador, escolha ler QR code e aponte para o código abaixo. Se estiver no próprio telemóvel, toque em “Abrir no autenticador” ou digite a chave.")}</li>
                <li>{t("Digite o código de 6 dígitos que aparece no autenticador.")}</li>
              </ol>
              {settingUp.qr && (
                <div className="g-qr" role="img" aria-label={t("QR code para o app autenticador")}
                  dangerouslySetInnerHTML={{ __html: settingUp.qr }} />
              )}
              <a className="g-btn" href={settingUp.uri}>{t("Abrir no autenticador")}</a>
              <p style={{ marginTop: 10 }}>{t("Chave")}:</p>
              <div className="g-secret">{settingUp.secret.replace(/(.{4})/g, "$1 ").trim()}</div>
              <Form method="post" style={{ marginTop: 12 }}>
                <input type="hidden" name="intent" value="totpConfirm" />
                <label className="g-field">{t("Código de 6 dígitos")}
                  <input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" maxLength={7} required />
                </label>
                {message("totp")}
                <button type="submit" className="g-btn primary" disabled={busy}>{t("Ativar")}</button>
              </Form>
            </>
          ) : (
            <>
              <p>{t("Mais segurança: além da senha, o app pede um código que muda a cada 30 segundos no seu telemóvel.")}</p>
              {message("totp")}
              <Form method="post">
                <input type="hidden" name="intent" value="totpStart" />
                <button type="submit" className="g-btn primary" disabled={busy}>{t("Ativar verificação em duas etapas")}</button>
              </Form>
            </>
          )}
        </section>

        <CalendarSection calendar={data.calendar} busy={busy} message={message("calendar")} />

        <section className="g-card" aria-labelledby="pref-app">
          <h2 id="pref-app">{t("App no telemóvel")}</h2>
          <p>{t("Instale a Central de Reservas na tela inicial para abrir como um app.")}</p>
          <Link to="/guia/instalar" className="g-btn">{t("Como instalar")}</Link>
        </section>
      </div>
    </GuideShell>
  );
}
