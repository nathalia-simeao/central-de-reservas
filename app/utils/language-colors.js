// Uma cor por idioma (as mesmas do Quadro da Central, pedido 12/11): grupos dos guias,
// etiquetas de idioma nos cartões da Central e do app.
export const LANG_COLORS = { en: "#0c66e4", pt: "#1f845a", es: "#c9372c", fr: "#6e5dc6", it: "#b65c02", de: "#44546f" };
export const langColor = (key) => LANG_COLORS[key] || "#626f86";
