import { Outlet } from "react-router";
import db from "../db.server";
import { getGuideFromRequest } from "../utils/guide-portal.server";
import { portalAdminFromRequest } from "../utils/central-auth.server";
import { guideLang, langFromAcceptLanguage } from "../utils/guide-i18n.js";

// Layout do app (PMY Guias): diz às páginas quem está logado e se é adm,
// para a barra de abas mostrar "Central" só para quem tem acesso total.
export const loader = async ({ request }) => {
  const person = await getGuideFromRequest(db, request).catch(() => null);
  if (!person) return { person: null, lang: langFromAcceptLanguage(request.headers.get("accept-language")) };
  const admin = Boolean(await portalAdminFromRequest(request));
  return {
    lang: guideLang(person.portalLanguage),
    person: {
      id: person.id,
      name: person.name,
      isAdmin: admin,
      // Foto própria do app, senão a do perfil (Shopify).
      photo: person.portalPhotoType ? `/guia/foto/${person.id}?v=${new Date(person.updatedAt || 0).getTime()}` : person.photoUrl || null,
    },
  };
};

// Só recarrega quem está logado ao entrar ou sair (o resto não muda isso).
export const shouldRevalidate = ({ formAction, defaultShouldRevalidate }) =>
  formAction ? /\/guia\/(login|sair|preferencias)/.test(formAction) : defaultShouldRevalidate;

export default function GuideLayout() {
  return <Outlet />;
}
