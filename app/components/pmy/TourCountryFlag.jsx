import { classifyShopifyProduct } from "../../utils/shopify-product-classification";

export default function TourCountryFlag({ tour, title, lang = "pt" }) {
  const country = classifyShopifyProduct(tour || { name: title }).country;
  if (country === "UNKNOWN") return null;
  const label = country === "IT" ? (lang === "en" ? "Italy" : "Itália") : "Portugal";
  return <span aria-label={label} title={label} style={{display:"inline-flex",alignItems:"center",marginRight:6,verticalAlign:"middle"}}>
    <img src={country === "IT" ? "https://flagcdn.com/w40/it.png" : "https://flagcdn.com/w40/pt.png"} alt={label} width="20" height="14" loading="lazy" style={{width:20,height:14,objectFit:"cover",borderRadius:2,display:"block"}} />
  </span>;
}
