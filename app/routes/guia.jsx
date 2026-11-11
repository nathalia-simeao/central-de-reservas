import { Outlet } from "react-router";
import db from "../db.server";
import { getGuideFromRequest } from "../utils/guide-portal.server";
import { portalAdminFromRequest } from "../utils/central-auth.server";

// Layout do app (PMY Guias): diz às páginas quem está logado e se é adm,
// para a barra de abas mostrar "Central" só para quem tem acesso total.
export const loader = async ({ request }) => {
  const person = await getGuideFromRequest(db, request).catch(() => null);
  if (!person) return { person: null };
  const admin = Boolean(await portalAdminFromRequest(request));
  return { person: { name: person.name, isAdmin: admin } };
};

// Só recarrega quem está logado ao entrar ou sair (o resto não muda isso).
export const shouldRevalidate = ({ formAction, defaultShouldRevalidate }) =>
  formAction ? /\/guia\/(login|sair)/.test(formAction) : defaultShouldRevalidate;

export default function GuideLayout() {
  return <Outlet />;
}
