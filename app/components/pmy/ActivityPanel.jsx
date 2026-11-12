// "Comentários e atividade" do cartão (como no Trello): comentários com
// @menção da Equipe e o histórico de quem fez o quê. Busca em /api/board-activity.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const initials = (name) => {
  const w = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!w.length) return "?";
  return (w.length === 1 ? w[0].slice(0, 2) : w[0][0] + w[w.length - 1][0]).toUpperCase();
};
const colorFor = (name) => {
  let h = 0;
  for (const ch of String(name || "")) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return `hsl(${h} 45% 40%)`;
};
const when = (value, lang) => new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "pt-PT", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));

/** Destaca "@Nome" das pessoas mencionadas. */
function CommentText({ text, people }) {
  const names = people.map((p) => p.name).filter(Boolean).sort((a, b) => b.length - a.length);
  if (!names.length) return <>{text}</>;
  const escaped = names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const parts = String(text).split(new RegExp(`(@(?:${escaped.join("|")}))`, "g"));
  return <>{parts.map((part, i) => (part.startsWith("@") && names.includes(part.slice(1)) ? <b key={i} className="pmy-activity__mention">{part}</b> : <span key={i}>{part}</span>))}</>;
}

export default function ActivityPanel({ targetType, targetKey, requestJson, refreshKey = "", lang = "pt" }) {
  const tr = (pt, en) => (lang === "en" ? en : pt);
  const [items, setItems] = useState([]);
  const [people, setPeople] = useState([]);
  const [me, setMe] = useState(null);
  const [details, setDetails] = useState(true);
  const [text, setText] = useState("");
  const [mentioned, setMentioned] = useState([]); // ids escolhidos na lista do @
  const [query, setQuery] = useState(null); // texto depois do @ enquanto digita
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const boxRef = useRef(null);

  const load = useCallback(async () => {
    if (!targetKey || typeof requestJson !== "function") return;
    try {
      const params = new URLSearchParams({ type: targetType, key: targetKey });
      const result = await requestJson(`/api/board-activity?${params.toString()}`);
      if (!result?.success) throw new Error(result?.error || "");
      setItems(result.items || []);
      setPeople(result.people || []);
      setMe(result.me || null);
    } catch {
      setError(tr("Não foi possível carregar a atividade.", "Could not load activity."));
    }
  }, [targetType, targetKey, requestJson]); // eslint-disable-line react-hooks/exhaustive-deps

  // Recarrega quando algo muda no cartão (checklist, arquivos, guias...).
  useEffect(() => { const t = setTimeout(load, 350); return () => clearTimeout(t); }, [load, refreshKey]);

  const suggestions = useMemo(() => {
    if (query === null) return [];
    const q = query.toLowerCase();
    return people.filter((p) => String(p.name || "").toLowerCase().includes(q)).slice(0, 6);
  }, [query, people]);

  const onType = (value) => {
    setText(value);
    const el = boxRef.current;
    const upto = value.slice(0, el ? el.selectionStart : value.length);
    const match = upto.match(/(^|\s)@([^\s@]*)$/);
    setQuery(match ? match[2] : null);
  };
  const pick = (person) => {
    const el = boxRef.current;
    const caret = el ? el.selectionStart : text.length;
    const before = text.slice(0, caret).replace(/@([^\s@]*)$/, `@${person.name} `);
    const next = before + text.slice(caret);
    setText(next);
    setMentioned((ids) => [...new Set([...ids, person.id])]);
    setQuery(null);
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(before.length, before.length); });
  };

  const send = async () => {
    const body = text.trim();
    if (!body) return;
    setBusy(true);
    setError("");
    try {
      const ids = mentioned.filter((id) => body.includes(`@${people.find((p) => p.id === id)?.name}`));
      const fd = new FormData();
      fd.append("intent", "comment");
      fd.append("type", targetType);
      fd.append("key", targetKey);
      fd.append("text", body);
      fd.append("mentionIds", JSON.stringify(ids));
      const result = await requestJson("/api/board-activity", fd);
      if (!result?.success) throw new Error(result?.error || "");
      setItems((list) => [result.item, ...list]);
      setText("");
      setMentioned([]);
    } catch (e) {
      setError(e?.message || tr("Não foi possível comentar.", "Could not comment."));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm(tr("Apagar este comentário?", "Delete this comment?"))) return;
    const fd = new FormData();
    fd.append("intent", "delete");
    fd.append("id", id);
    const result = await requestJson("/api/board-activity", fd).catch(() => null);
    if (result?.success) setItems((list) => list.filter((i) => i.id !== id));
    else setError(result?.error || tr("Não foi possível apagar.", "Could not delete."));
  };

  const visible = details ? items : items.filter((i) => i.kind === "comment");
  const isMine = (item) => (me?.personId ? item.authorPersonId === me.personId : item.authorName === me?.name);

  return (
    <div className="pmy-board-modal__section pmy-activity">
      <div className="pmy-activity__head">
        <span className="pmy-board-pop__sub">💬 {tr("Comentários e atividade", "Comments and activity")}</span>
        <button type="button" className="pmy-board-btn" onClick={() => setDetails(!details)}>{details ? tr("Ocultar detalhes", "Hide details") : tr("Mostrar detalhes", "Show details")}</button>
      </div>
      <div className="pmy-activity__compose">
        <div className="pmy-activity__field">
        <textarea ref={boxRef} className="pmy-ds-input" rows={text ? 3 : 1} value={text} placeholder={tr("Escrever um comentário… (use @ para marcar alguém)", "Write a comment… (@ to mention)")}
          onChange={(e) => onType(e.target.value)}
          onKeyDown={(e) => {
            if (query !== null && suggestions.length && (e.key === "Enter" || e.key === "Tab")) { e.preventDefault(); pick(suggestions[0]); return; }
            if (e.key === "Escape") setQuery(null);
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send(); }
          }} />
        {query !== null && suggestions.length > 0 && (
          <ul className="pmy-activity__suggest" role="listbox" aria-label={tr("Marcar pessoa", "Mention person")}>
            {suggestions.map((p) => (
              <li key={p.id}><button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => pick(p)}>
                <i className="pmy-activity__avatar" style={{ background: colorFor(p.name) }}>{initials(p.name)}</i>{p.name}
              </button></li>
            ))}
          </ul>
        )}
        </div>
        {text.trim() && (
          <div className="pmy-support-actions" style={{ marginTop: 6 }}>
            <button type="button" className="pmy-board-btn is-primary" disabled={busy} onClick={send}>{busy ? "…" : tr("Salvar comentário", "Save comment")}</button>
            <button type="button" className="pmy-board-btn" onClick={() => { setText(""); setMentioned([]); setQuery(null); }}>{tr("Cancelar", "Cancel")}</button>
          </div>
        )}
      </div>
      {error && <p className="pmy-board-pop__error" role="alert">{error}</p>}
      {!visible.length && <p className="pmy-board-pop__empty">{details ? tr("Nada registrado ainda.", "Nothing yet.") : tr("Nenhum comentário.", "No comments.")}</p>}
      <ul className="pmy-activity__list">
        {visible.map((item) => (
          <li key={item.id} className={`pmy-activity__item is-${item.kind}`}>
            <i className="pmy-activity__avatar" style={{ background: colorFor(item.authorName) }} aria-hidden="true">{initials(item.authorName)}</i>
            <div>
              {item.kind === "comment" ? (
                <>
                  <p className="pmy-activity__who"><b>{item.authorName || tr("Equipe", "Team")}</b> <small>{when(item.createdAt, lang)}</small></p>
                  <p className="pmy-activity__bubble"><CommentText text={item.text} people={people} /></p>
                  {isMine(item) && <button type="button" className="pmy-activity__del" onClick={() => remove(item.id)}>{tr("Apagar", "Delete")}</button>}
                </>
              ) : (
                <p className="pmy-activity__event"><b>{item.authorName || tr("Equipe", "Team")}</b> {item.text}<br /><small>{when(item.createdAt, lang)}</small></p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
