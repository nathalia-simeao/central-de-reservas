import db from "../db.server";
import { destroyGuideSession, logoutCookieHeaders } from "../utils/guide-portal.server";

export const action = async ({ request }) => {
  await destroyGuideSession(db, request);
  const headers = logoutCookieHeaders();
  headers.set("Location", "/guia/login");
  return new Response(null, { status: 302, headers });
};

export const loader = () => new Response(null, { status: 302, headers: { Location: "/guia" } });
