// Imagem de anexo da Central. Dentro do Shopify não há cookie de sessão, então
// a imagem é buscada com o token (loadImage) e mostrada como blob; só carrega
// quando aparece na tela.
import { useEffect, useRef, useState } from "react";

export const isPreviewableImage = (file) => /^image\/(jpeg|png|webp|gif)$/i.test(String(file?.mimeType || ""));

export default function AuthedImage({ path, loadImage, alt = "", className = "", onClick }) {
  const ref = useRef(null);
  const [src, setSrc] = useState("");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") { setVisible(true); return undefined; }
    const io = new IntersectionObserver((entries) => { if (entries.some((e) => e.isIntersecting)) { setVisible(true); io.disconnect(); } }, { rootMargin: "200px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || !path || typeof loadImage !== "function") return undefined;
    let alive = true;
    loadImage(path).then((url) => { if (alive && url) setSrc(url); }).catch(() => {});
    return () => { alive = false; };
  }, [visible, path, loadImage]);

  const Tag = onClick ? "button" : "span";
  return (
    <Tag ref={ref} type={onClick ? "button" : undefined} className={`pmy-authed-img ${className}${src ? " is-loaded" : ""}`} onClick={onClick}>
      {src ? <img src={src} alt={alt} /> : null}
    </Tag>
  );
}
