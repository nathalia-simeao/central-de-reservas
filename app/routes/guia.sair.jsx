import db from "../db.server";
import { destroyGuideSession, redirectTo, sessionCookie } from "../utils/guide-portal.server";

export const action = async ({ request }) => {
  await destroyGuideSession(db, request);
  return redirectTo("/guia/login", { "Set-Cookie": sessionCookie(null) });
};

export const loader = () => redirectTo("/guia");
