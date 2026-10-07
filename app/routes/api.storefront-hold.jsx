import {
  handleStorefrontHoldDirectAction,
  storefrontHoldLoader,
} from "../utils/storefront-hold.server";

export const loader = storefrontHoldLoader;
export const action = handleStorefrontHoldDirectAction;
