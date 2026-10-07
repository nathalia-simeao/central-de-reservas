import { data } from "react-router";
import db from "../db.server";
import { authenticate } from "../shopify.server";
import { buildCivitatisOnboardingStatus } from "../utils/civitatis-onboarding.server";

const json = (body, init) => data(body, init);

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  const status = await buildCivitatisOnboardingStatus(db, request.url);
  return json({ success: true, status });
};
