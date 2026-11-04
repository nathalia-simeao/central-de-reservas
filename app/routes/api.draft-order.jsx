import { authenticate } from "../shopify.server";
import { createDraftCheckout } from "../services/draft-checkout.server";

// Central (admin embutido) → link de pagamento Shopify com reserva de vaga.
export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  return createDraftCheckout({ admin, session, formData, requestUrl: request.url });
};
