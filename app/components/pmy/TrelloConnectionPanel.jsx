import { useCallback, useEffect, useState } from "react";
import { Button, Card, DropdownSelect, SectionHeader } from "./PmyUI";

const when = (value, lang) => (value
  ? new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "pt-PT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value))
  : "—");

/** Apelidos usados nos checklists do Trello ("Dee" → Maria Aldina). */
function TrelloAliases({ sync, busy, onSave, lang }) {
  const tr = (pt, en) => (lang === "en" ? en : pt);
  const [alias, setAlias] = useState("");
  const [guideId, setGuideId] = useState("");
  if (!sync) return null;
  const aliases = sync.aliases || {};
  const guides = sync.guides || [];
  const nameOf = (id) => guides.find((g) => g.id === id)?.name || tr("(pessoa removida)", "(removed)");
  const save = (next) => onSave(JSON.stringify(next));
  return (
    <div className="pmy-trello-sync">
      <strong>{tr("Apelidos usados no Trello", "Nicknames used in Trello")}</strong>
      <p>{tr("Quando o checklist do Trello usa um apelido (ex.: \"Dee\"), diga quem é na Equipe para a Central escalar a pessoa certa.", "When a Trello checklist uses a nickname, pick who it is in the Team.")}</p>
      {Object.keys(aliases).length > 0 && (
        <ul className="pmy-trello-aliases">
          {Object.entries(aliases).map(([key, id]) => (
            <li key={key}>
              <span><b>{key.charAt(0).toUpperCase() + key.slice(1)}</b> → {nameOf(id)}</span>
              <button type="button" disabled={Boolean(busy)} aria-label={tr(`Remover apelido ${key}`, `Remove ${key}`)} onClick={() => { const next = { ...aliases }; delete next[key]; save(next); }}>×</button>
            </li>
          ))}
        </ul>
      )}
      <form className="pmy-trello-aliases__add" onSubmit={(e) => {
        e.preventDefault();
        const key = alias.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if (!key || !guideId) return;
        save({ ...aliases, [key]: guideId });
        setAlias(""); setGuideId("");
      }}>
        <input className="pmy-ds-input" value={alias} onChange={(e) => setAlias(e.target.value)} placeholder={tr("Apelido no Trello", "Trello nickname")} aria-label={tr("Apelido no Trello", "Trello nickname")} />
        <DropdownSelect value={guideId} onChange={setGuideId} placeholder={tr("Quem é na Equipe", "Who in the Team")} ariaLabel={tr("Pessoa da Equipe", "Team member")}
          searchPlaceholder={tr("Buscar pessoa...", "Search person...")}
          options={guides.map((g) => ({ value: g.id, label: g.name }))} />
        <Button type="submit" size="sm" variant="secondary" disabled={Boolean(busy) || !alias.trim() || !guideId}>{tr("Adicionar", "Add")}</Button>
      </form>
    </div>
  );
}

