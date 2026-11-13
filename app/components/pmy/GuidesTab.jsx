import { useState } from "react";
import TourCountryFlag from "./TourCountryFlag";
import { TEAM_AREAS, areaLabel, personAreas } from "../../utils/team-areas.js";
import { buildBoardColumns } from "../../utils/agenda-board.js";
import { Badge, Button, Card, EmptyState, Icon, SectionHeader, Tabs, DropdownSelect, PhoneCodeSelect } from "./PmyUI";

export default function GuidesTab(props) {
  const {
    activeTab,
    guideAssignments = [],
    bookings = [],
    departureTags = {},
    departureInfo = {},
    tours = [],
    guideShopifySync,
    guidesList,
    handleDeleteGuide,
    handleOpenEditGuide,
    setActiveModal,
    setSelectedGuideInfo,
    setUpcomingToursFilter,
    t,
    upcomingToursFilter,
    lang,
    isCentralAdmin = true,
    centralUsers = [],
    centralUser = null,
    handleSaveCentralUser,
    handleAddPerson,
    ddiList = [],
  } = props;

  const tr = (pt, en) => lang === "en" ? en : pt;
  const [area, setArea] = useState("ALL");
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", ddi: "+351", phone: "", areas: ["GUIA"] });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  if (activeTab !== "guias") return null;

  const areaTabs = [
    { value: "ALL", label: `${tr("Todos", "All")} (${guidesList.length})` },
    ...TEAM_AREAS.map((a) => ({
      value: a.key,
      label: `${tr(a.pt, a.en)} (${guidesList.filter((p) => personAreas(p).includes(a.key)).length})`,
    })),
  ];
  const people = area === "ALL" ? guidesList : guidesList.filter((p) => personAreas(p).includes(area));
  const accessOf = (person) => centralUsers.find((u) => u.guideId === person.id) || null;
  const unlinkedUsers = centralUsers.filter((u) => !u.guideId);

  const submitPerson = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) { setFormError(tr("Informe o nome.", "Enter the name.")); return; }
    setSaving(true);
    setFormError("");
    try {
      await handleAddPerson({
        name: form.name.trim(),
        email: form.email.trim(),
        whatsapp: form.phone.trim() ? `${form.ddi} ${form.phone.trim()}` : "",
        areas: form.areas,
      });
      setForm({ name: "", email: "", ddi: "+351", phone: "", areas: area !== "ALL" ? [area] : ["GUIA"] });
      setAdding(false);
    } catch (error) {
      setFormError(error?.message || tr("Não foi possível salvar.", "Could not save."));
    } finally {
      setSaving(false);
    }
  };

  const upcomingTabs = [
    { value: "today", label: t.filter_today },
    { value: "7d", label: t.view_7d },
    { value: "15d", label: tr("15 dias", "15 days") },
    { value: "30d", label: tr("30 dias", "30 days") },
  ];

  const lisbonDateKey = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/Lisbon",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
        .formatToParts(date)
        .filter((part) => part.type !== "literal")
        .map((part) => [part.type, part.value]),
    );
    return `${parts.year}-${parts.month}-${parts.day}`;
  };

  // Próximos tours: todas as saídas do período (com reserva, guia ou cartão no
  // Quadro), com o guia escalado ou "sem guia" — antes só apareciam as escalas.
  const todayLisbon = lisbonDateKey(new Date());
  const rangeDays = upcomingToursFilter === "today" ? 1 : Number.parseInt(upcomingToursFilter, 10) || 7;
  const nowMs = Date.now();
  const upcomingDepartures = buildBoardColumns({ startDateKey: todayLisbon, days: rangeDays, bookings, assignments: guideAssignments, departureTags, departureInfo, tours })
    .flatMap((col) => col.cards)
    .filter((card) => !departureInfo[card.key]?.archivedAt && new Date(card.startTime).getTime() >= nowMs - 60 * 60 * 1000);

  const formatDepartureWhen = (card) => {
    const start = new Date(card.startTime);
    const datePart = start.toLocaleDateString(lang === "pt" ? "pt-PT" : "en-GB", { timeZone: "Europe/Lisbon", day: "2-digit", month: "short" });
    return `${datePart} · ${card.timeKey}`;
  };
  const tourById = new Map((tours || []).map((tour) => [tour.id, tour]));

  return (
    <div className="pmy-ds-stack">
      <Card>
        <SectionHeader
          eyebrow={tr("Equipe", "Team")}
          title={tr("Pessoas da PMY", "PMY people")}
          subtitle={tr(
            "Guias, administração, comercial, marketing e operação num lugar só. Clique na pessoa para editar as áreas e o acesso à Central.",
            "Guides, admin, sales, marketing and operations in one place.",
          )}
          actions={handleAddPerson ? (
            <Button type="button" size="sm" icon="plus" onClick={() => { setAdding(!adding); setForm((f) => ({ ...f, areas: area !== "ALL" ? [area] : f.areas })); }}>
              {adding ? tr("Fechar", "Close") : tr("Adicionar pessoa", "Add person")}
            </Button>
          ) : null}
        />

        <Tabs items={areaTabs} value={area} onChange={setArea} ariaLabel={tr("Áreas da equipe", "Team areas")} />

        {adding && (
          <form className="pmy-person-form" onSubmit={submitPerson}>
            <label>{tr("Nome", "Name")}<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
            <label>E-mail<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
            <label>WhatsApp
              <span className="pmy-person-form__phone">
                <PhoneCodeSelect value={form.ddi} onChange={(ddi) => setForm({ ...form, ddi })} ddiList={ddiList} lang={lang} />
                <input inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </span>
            </label>
            <div className="pmy-person-areas">
              <span className="pmy-person-access__label">{tr("Áreas", "Areas")}</span>
              <div className="pmy-person-areas__chips" role="group">
                {TEAM_AREAS.map((a) => {
                  const on = form.areas.includes(a.key);
                  return (
                    <button key={a.key} type="button" className={`pmy-area--${a.key}${on ? " is-on" : ""}`} aria-pressed={on}
                      onClick={() => setForm({ ...form, areas: on ? form.areas.filter((k) => k !== a.key) : [...form.areas, a.key] })}>
                      {on ? "✓ " : ""}{areaLabel(a.key, lang)}
                    </button>
                  );
                })}
              </div>
            </div>
            {formError && <p role="alert" className="pmy-rotation__error">{formError}</p>}
            <div className="pmy-person-form__actions">
              <Button type="submit" size="sm" disabled={saving}>{saving ? "…" : tr("Salvar pessoa", "Save person")}</Button>
              <small className="pmy-person-access__hint">{tr("Depois de salvar, libere o acesso pelo app (e-mail e senha) no cadastro da pessoa — não precisa de Shopify.", "After saving, enable app access (email and password) on the person card — no Shopify needed.")}</small>
            </div>
          </form>
        )}

        {people.length === 0 ? (
          <EmptyState
            icon="users"
            title={tr("Ninguém nesta área ainda", "Nobody in this area yet")}
            description={tr(
              "Use \"Adicionar pessoa\" ou edite uma pessoa e marque esta área.",
              "Use \"Add person\" or edit someone and tick this area.",
            )}
          />
        ) : (
          <div className="pmy-guides-grid">
            {people.map((guide) => (
              <div
                key={guide.id}
                className="pmy-guide-card-square"
                role="button"
                tabIndex={0}
                onClick={() => {
                  setSelectedGuideInfo(guide);
                  setActiveModal("guideDetails");
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelectedGuideInfo(guide);
                    setActiveModal("guideDetails");
                  }
                }}
              >
                <img src={guide.photo} alt={guide.name} className="pmy-guide-square-img" />
                <div className="pmy-guide-square-name">
                  {guide.name.split(" ")[0]}<br />
                  {guide.name.split(" ").slice(1).join(" ")}
                </div>
                <div className="pmy-person-badges">
                  {personAreas(guide).map((key) => <span key={key} className={`pmy-area-tag pmy-area--${key}`}>{areaLabel(key, lang)}</span>)}
                  {accessOf(guide) && (
                    <Badge tone="success">{accessOf(guide).role === "ADMIN" ? tr("Central: Admin", "Central: Admin") : tr("Central: Equipe", "Central: Team")}</Badge>
                  )}
                </div>

                <div className="pmy-ds-guide-actions">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    icon="settings"
                    onClick={() => handleOpenEditGuide(guide)}
                  >
                    {tr("Editar", "Edit")}
                  </Button>

                  {guide.referralLink ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      icon="link"
                      iconOnly
                      aria-label={tr("Copiar link de indicação", "Copy referral link")}
                      title={tr("Copiar link de indicação", "Copy referral link")}
                      onClick={() =>
                        navigator.clipboard
                          .writeText(guide.referralLink)
                          .then(() => alert(tr("Link copiado!", "Link copied!")))
                          .catch(() => {})
                      }
                    />
                  ) : null}

                  {!guide.shopifyMetaobjectId ? (
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      icon="trash"
                      iconOnly
                      aria-label={tr("Excluir pessoa", "Delete person")}
                      onClick={() => handleDeleteGuide(guide.id)}
                    />
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {isCentralAdmin && handleSaveCentralUser && unlinkedUsers.length > 0 && (
        <Card>
          <SectionHeader
            eyebrow={tr("Acesso à Central", "Central access")}
            title={tr("Acessos ainda sem pessoa", "Logins not linked to a person")}
            subtitle={tr(
              "Quem abriu a Central pelo admin da Shopify e ainda não foi ligado a ninguém da equipe. Escolha a pessoa e o perfil.",
              "People who opened the Central from Shopify and aren't linked to anyone yet.",
            )}
          />
          <div className="pmy-unlinked-access">
            {unlinkedUsers.map((u) => (
              <UnlinkedAccessRow key={u.id} user={u} people={guidesList} currentUser={centralUser} onSave={handleSaveCentralUser} lang={lang} />
            ))}
          </div>
        </Card>
      )}

      <Card>
        <SectionHeader
          eyebrow={tr("Agenda", "Schedule")}
          title={t.upcoming_tours_list}
          actions={
            <Tabs
              items={upcomingTabs}
              value={upcomingToursFilter}
              onChange={setUpcomingToursFilter}
              ariaLabel={tr("Período dos próximos tours", "Upcoming tours period")}
            />
          }
        />

        <div className="pmy-ds-panel-soft">
          {upcomingDepartures.length === 0 ? (
            <EmptyState
              icon="calendar"
              title={tr("Nenhum tour neste período", "No tours in this period")}
              description={tr(
                "Saídas com reserva, guia escalado ou cartão no Quadro aparecem aqui.",
                "Departures with bookings, guides or a board card show here.",
              )}
            />
          ) : (
            <div className="pmy-upcoming">
              {upcomingDepartures.map((card) => (
                // Colunas fixas (pedido da Nathalia, 12/11/2026): passeio | data e hora | pax | guias,
                // cada uma alinhada à esquerda, para ler de cima a baixo sem procurar.
                <div key={card.uid || card.key} className="pmy-upcoming__row">
                  <span className="pmy-upcoming__tour">
                    <Icon name="calendar" size={16} />
                    <TourCountryFlag tour={tourById.get(card.tourId)} lang={lang}/>
                    <span className="pmy-upcoming__title">{card.title}</span>
                  </span>
                  <span className={`pmy-upcoming__when${lisbonDateKey(card.startTime) === todayLisbon ? " is-today" : ""}`}>{formatDepartureWhen(card)}</span>
                  <span className="pmy-upcoming__pax">{card.pax + card.pending > 0 ? `${card.pax + card.pending} pax` : "—"}</span>
                  <span className="pmy-upcoming__guides">
                    {card.guides.length
                      ? card.guides.map((g) => <Badge key={g.guideId || g.name} tone="success">{g.name}</Badge>)
                      : <Badge tone="warning">{tr("Sem guia", "No guide")}</Badge>}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
      <Card>
        <SectionHeader
          eyebrow={tr("Fonte dos perfis", "Profile source")}
          title={tr("Guias sincronizados do Shopify", "Guides synced from Shopify")}
          subtitle={tr(
            "Nome, foto, descrição, vídeo, passeio exclusivo e galeria vêm do metaobjeto Guias. A Central mantém contato, UTM e escala.",
            "Name, photo, description, video, exclusive tour and gallery come from the Guides metaobject. The Central keeps contact, UTM and scheduling.",
          )}
          actions={
            <Button
              type="button"
              variant="secondary"
              size="sm"
              icon="refresh"
              onClick={() => window.location.reload()}
            >
              {tr("Atualizar status", "Refresh status")}
            </Button>
          }
        />

        <div className={["pmy-ds-state-panel", guideShopifySync?.success ? "is-success" : "is-warning"].filter(Boolean).join(" ")}>
          <div className={["pmy-ds-state-title", guideShopifySync?.success ? "is-success" : "is-warning"].filter(Boolean).join(" ")}>
            {guideShopifySync?.success === null
              ? tr("Atualização do Shopify em segundo plano", "Shopify refresh running in background")
              : guideShopifySync?.success
                ? tr(
                    String(guideShopifySync.total || 0) + " perfis encontrados no Shopify",
                    String(guideShopifySync.total || 0) + " profiles found in Shopify",
                  )
                : tr("Sincronização do Shopify precisa de atenção", "Shopify sync needs attention")}
          </div>
          <div className="pmy-ds-migrated-rhcrii">
            {guideShopifySync?.success === null
              ? tr(
                  "A Central abriu com os dados salvos e está atualizando os perfis sem bloquear a página.",
                  "The Central opened with cached data and is refreshing profiles without blocking the page.",
                )
              : guideShopifySync?.success
                ? tr(
                    "Os perfis ficam salvos na Central e são reconciliados em segundo plano. Alterações editoriais devem ser feitas no Shopify.",
                    "Profiles stay cached in the Central and are reconciled in the background. Editorial changes should be made in Shopify.",
                  )
                : (guideShopifySync?.error || tr(
                    "A Central continuará mostrando os guias já salvos e tentará sincronizar novamente em segundo plano.",
                    "The Central will keep showing saved guides and retry the sync in the background.",
                  ))}
          </div>
        </div>
      </Card>
    </div>
  );
}

function UnlinkedAccessRow({ user, people, currentUser, onSave, lang }) {
  const tr = (pt, en) => (lang === "en" ? en : pt);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const run = async (patch) => {
    setBusy(true);
    setMessage("");
    try { await onSave(user.id, patch); } catch (error) { setMessage(error?.message || tr("Não foi possível salvar.", "Could not save.")); }
    finally { setBusy(false); }
  };
  const seen = new Date(user.lastSeenAt);
  return (
    <div className="pmy-unlinked-access__row">
      <div>
        <strong>{user.name || `${tr("Acesso Shopify", "Shopify login")} #${String(user.shopifyUserId).slice(-6)}`}{currentUser?.id === user.id ? ` · ${tr("você", "you")}` : ""}</strong>
        <small>{tr("Último acesso", "Last seen")}: {Number.isNaN(seen.getTime()) ? "—" : new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "pt-PT", { dateStyle: "short", timeStyle: "short" }).format(seen)} · {user.role === "ADMIN" ? tr("Administrador", "Admin") : tr("Equipe", "Team")}</small>
      </div>
      <DropdownSelect value="" disabled={busy} placeholder={tr("Ligar a…", "Link to…")} ariaLabel={tr("Ligar a pessoa", "Link to person")}
        searchPlaceholder={tr("Buscar pessoa…", "Search person…")}
        onChange={(id) => id && run({ guideId: id })} options={people.map((p) => ({ value: p.id, label: p.name }))} />
      {message && <small role="alert" className="pmy-rotation__error">{message}</small>}
    </div>
  );
}
