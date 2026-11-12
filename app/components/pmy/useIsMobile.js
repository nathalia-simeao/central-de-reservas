import { useEffect, useState } from "react";

// Tela de celular (app PMY Guias ou navegador do telefone). No servidor e no
// primeiro desenho é sempre false; o valor certo chega logo depois de montar.
export const MOBILE_QUERY = "(max-width: 720px)";

export default function useIsMobile(query = MOBILE_QUERY) {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;
    const media = window.matchMedia(query);
    const update = () => setMobile(media.matches);
    update();
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, [query]);
  return mobile;
}
