import { useCallback, useEffect, useState } from "react";
import { Button, Card, SectionHeader } from "./PmyUI";

// Configurações → Segurança: troca da INTEGRATION_ENCRYPTION_KEY sem perder
// as credenciais de integração salvas. Só administradores.
function newKeyBase64() {
  const bytes = new Uint8Array(32);
  window.crypto.getRandomValues(bytes);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return window.btoa(binary);
}

const KEY_LABEL = {
  current: ["✅", "chave atual", "current key"],
  previous: ["⏳", "chave antiga — falta recriptografar", "old key — needs re-encryption"],
  unreadable: ["❌", "não abre com nenhuma das chaves — cadastrar de novo", "unreadable with both keys — re-enter it"],
};

export default function EncryptionKeyRotationPanel({ requestJson, lang = "pt" }) {
  const tr = (pt, en) => (lang === "en" ? en : pt);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [generated, setGenerated] = useState("");
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      setError("");
      const result = await requestJson("/api/integration-key-rotation");
      if (!result?.success) throw new Error(result?.error || "Erro");
      setStatus(result);
    } catch (e) {
      setError(e?.message || tr("Não foi possível carregar.", "Unable to load."));
    }
  }, [requestJson]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const reencrypt = async () => {
    setBusy(true);
    setError("");
    try {
      const result = await requestJson("/api/integration-key-rotation", new FormData());
      if (result?.error) throw new Error(result.error);
      setStatus((s) => ({ ...s, records: result.records }));
    } catch (e) {
      setError(e?.message || tr("Falha ao recriptografar.", "Re-encryption failed."));
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText(generated); setCopied(true); } catch { setCopied(false); }
  };

  const env = status?.env;
  const records = status?.records || [];
  const pending = records.some((r) => r.key === "previous");
  const canRun = env?.currentReady && env?.previousConfigured && env?.previousValid && !env?.sameAsCurrent && pending;

  return (
    <Card>
      <SectionHeader
        eyebrow={tr("Segurança", "Security")}
        title={tr("Chave de criptografia da Central", "Central encryption key")}
        subtitle={tr(
          "Protege as credenciais de integração salvas (Viator, Civitatis, Tripadvisor). Para trocar: gere uma chave aqui, coloque a antiga em INTEGRATION_ENCRYPTION_KEY_PREVIOUS e a nova em INTEGRATION_ENCRYPTION_KEY no Northflank, reinicie e clique em recriptografar. Depois apague a _PREVIOUS.",
          "Protects saved integration credentials. To rotate: generate a key here, put the old one in INTEGRATION_ENCRYPTION_KEY_PREVIOUS and the new one in INTEGRATION_ENCRYPTION_KEY on Northflank, restart and re-encrypt. Then delete _PREVIOUS.",
        )}
      />
      {error && <p role="alert" className="pmy-rotation__error">{error}</p>}
      {env && (
        <ul className="pmy-rotation__status">
          <li>{env.currentReady ? "✅" : "❌"} INTEGRATION_ENCRYPTION_KEY: {env.currentReady ? tr("configurada", "configured") : tr("ausente ou inválida", "missing or invalid")}</li>
          <li>{env.previousConfigured ? (env.previousValid && !env.sameAsCurrent ? "✅" : "❌") : "—"} INTEGRATION_ENCRYPTION_KEY_PREVIOUS: {!env.previousConfigured ? tr("não configurada (normal fora da troca)", "not set (normal outside a rotation)") : !env.previousValid ? tr("inválida", "invalid") : env.sameAsCurrent ? tr("igual à atual — confira", "same as current — check") : tr("configurada", "configured")}</li>
          {!records.length && <li>{tr("Nenhuma credencial de integração salva.", "No saved integration credentials.")}</li>}
          {records.map((r) => {
            const [icon, pt, en] = KEY_LABEL[r.key] || ["?", r.key, r.key];
            return <li key={r.provider}>{icon} {r.provider}: {tr(pt, en)}</li>;
          })}
        </ul>
      )}
      {generated && (
        <label className="pmy-rotation__field">
          {tr("Chave nova (guarde no Bitwarden; ela não fica salva aqui)", "New key (save it in your password manager; it is not stored here)")}
          <input readOnly value={generated} onFocus={(e) => e.target.select()} />
        </label>
      )}
      <div className="pmy-language-quota__footer">
        <Button type="button" size="sm" variant="secondary" onClick={() => { setGenerated(newKeyBase64()); setCopied(false); }}>{tr("Gerar chave nova", "Generate new key")}</Button>
        {generated && <Button type="button" size="sm" variant="secondary" onClick={copy}>{copied ? tr("Copiada ✓", "Copied ✓") : tr("Copiar", "Copy")}</Button>}
        <Button type="button" size="sm" variant="secondary" onClick={load} disabled={busy}>{tr("Atualizar", "Refresh")}</Button>
        <Button type="button" size="sm" onClick={reencrypt} disabled={!canRun || busy}>{busy ? "..." : tr("Recriptografar com a chave nova", "Re-encrypt with the new key")}</Button>
      </div>
    </Card>
  );
}
