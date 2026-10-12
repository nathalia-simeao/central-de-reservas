import { classifyShopifyProduct } from "../../utils/shopify-product-classification";

export default function TourCountryFlag({ tour, title, lang = "pt" }) {
  const country = classifyShopifyProduct(tour || { name: title }).country;
  if (country === "UNKNOWN") return null;
  const label = country === "IT" ? (lang === "en" ? "Italy" : "Itália") : "Portugal";
  return <span aria-label={label} title={label} style={{display:"inline-flex",alignItems:"center",gap:4,whiteSpace:"nowrap",fontSize:"0.85em",fontWeight:600,verticalAlign:"middle",marginRight:5}}>
    <span aria-hidden="true">{country === "IT" ? "🇮🇹" : "🇵🇹"}</span><span>{label}</span>
  </span>;
}
