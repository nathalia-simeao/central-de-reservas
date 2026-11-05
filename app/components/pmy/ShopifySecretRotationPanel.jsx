import { useCallback, useEffect, useState } from "react";
import { Button, Card, SectionHeader } from "./PmyUI";

// Configurações → Segurança: migra os tokens da Shopify para a chave secreta nova
// durante a troca (rotação) do client secret. Só administradores.
export default function ShopifySecretRotationPanel({ requestJson, lang = "pt" }) {
  const tr = (pt, en) => (lang === "en" ? en : pt);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState(null);
  const [rotationRefreshToken, setRotationRefreshToken] = useState("");

  const load = useCallback(async () => {
    try {
      setError("");
      const result = await requestJson("/api/shopify-secret-rotation");
      if (!result?.success) throw new Error(result?.error || "Erro");
      setStatus(result);
    } catch (e) {
      setError(e?.message || tr("Não foi possível carregar.", "Unable to load."));
    }
  }, [requestJson]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const migrate = async () => {
    setBusy(true);
    setError("");
    setResults(null);
    try {
      const fd = new FormData();
      if (rotationRefreshToken.trim()) fd.append("rotationRefreshToken", rotationRefreshToken.trim());
      const result = await requestJson("/api/shopify-secret-rotation", fd);
      if (result?.error) throw new Error(result.error);
      setResults(result?.results || []);
      setRotationRefreshToken("");
      await load();
    } catch (e) {
      setError(e?.message || tr("Falha na migração.", "Migration failed."));
    } finally {
      setBusy(false);
    }
  };

  const needsRepin = (status?.sessions || []).some((s) => !s.hasRefreshToken);
  const ready = status?.nextConfigured && status?.nextDiffersFromCurrent;

  return (
    <Card>
      <SectionHeader
        eyebrow={tr("Segurança", "Security")}
        title={tr("Troca da chave secreta da Shopify", "Shopify client secret rotation")}
        subtitle={tr(
          "Use só durante a troca da chave: cole a chave nova em SHOPIFY_API_SECRET_NEXT no Northflank, reinicie e clique em migrar. Depois revogue a antiga no Dev Dashboard e passe a nova para SHOPIFY_API_SECRET.",
          "Use only while rotating: put the new secret in SHOPIFY_API_SECRET_NEXT on Northflank, restart and click migrate. Then revoke the old one in the Dev Dashboard and move the new one to SHOPIFY_API_SECRET.",
        )}
      />
      {error && <p role="alert" className="pmy-rotation__error">{error}</p>}
      {status && (
        <ul className="pmy-rotation__status">
          <li>{ready ? "✅" : "⏳"} {tr("Chave nova (SHOPIFY_API_SECRET_NEXT)", "New secret (SHOPIFY_API_SECRET_NEXT)")}: {status.nextConfigured ? (status.nextDiffersFromCurrent ? tr("configurada", "configured") : tr("igual à atual — confira", "same as current — check")) : tr("não configurada", "not configured")}</li>
          {(status.sessions || []).map((s) => (
            <li key={s.id}>🔑 {s.shop}: {s.hasRefreshToken ? tr("token com renovação", "refreshable token") : tr("token antigo sem renovação", "legacy non-expiring token")}{s.expires ? ` · ${tr("vence", "expires")} ${new Date(s.expires).toLocaleTimeString(lang === "en" ? "en-GB" : "pt-PT", { hour: "2-digit", minute: "2-digit" })}` : ""}</li>
          ))}
        </ul>
      )}
      {needsRepin && (
        <label className="pmy-rotation__field">
          {tr("Refresh token de rotação (Dev Dashboard → Credentials → Generate refresh token)", "Rotation refresh token (Dev Dashboard → Credentials → Generate refresh token)")}
          <input type="password" autoComplete="off" value={rotationRefreshToken} onChange={(e) => setRotationRefreshToken(e.target.value)} />
        </label>
      )}
      {results && (
        <ul className="pmy-rotation__status">
          {results.map((r) => (
            <li key={r.shop}>{r.ok ? `✅ ${r.shop}: ${tr("migrado para a chave nova", "moved to the new secret")}` : `❌ ${r.shop}: ${r.error}`}</li>
          ))}
        </ul>
      )}
      <div className="pmy-language-quota__footer">
        <Button type="button" size="sm" variant="secondary" onClick={load} disabled={busy}>{tr("Atualizar", "Refresh")}</Button>
        <Button type="button" size="sm" onClick={migrate} disabled={!ready || busy}>{busy ? "..." : tr("Migrar acesso para a chave nova", "Move access to the new secret")}</Button>
      </div>
    </Card>
  );
}
