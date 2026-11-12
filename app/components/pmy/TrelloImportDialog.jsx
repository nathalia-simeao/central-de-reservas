// "Importar do Trello" no Quadro (só administradores).
// 1. A pessoa escolhe o arquivo JSON exportado do Trello.
// 2. O navegador lê o quadro e mostra a prévia: cada passeio do Trello ligado a
//    um passeio da Central (com sugestão automática), datas suspeitas marcadas.
// 3. "Importar" manda só o plano para a Central gravar.

import { useMemo, useState } from "react";
import { DropdownSelect } from "./PmyUI";
import { parseTrelloBoard, suggestTour } from "../../utils/trello-import.js";

const MAPPING_KEY = "pmy.trelloTourMapping";

function readMapping() {
  try { return JSON.parse(window.localStorage.getItem(MAPPING_KEY) || "{}") || {}; } catch { return {}; }
}
function writeMapping(mapping) {
  try { window.localStorage.setItem(MAPPING_KEY, JSON.stringify(mapping)); } catch { /* sem armazenamento: tudo bem */ }
}

const fmtDate = (dateKey) => {
  const [y, m, d] = String(dateKey || "").split("-");
  return d ? `${d}/${m}/${y}` : "—";
};

export default function TrelloImportDialog({ tours = [], onImport, onClose, loadBoard = null, lang = "pt" }) {
  const tr = (pt, en) => (lang === "en" ? en : pt);
  const [plan, setPlan] = useState(null);
  const [fileError, setFileError] = useState("");
  const [mapping, setMapping] = useState({});
  const [includeFlagged, setIncludeFlagged] = useState(false);
  const [assignGuides, setAssignGuides] = useState(true);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const tourOptions = useMemo(
    () => [{ value: "", label: tr("— Não importar —", "— Skip —") }, ...[...tours].sort((a, b) => String(a.title).localeCompare(String(b.title))).map((t) => ({ value: t.id, label: t.title }))],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tours, lang],
  );

  const [reading, setReading] = useState(false);
  const readFile = async (file) => readBoard(async () => JSON.parse(await file.text()));
  const readBoard = async (getBoard) => {
    setFileError("");
    setResult(null);
    setReading(true);
    try {
      const parsed = parseTrelloBoard(await getBoard());
      const saved = readMapping();
      const next = {};
      const validIds = new Set(tours.map((t) => t.id));
      for (const card of parsed.cards) {
        if (card.tourKey in next) continue;
        next[card.tourKey] = validIds.has(saved[card.tourKey]) ? saved[card.tourKey] : suggestTour(card.name, tours) || "";
      }
      setMapping(next);
      setPlan(parsed);
    } catch (e) {
      setPlan(null);
      setFileError(e instanceof SyntaxError ? tr("Esse arquivo não é um JSON válido.", "Not a valid JSON file.") : e.message);
    }
    setReading(false);
  };

  const groups = useMemo(() => {
    if (!plan) return [];
    const byKey = new Map();
    for (const card of plan.cards) {
      if (!byKey.has(card.tourKey)) byKey.set(card.tourKey, { key: card.tourKey, name: card.name.replace(/\(.*?\)/g, "").trim(), cards: 0, first: card.dateKey, last: card.dateKey });
      const g = byKey.get(card.tourKey);
      g.cards += 1;
      if (card.dateKey < g.first) g.first = card.dateKey;
      if (card.dateKey > g.last) g.last = card.dateKey;
    }
    return [...byKey.values()].sort((a, b) => b.cards - a.cards);
  }, [plan]);

  const flagged = useMemo(() => {
    if (!plan) return [];
    const seen = new Map();
    for (const card of plan.cards) if (card.dateWarning && !seen.has(card.listName)) seen.set(card.listName, card);
    return [...seen.values()];
  }, [plan]);

  const selected = plan ? plan.cards.filter((c) => mapping[c.tourKey] && (includeFlagged || !c.dateWarning)) : [];

  const runImport = async () => {
    setBusy(true);
    setError("");
    writeMapping({ ...readMapping(), ...mapping });
    try {
      const summary = await onImport({
        assignGuides,
        cards: selected.map((c) => ({ ...c, tourId: mapping[c.tourKey] })),
        support: plan.support,
      });
      setResult(summary);
    } catch (e) {
      setError(e?.message || tr("Não foi possível importar.", "Import failed."));
    }
    setBusy(false);
  };

  return (
    <div className="pmy-board-modal">
      <button type="button" className="pmy-board-modal__backdrop" aria-label={tr("Fechar", "Close")} tabIndex={-1} onClick={onClose} />
      <div className="pmy-board-modal__card pmy-trello" role="dialog" aria-modal="true" aria-label={tr("Importar do Trello", "Import from Trello")}>
        <div className="pmy-board-modal__head">
          <div>
            <h3>{tr("Importar do Trello", "Import from Trello")}</h3>
            <p>{tr("Traz os cartões, checklists, descrições e guias do quadro para as saídas da Central. Pode importar de novo: o que veio do Trello é atualizado, nada duplica.", "Brings cards, checklists, descriptions and guides into Central departures. Re-importing updates, never duplicates.")}</p>
          </div>
          <button type="button" className="pmy-board-pop__icon" aria-label={tr("Fechar", "Close")} onClick={onClose}>×</button>
        </div>

        {result ? (
          <div className="pmy-board-modal__section">
            <h4>{tr("Importação concluída", "Import finished")}</h4>
            <ul className="pmy-trello__stats">
              <li><b>{result.departures}</b> {tr("saídas atualizadas", "departures updated")}</li>
              <li><b>{result.checklists}</b> {tr("checklists", "checklists")}</li>
              <li><b>{result.notes}</b> {tr("descrições como observação", "descriptions as notes")}</li>
              <li><b>{result.guidesAssigned}</b> {tr("guias escalados", "guides assigned")}</li>
              <li><b>{result.support}</b> {tr("documentos de suporte", "support documents")}</li>
            </ul>
            {result.unplaced?.length > 0 && (
              <>
                <h4>{tr("Ficaram de fora (sem horário)", "Not placed (no time)")}</h4>
                <p className="pmy-support-empty">{tr("Escreva o horário no título do checklist no Trello (ex.: \"10h ENG\") e importe de novo, ou crie o cartão direto no Quadro.", "Add the time to the checklist title in Trello and re-import.")}</p>
                <ul className="pmy-trello__list">{result.unplaced.map((u, i) => <li key={i}><b>{u.list}</b> · {u.name} — {u.reason}</li>)}</ul>
              </>
            )}
            {result.guideWarnings?.length > 0 && (
              <>
                <h4>{tr("Guias não escalados", "Guides not assigned")}</h4>
                <ul className="pmy-trello__list">{result.guideWarnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
              </>
            )}
            <div className="pmy-support-actions"><button type="button" className="pmy-board-btn is-primary" onClick={onClose}>{tr("Ver o Quadro", "View board")}</button></div>
          </div>
        ) : (
          <>
            <div className="pmy-board-modal__section">
              <h4>{tr("1. Arquivo do Trello", "1. Trello file")}</h4>
              {loadBoard && (
                <div className="pmy-support-actions" style={{ marginTop: 0, marginBottom: 8 }}>
                  <button type="button" className="pmy-board-btn is-primary" disabled={reading} onClick={() => readBoard(loadBoard)}>
                    {reading ? tr("Lendo o Trello…", "Reading Trello…") : tr("Ler direto do Trello", "Read from Trello")}
                  </button>
                </div>
              )}
              <p className="pmy-support-empty">{loadBoard
                ? tr("Ou envie o arquivo exportado (menu ⋯ do quadro → Imprimir, exportar e compartilhar → Exportar como JSON).", "Or upload the exported JSON file.")
                : tr("No Trello: menu ⋯ do quadro → Imprimir, exportar e compartilhar → Exportar como JSON. Para ler direto, conecte o Trello em Integrações.", "In Trello: board menu ⋯ → Print, export and share → Export as JSON.")}</p>
              <label className="pmy-board-btn pmy-support-upload">
                {plan ? tr("Trocar arquivo", "Change file") : tr("Escolher arquivo .json", "Choose .json file")}
                <input type="file" accept="application/json,.json" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) readFile(f); }} />
              </label>
              {fileError && <p className="pmy-support-error" role="alert">{fileError}</p>}
              {plan && (
                <p className="pmy-trello__found">
                  <b>{plan.boardName}</b>: {plan.stats.cards} {tr("cartões de passeio", "tour cards")}, {plan.stats.checklists} checklists, {plan.stats.support} {tr("documentos de suporte", "support documents")}.
                </p>
              )}
            </div>

            {plan && (
              <>
                <div className="pmy-board-modal__section">
                  <h4>{tr("2. Qual passeio da Central é cada um", "2. Match each tour")}</h4>
                  <div className="pmy-trello__map">
                    {groups.map((g) => (
                      <div key={g.key} className="pmy-trello__row">
                        <div>
                          <strong>{g.name}</strong>
                          <small>{g.cards} {g.cards === 1 ? tr("cartão", "card") : tr("cartões", "cards")} · {fmtDate(g.first)}{g.last !== g.first ? ` – ${fmtDate(g.last)}` : ""}</small>
                        </div>
                        <DropdownSelect
                          value={mapping[g.key] || ""}
                          options={tourOptions}
                          placeholder={tr("Escolha o passeio", "Choose tour")}
                          searchPlaceholder={tr("Buscar passeio...", "Search tour...")}
                          ariaLabel={`${tr("Passeio da Central para", "Central tour for")} ${g.name}`}
                          onChange={(value) => setMapping((m) => ({ ...m, [g.key]: value }))}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {flagged.length > 0 && (
                  <div className="pmy-board-modal__section">
                    <h4>{tr("Datas para conferir no Trello", "Dates to check in Trello")}</h4>
                    <ul className="pmy-trello__list">
                      {flagged.map((c) => <li key={c.listName}><b>{c.listName}</b> → {fmtDate(c.dateKey)} · {c.dateWarning}</li>)}
                    </ul>
                    <label className="pmy-support-check">
                      <input type="checkbox" checked={includeFlagged} onChange={(e) => setIncludeFlagged(e.target.checked)} />
                      {tr("Importar estas listas mesmo assim, nas datas acima", "Import these lists anyway, on the dates above")}
                    </label>
                  </div>
                )}

                <div className="pmy-board-modal__section">
                  <h4>{tr("3. Importar", "3. Import")}</h4>
                  <label className="pmy-support-check">
                    <input type="checkbox" checked={assignGuides} onChange={(e) => setAssignGuides(e.target.checked)} />
                    {tr("Escalar os guias dos cartões (pelo nome no título do checklist)", "Assign card guides (by name in checklist title)")}
                  </label>
                  {error && <p className="pmy-support-error" role="alert">{error}</p>}
                  <div className="pmy-support-actions">
                    <button type="button" className="pmy-board-btn is-primary" disabled={busy || (!selected.length && !plan.support.length)} onClick={runImport}>
                      {busy ? tr("Importando…", "Importing…") : tr(`Importar ${selected.length} cartões e ${plan.support.length} documentos`, `Import ${selected.length} cards and ${plan.support.length} documents`)}
                    </button>
                    <button type="button" className="pmy-board-btn" onClick={onClose}>{tr("Cancelar", "Cancel")}</button>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
