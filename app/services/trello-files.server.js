// Anexos do Trello → arquivos da Central. Cada arquivo chega com o id do
// cartão do Trello e o endereço original do anexo:
//   - cartão da lista "Doc Suportc" → arquivo do Documento de suporte;
//   - cartão de passeio → arquivo de cada saída que recebeu a observação
//     desse cartão na importação.
// O link longo do anexo sai da observação / da lista de links.

const LINE_PREFIX = "• ";

function stripLink(text, url) {
  const lines = String(text || "").split("\n").filter((line) => !(line.startsWith(LINE_PREFIX) && line.endsWith(url)));
  const out = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    // Cabeçalho "Anexos no Trello:" sem nenhum link embaixo some também.
    if (line === "Anexos no Trello:" && !(lines[i + 1] || "").startsWith(LINE_PREFIX)) continue;
    out.push(line);
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export async function saveTrelloFile({ prisma, trelloCardId, url, fileName, mimeType, bytes, by = "Trello" }) {
  const size = bytes.length;
  const support = await prisma.supportCard.findUnique({ where: { trelloId: trelloCardId }, select: { id: true, links: true } });
  if (support) {
    const exists = await prisma.supportCardAttachment.findFirst({ where: { cardId: support.id, fileName, size }, select: { id: true } });
    if (!exists) await prisma.supportCardAttachment.create({ data: { cardId: support.id, fileName, mimeType, size, data: bytes, uploadedBy: by } });
    const links = (Array.isArray(support.links) ? support.links : []).filter((l) => l?.url !== url);
    await prisma.supportCard.update({ where: { id: support.id }, data: { links } });
    return { target: "support", saved: exists ? 0 : 1 };
  }

  const departures = (await prisma.tourDeparture.findMany({
    where: { startTime: { gte: new Date(Date.now() - 90 * 24 * 3600 * 1000) } },
    select: { id: true, guideNotes: true },
  })).filter((d) => Array.isArray(d.guideNotes) && d.guideNotes.some((n) => n?.source === "trello" && n.trelloId === trelloCardId));
  let saved = 0;
  for (const departure of departures) {
    const exists = await prisma.departureAttachment.findFirst({ where: { departureId: departure.id, fileName, size }, select: { id: true } });
    if (!exists) {
      const count = await prisma.departureAttachment.count({ where: { departureId: departure.id } });
      if (count >= 20) continue;
      await prisma.departureAttachment.create({ data: { departureId: departure.id, fileName, mimeType, size, data: bytes, uploadedBy: by } });
      saved += 1;
    }
    const notes = departure.guideNotes.map((n) => (n?.source === "trello" && n.trelloId === trelloCardId ? { ...n, text: stripLink(n.text, url) } : n))
      .filter((n) => !(n?.source === "trello" && !String(n.text || "").trim()));
    await prisma.tourDeparture.update({ where: { id: departure.id }, data: { guideNotes: notes } });
  }
  return { target: departures.length ? "departure" : "none", saved, departures: departures.length };
}

export { stripLink };