/** Leitura automática do Trello (uma vez por dia): ligada/desligada, última leitura e avisos. */
function TrelloSyncStatus({ sync, busy, onToggle, onRunNow, lang }) {
  const tr = (pt, en) => (lang === "en" ? en : pt);
  const [open, setOpen] = useState(false);
  if (!sync) return null;
  const s = sync.lastSummary;
  const warnings = s?.guideWarnings || [];
  return (
    <div className="pmy-trello-sync">
      <div className="pmy-trello-sync__head">
        <strong>{sync.enabled ? tr("🔄 Leitura automática ligada (uma vez por dia, de manhã)", "🔄 Auto-read on (once a day, in the morning)") : tr("Leitura automática desligada", "Auto-read off")}</strong>
        <div className="pmy-support-actions" style={{ marginTop: 0 }}>
          <Button size="sm" variant="secondary" disabled={Boolean(busy)} onClick={onRunNow}>{busy === "syncNow" ? tr("Lendo o Trello…", "Reading…") : tr("Ler agora", "Read now")}</Button>
          <Button size="sm" variant={sync.enabled ? "secondary" : "primary"} disabled={Boolean(busy)} onClick={() => onToggle(!sync.enabled)}>
            {sync.enabled ? tr("Desligar", "Turn off") : tr("Ligar", "Turn on")}
          </Button>
        </div>
      </div>
      <p>{tr("Traz do Trello checklists, descrições, guias, documentos de suporte e anexos novos. O que muda só na Central não volta para o Trello; itens marcados na Central continuam marcados.", "Brings checklists, descriptions, guides, support docs and new files from Trello. Central-only changes don't go back to Trello.")}</p>
      <p className="pmy-trello-sync__meta">
        {tr("Última leitura:", "Last read:")} {when(sync.lastOkAt, lang)}
        {s ? ` · ${s.departures} ${tr("saídas", "departures")} · ${s.guidesAssigned} ${tr("guias escalados", "guides assigned")}${s.files ? ` · ${s.files} ${tr("anexos baixados", "files downloaded")}` : ""}` : ""}
        {` · ${sync.mappedTours} ${tr("passeios ligados", "tours linked")}`}
      </p>
      {sync.lastError && <p className="pmy-support-error" role="alert">{sync.lastError}</p>}
      {warnings.length > 0 && (
        <>
          <button type="button" className="pmy-trello-sync__toggle" onClick={() => setOpen(!open)} aria-expanded={open}>
            {open ? "▾" : "▸"} {warnings.length + (s.moreWarnings || 0)} {tr("aviso(s) de guias", "guide warning(s)")}
          </button>
          {open && <ul className="pmy-trello__list">{warnings.map((w) => <li key={w}>{w}</li>)}</ul>}
        </>
      )}
    </div>
  );
}

