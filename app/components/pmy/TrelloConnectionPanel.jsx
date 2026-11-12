import { useCallback, useEffect, useState } from "react";
import { Button, Card, SectionHeader } from "./PmyUI";

// Integrações → Conexões → Trello. A chave e o token ficam criptografados no
// servidor; a tela nunca mostra os valores de volta, só se está conectado.
export default function TrelloConnectionPanel({ requestJson, lang = "pt" }) {
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

  const connected = state?.configured;
  const showForm = !connected || editing;

  return (
    <Card className="pmy-trello-conn pmy-u-mb-5">
      <SectionHeader
        title="Trello"
        subtitle={tr(
          "Lê o quadro \"Tours (Portugal, Me & You)\" direto do Trello para importar no Quadro e baixa os anexos (PDFs) para dentro da Central.",
          "Reads the Trello board for the Board import and downloads attachments into Central.",
        )}
      />
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
    </Card>
  );
}
