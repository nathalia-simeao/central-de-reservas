import { useState } from "react";
import { Card, SectionHeader, Switch } from "./PmyUI";
import { FEATURES } from "../../utils/feature-flags.js";

// Configurações → Funcionalidades: o administrador liga o que quiser usar.
// Tudo o que é novo chega desligado.
export default function FeatureFlagsPanel({ flags, onSave, lang = "pt" }) {
  const tr = (pt, en) => (lang === "en" ? en : pt);
  const [busyKey, setBusyKey] = useState("");
  const [error, setError] = useState("");

  const toggle = async (key, value) => {
    setBusyKey(key);
    setError("");
    try { await onSave({ [key]: value }); }
    catch (e) { setError(e?.message || tr("Não foi possível salvar.", "Could not save.")); }
    finally { setBusyKey(""); }
  };

  return (
    <Card>
      <SectionHeader
        eyebrow={tr("Central", "Central")}
        title={tr("Funcionalidades", "Features")}
        subtitle={tr(
          "Tudo o que é novo chega desligado. Ligue só o que a equipe for usar. Nada que envolva comissão, conta bancária ou pagamento a terceiros é ligado sem vocês configurarem.",
          "Everything new arrives switched off. Turn on only what the team will use.",
        )}
      />
      {error && <p role="alert" className="pmy-board-pop__error">{error}</p>}
      <div className="pmy-feature-flags">
        {FEATURES.map((f) => {
          const [label, meta] = lang === "en" ? f.en : f.pt;
          return (
            <Switch
              key={f.key}
              checked={Boolean(flags?.[f.key])}
              disabled={busyKey === f.key}
              onChange={(value) => toggle(f.key, value)}
              label={label}
              meta={meta}
            />
          );
        })}
      </div>
    </Card>
  );
}