// Integrações → Conexões → Trello. A chave e o token ficam criptografados no
// servidor; a tela nunca mostra os valores de volta, só se está conectado.
export default function TrelloConnectionPanel({ requestJson, lang = "pt", bare = false }) {
  const tr = (pt, en) => (lang === "en" ? en : pt);
  const [state, setState] = useState(null);
  const [apiKey, setApiKey] = useState("");
  const [token, setToken] = useState("");
  const [boardUrl, setBoardUrl] = useState("");
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [summary, setSummary] = useState(null);

  const load = useCallback(async () => {
    try {
      const result = await requestJson("/api/trello");
      if (!result?.success) throw new Error(result?.error || "Erro");
      setState(result);
      setBoardUrl((v) => v || result.boardUrl || "https://trello.com/b/TVDR11Il/tours-portugal-me-you");
    } catch (e) {
      setError(e?.message || tr("Não foi possível carregar.", "Unable to load."));
    }
  }, [requestJson]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [load]);

  const post = async (intent, fields = {}) => {
    setBusy(intent);
    setError("");
    try {
      const fd = new FormData();
      fd.append("intent", intent);
      for (const [k, v] of Object.entries(fields)) fd.append(k, v);
      const result = await requestJson("/api/trello", fd);
      if (!result?.success) throw new Error(result?.error || tr("Não foi possível salvar.", "Could not save."));
      setState((s) => ({ ...s, ...result }));
      return result;
    } catch (e) {
      setError(e?.message || "");
      return null;
    } finally {
      setBusy("");
    }
  };

  const Wrapper = bare ? "div" : Card;
  const connected = state?.configured;
  const showForm = !connected || editing;

  return (
    <Wrapper className={bare ? "pmy-trello-conn is-bare" : "pmy-trello-conn pmy-u-mb-5"}>
      {bare ? (
        <p className="pmy-agenda-modal__lead">{tr("Lê o quadro \"Tours (Portugal, Me & You)\" direto do Trello para o Quadro da Central e baixa os anexos (PDFs).", "Reads the Trello board into the Central board and downloads attachments.")}</p>
      ) : (
        <SectionHeader
          title="Trello"
          subtitle={tr(
            "Lê o quadro \"Tours (Portugal, Me & You)\" direto do Trello para importar no Quadro e baixa os anexos (PDFs) para dentro da Central.",
            "Reads the Trello board for the Board import and downloads attachments into Central.",
          )}
        />
      )}
      {error && <p className="pmy-support-error" role="alert">{error}</p>}
      {connected && !editing && (
        <div className="pmy-trello-conn__status">
          <p>✅ {state.lastMessage || tr("Conectado.", "Connected.")}</p>
          {state.pending > 0
            ? <p>{tr(`${state.pending} anexo(s) ainda estão como link do Trello.`, `${state.pending} attachment(s) are still Trello links.`)}</p>
            : <p className="pmy-support-empty">{tr("Nenhum anexo pendente.", "No pending attachments.")}</p>}
          <div className="pmy-support-actions">
            <Button variant="primary" disabled={Boolean(busy) || !state.pending} onClick={async () => { const r = await post("downloadFiles"); if (r) setSummary(r.summary); }}>
              {busy === "downloadFiles" ? tr("Baixando…", "Downloading…") : tr("Baixar anexos do Trello", "Download Trello attachments")}
            </Button>
            <Button variant="secondary" disabled={Boolean(busy)} onClick={() => setEditing(true)}>{tr("Trocar chave ou quadro", "Change key or board")}</Button>
            <Button variant="secondary" disabled={Boolean(busy)} onClick={() => { if (window.confirm(tr("Desconectar o Trello? A chave e o token serão apagados da Central.", "Disconnect Trello?"))) post("remove"); }}>{tr("Desconectar", "Disconnect")}</Button>
          </div>
          <TrelloSyncStatus sync={state.sync} busy={busy} lang={lang}
            onToggle={(enabled) => {
              let mapping = null;
              try { mapping = window.localStorage.getItem("pmy.trelloTourMapping"); } catch { /* sem armazenamento */ }
              return post("syncSettings", { enabled: String(enabled), mapping: mapping || "" });
            }}
            onRunNow={() => post("syncNow")} />
          <TrelloAliases sync={state.sync} busy={busy} lang={lang} onSave={(aliases) => post("saveAliases", { aliases })} />
          {summary && (
            <div className="pmy-trello-conn__summary">
              <p><b>{summary.saved}</b> {tr("arquivo(s) salvos na Central.", "file(s) saved.")}</p>
              {[...summary.skipped, ...summary.failed].length > 0 && (
                <ul className="pmy-trello__list">{[...summary.skipped, ...summary.failed].map((m) => <li key={m}>{m}</li>)}</ul>
              )}
            </div>
          )}
        </div>
      )}
      {showForm && (
        <form className="pmy-trello-conn__form" onSubmit={async (e) => {
          e.preventDefault();
          const r = await post("save", { apiKey, token, boardUrl });
          if (r) { setApiKey(""); setToken(""); setEditing(false); load(); }
        }}>
          <ol className="pmy-trello-conn__steps">
            <li>{tr("Em trello.com/power-ups/admin, abra o app \"Central PMY\" → API key.", "At trello.com/power-ups/admin open the app → API key.")}</li>
            <li>{tr("Copie a API key e, no link Token ao lado, clique em Permitir e copie o token.", "Copy the API key, then click Token → Allow and copy the token.")}</li>
          </ol>
          <label className="pmy-trello-conn__field">API key
            <input className="pmy-ds-input" value={apiKey} onChange={(e) => setApiKey(e.target.value)} autoComplete="off" spellCheck={false} placeholder={connected ? tr("(mantém a atual se ficar vazio)", "(keeps current if empty)") : "32 letras e números"} />
          </label>
          <label className="pmy-trello-conn__field">Token
            <input className="pmy-ds-input" type="password" value={token} onChange={(e) => setToken(e.target.value)} autoComplete="off" spellCheck={false} placeholder={connected ? tr("(mantém o atual se ficar vazio)", "(keeps current if empty)") : tr("código longo depois de Permitir", "long code after Allow")} />
          </label>
          <label className="pmy-trello-conn__field">{tr("Link do quadro", "Board link")}
            <input className="pmy-ds-input" value={boardUrl} onChange={(e) => setBoardUrl(e.target.value)} autoComplete="off" />
          </label>
          {state && !state.encryptionReady && <p className="pmy-support-error">{tr("O servidor ainda não tem a chave de criptografia configurada.", "Encryption key missing on server.")}</p>}
          <div className="pmy-support-actions">
            <Button variant="primary" type="submit" disabled={Boolean(busy) || (!connected && (!apiKey || !token))}>{busy === "save" ? tr("Testando…", "Testing…") : tr("Salvar e testar", "Save and test")}</Button>
            {editing && <Button variant="secondary" type="button" onClick={() => setEditing(false)}>{tr("Cancelar", "Cancel")}</Button>}
          </div>
        </form>
      )}
    </Wrapper>
  );
}
