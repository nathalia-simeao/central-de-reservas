export async function uploadFileToPmyMediaLibrary({
  file,
  category = "general",
  label = "",
  requestResourceJson,
}) {
  if (!file) {
    throw new Error("Nenhum arquivo selecionado.");
  }
  if (typeof requestResourceJson !== "function") {
    throw new Error("Cliente de upload indisponível.");
  }

  const mimetype = String(file.type || "").trim() || "application/octet-stream";
  const filename = String(file.name || "arquivo").trim() || "arquivo";

  const prepare = new FormData();
  prepare.append("_action", "uploadMedia");
  prepare.append("filename", filename);
  prepare.append("mimetype", mimetype);
  prepare.append("size", String(file.size || 0));
  prepare.append("category", category);

  const prepared = await requestResourceJson("/api/central-actions", prepare);
  if (!prepared?.uploadUrl || !prepared?.resourceUrl) {
    throw new Error("A Biblioteca PMY não devolveu um destino de upload.");
  }

  const uploadForm = new FormData();
  for (const parameter of prepared.parameters || []) {
    uploadForm.append(parameter.name, parameter.value);
  }
  uploadForm.append("file", file);

  const uploadResponse = await fetch(prepared.uploadUrl, {
    method: "POST",
    body: uploadForm,
  });

  if (!uploadResponse.ok) {
    throw new Error("Falha ao enviar o arquivo para o armazenamento da Biblioteca PMY.");
  }

  const finalize = new FormData();
  finalize.append("_action", "finalizeMediaUpload");
  finalize.append("resourceUrl", prepared.resourceUrl);
  finalize.append("filename", filename);
  finalize.append("mimetype", mimetype);
  finalize.append("category", category);
  finalize.append(
    "label",
    String(label || filename.replace(/\.[^/.]+$/, "") || filename).trim(),
  );

  const finalized = await requestResourceJson("/api/central-actions", finalize);
  if (!finalized?.media?.id || !finalized?.media?.url) {
    throw new Error("A Biblioteca PMY não devolveu a mídia persistida.");
  }

  return finalized.media;
}
