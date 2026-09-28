export default function AgendaTab(props) {
  const {
    activeTab,
    activeTourLanguages,
    blockDateTime,
    blockMessage,
    blockPlatforms,
    blockRecurringDays,
    blockSaving,
    blockSelectedHour,
    blockTourId,
    blockedDates,
    bookingDate,
    bookingPlatforms,
    bookingTime,
    calendarView,
    currentMonthLabel,
    currentYear,
    custEmail,
    custLang,
    custName,
    custPhone,
    draftOrderError,
    draftOrderInfo,
    draftOrderLoading,
    generatedLink,
    getBookingTimesForTour,
    getLisbonToday,
    handleBlockTourSelectionChange,
    handleCapacityChange,
    handleCreateBlock,
    handleGeneratePaymentLink,
    handleNextMonth,
    handlePrevMonth,
    handleRemoveBlock,
    handleTogglePlatformSelection,
    handleTourSelectionChange,
    imageShape,
    platformConnections,
    renderCalendarDays,
    reservationPlatforms,
    selectedTour,
    setBlockDateTime,
    setBlockPlatforms,
    setBlockRecurringDays,
    setBlockSelectedHour,
    setBookingDate,
    setBookingPlatforms,
    setBookingTime,
    setCalendarView,
    setCustEmail,
    setCustLang,
    setCustName,
    setCustPhone,
    setDraftOrderInfo,
    setGeneratedLink,
    setTourVariants,
    t,
    tourAvailableHours,
    tourCapacities,
    tourOptions,
    tourVariants,
    tours,
    variantMatchesBookingTime,
    lang
  } = props;

  const tr = (pt, en) => lang === "en" ? en : pt;

  return (
    <>
{/* ===== TAB: AGENDA ===== */}
          {activeTab==='agenda' && (
            <div>
              <div className="pmy-agenda-form-grid">

                {/* ── FORMULÁRIO: NOVA RESERVA ── */}
                <div className="pmy-form-box">
                  <h3>{t.form_new_booking}</h3>
                  <form onSubmit={handleGeneratePaymentLink}>
                    <div className="pmy-form-group"><label>{t.form_customer}</label><input type="text" className="pmy-form-input" value={custName} onChange={e=>setCustName(e.target.value)} required /></div>
                    <div className="pmy-form-group"><label>{t.form_email}</label><input type="email" className="pmy-form-input" value={custEmail} onChange={e=>setCustEmail(e.target.value)} /></div>
                    <div className="pmy-form-group"><label>{t.form_phone}</label><input type="tel" className="pmy-form-input" value={custPhone} onChange={e=>setCustPhone(e.target.value)} /></div>
                    <div className="pmy-form-group">
                      <label>{t.form_select_tour}</label>
                      <select className="pmy-form-input" value={selectedTour} onChange={e=>handleTourSelectionChange(e.target.value)} required>
                        <option value="">-- {t.form_select_tour} --</option>
                        {tourOptions.map(t => <option key={t.id} value={t.id}>{t.title}{t.price ? ` — ${t.price}` : ""}</option>)}
                      </select>
                    </div>
                    {selectedTour && (
                      <div className="pmy-form-group">
                        <label>{t.form_lang}</label>
                        <select className="pmy-form-input" value={custLang} onChange={e=>setCustLang(e.target.value)}>
                          {activeTourLanguages.map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                      </div>
                    )}
                    {selectedTour && (() => {
                      const selTour = tourOptions.find(t => t.id === selectedTour);
                      const realVariants = selTour?.variants || [];
                      const timeOptions = getBookingTimesForTour(selTour);
                      const visibleVariants = realVariants.filter((variant) =>
                        variantMatchesBookingTime(variant, bookingTime)
                      );
                      const today = getLisbonToday();
                      const todayKey = `${today.year}-${String(today.monthIndex + 1).padStart(2,'0')}-${String(today.day).padStart(2,'0')}`;
                      return (
                        <div className="pmy-form-group" style={{ background:'#fefefe', padding:'15px', borderRadius:'8px', border:'1px solid #eee' }}>
                          <div className="pmy-booking-meta-grid">
                            <div>
                              <label style={{ fontSize:'12px', fontWeight:'700', color:'#555', display:'block', marginBottom:'6px' }}>{tr('📅 Data do Tour:','📅 Tour Date:')}</label>
                              <input type="date" className="pmy-form-input" min={todayKey} value={bookingDate} onChange={e=>setBookingDate(e.target.value)} required />
                            </div>
                            <div>
                              <label style={{ fontSize:'12px', fontWeight:'700', color:'#555', display:'block', marginBottom:'6px' }}>{tr('⏰ Horário do Tour:','⏰ Tour Time:')}</label>
                              {timeOptions.length > 0 ? (
                                <select className="pmy-form-input" value={bookingTime}
                                  onChange={e => {
                                    setBookingTime(e.target.value);
                                    setTourVariants({ adulto:0, jovem:0, crianca:0, senior:0 });
                                    setGeneratedLink("");
                                    setDraftOrderInfo(null);
                                  }} required>
                                  <option value="">-- {tr('Horário','Time')} --</option>
                                  {timeOptions.map(slot => <option key={slot} value={slot}>{slot}</option>)}
                                </select>
                              ) : (
                                <input type="time" className="pmy-form-input" value={bookingTime} onChange={e=>setBookingTime(e.target.value)} required />
                              )}
                            </div>
                          </div>

                          <label style={{ color:'var(--primary-green)', marginBottom:'10px', display:'block' }}>{tr('🛒 Ingressos por Variante Shopify:','🛒 Tickets by Shopify Variant:')}</label>
                          {visibleVariants.length > 0 ? (
                            <div className="pmy-variants-form-grid">
                              {visibleVariants.map(v => (
                                <div key={v.id}>
                                  <label style={{ fontSize:'11px', fontWeight:'700' }}>
                                    {v.title === 'Default Title' ? tr('Quantidade','Quantity') : v.title}
                                    <span style={{ color:'var(--primary-green)', marginLeft:'4px' }}>{v.price}</span>
                                  </label>
                                  <input type="number" className="pmy-form-input" min="0"
                                    value={tourVariants[v.id] || 0}
                                    onChange={e => setTourVariants({...tourVariants, [v.id]: parseInt(e.target.value)||0})} />
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div style={{ fontSize:'12px', color:'#b45309', background:'#fffbeb', border:'1px solid #fcd34d', borderRadius:'7px', padding:'9px 10px' }}>
                              {tr('⚠️ Nenhuma variante Shopify real foi carregada para este horário. O checkout não será criado com item genérico.','⚠️ No real Shopify variant was loaded for this time. The checkout will not be created with a generic item.')}
                            </div>
                          )}
                          {selTour?.image && (
                            <div style={{ marginTop:'10px', display:'flex', alignItems:'center', gap:'10px' }}>
                              <img src={selTour.image} alt={selTour.imageAlt} style={{ width:'40px', height:'40px', borderRadius:'6px', objectFit:'cover' }} />
                              <span style={{ fontSize:'12px', color:'#888' }}>{selTour.title}</span>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* PLATAFORMAS DA RESERVA */}
                    <div className="pmy-form-group" style={{ marginBottom:'18px' }}>
                      <label style={{ marginBottom:'4px', display:'block' }}>
                        {tr('Registrar entrada em qual plataforma?','Which platform should record this booking?')}
                        <span style={{ fontWeight:'400', color:'#aaa', fontSize:'11px', marginLeft:'6px' }}>{tr('Selecione uma ou mais','Select one or more')}</span>
                      </label>
                      <div className="pmy-platform-pills">
                        {reservationPlatforms.map(p => {
                          const conn = platformConnections[p.key];
                          const sel  = bookingPlatforms.includes(p.key);
                          return (
                            <button
                              key={p.key}
                              type="button"
                              className={`pmy-platform-pill${sel ? ' selected' : ''}${!conn.connected ? ' disconnected' : ''}`}
                              onClick={() => conn.connected && handleTogglePlatformSelection(p.key, bookingPlatforms, setBookingPlatforms)}
                              title={!conn.connected ? `${p.name} ${tr('não conectado','not connected')}` : ''}
                            >
                              <span className="pmy-platform-pill-logo">{p.logo}</span>
                              {p.name}
                              {sel && <span className="pmy-platform-pill-check">✓</span>}
                            </button>
                          );
                        })}
                      </div>
                      {bookingPlatforms.length === 0 && (
                        <div style={{ fontSize:'12px', color:'#e08000', marginTop:'6px', background:'#fffbeb', padding:'6px 10px', borderRadius:'6px', border:'1px solid #fcd34d' }}>
                          {tr('⚠️ Selecione pelo menos uma plataforma para registrar a reserva.','⚠️ Select at least one platform to record the booking.')}
                        </div>
                      )}
                    </div>

                    {draftOrderError && (
                      <div style={{ fontSize:'12px', color:'#b91c1c', marginBottom:'10px', background:'#fef2f2', border:'1px solid #fecaca', borderRadius:'7px', padding:'9px 10px' }}>
                        ❌ {draftOrderError}
                      </div>
                    )}
                    <button type="submit" className="pmy-btn-submit"
                      disabled={bookingPlatforms.length===0 || draftOrderLoading}
                      style={{ opacity:(bookingPlatforms.length===0 || draftOrderLoading) ? 0.5 : 1 }}>
                      {draftOrderLoading ? tr('Criando Draft Order no Shopify...','Creating Shopify Draft Order...') : tr('Criar checkout Shopify','Create Shopify checkout')}
                      {!draftOrderLoading && bookingPlatforms.length > 0 && <span style={{ marginLeft:'8px', fontSize:'11px', opacity:0.8 }}>{tr('→ Draft Order real','→ Real Draft Order')}</span>}
                    </button>
                  </form>
                  {generatedLink && (
                    <div style={{ marginTop:'15px', padding:'14px', background:'#e6f2e6', border:'1px solid var(--primary-green)', borderRadius:'8px', wordBreak:'break-all' }}>
                      <strong style={{ fontSize:'13px', color:'var(--primary-green)', display:'block', marginBottom:'5px' }}>{tr('✅ Draft Order criado no Shopify','✅ Draft Order created in Shopify')}{draftOrderInfo?.name ? ` · ${draftOrderInfo.name}` : ''}</strong>
                      {draftOrderInfo?.total && (
                        <div style={{ fontSize:'12px', color:'#47634e', marginBottom:'7px' }}>
                          Total: <strong>{draftOrderInfo.total} {draftOrderInfo.currency || ''}</strong> · {draftOrderInfo.date} · {draftOrderInfo.time} · {draftOrderInfo.language}
                        </div>
                      )}
                      <a href={generatedLink} target="_blank" rel="noreferrer" style={{ fontSize:'13px', color:'#0055cc', fontWeight:'700' }}>{tr('Abrir checkout seguro do Shopify ↗','Open secure Shopify checkout ↗')}</a>
                      <div style={{ fontSize:'10px', color:'#6b7b70', marginTop:'6px' }}>
                        {tr('O link acima é o invoiceUrl real devolvido pela API de Draft Orders do Shopify.','The link above is the real invoiceUrl returned by the Shopify Draft Orders API.')}
                      </div>
                    </div>
                  )}
                </div>

                {/* ── FORMULÁRIO: BLOQUEIO MANUAL ── */}
                <div className="pmy-form-box">
                  <h3>{t.form_new_block}</h3>
                  <form onSubmit={handleCreateBlock}>
                    <div className="pmy-form-group">
                      <label>{t.form_select_tour}</label>
                      <select className="pmy-form-input" value={blockTourId} onChange={e=>handleBlockTourSelectionChange(e.target.value)}>
                        <option value="">-- {t.form_select_tour} --</option>
                        {tourOptions.map(t => <option key={t.id} value={t.id}>{t.title}{t.price ? ` — ${t.price}` : ""}</option>)}
                      </select>
                    </div>
                    <div className="pmy-form-group"><label>{t.block_days_week}</label><input type="text" className="pmy-form-input" placeholder={tr('Ex: 0, 1 (Domingo e Segunda)','E.g. 0, 1 (Sunday and Monday)')} value={blockRecurringDays} onChange={e=>setBlockRecurringDays(e.target.value)} /></div>
                    <div className="pmy-form-group"><label>{t.form_date_time}</label><input type="date" className="pmy-form-input" value={blockDateTime} onChange={e=>setBlockDateTime(e.target.value)} /></div>
                    {blockTourId && (() => {
                      const selTour = tourOptions.find(t => t.id === blockTourId);
                      return (
                        <>
                          {/* Info do passeio selecionado */}
                          <div style={{ background:'#f5fcf5', border:'1px solid #c5e0c5', borderRadius:'8px', padding:'12px', marginBottom:'12px', display:'flex', gap:'10px', alignItems:'center' }}>
                            {selTour?.image && <img src={selTour.image} alt={selTour.imageAlt} style={{ width:'44px', height:'44px', borderRadius:'6px', objectFit:'cover', flexShrink:0 }} />}
                            <div>
                              <div style={{ fontWeight:'700', fontSize:'13px', color:'var(--text-dark)' }}>{selTour?.title}</div>
                              <div style={{ fontSize:'11px', color:'#888', marginTop:'2px' }}>
                                {selTour?.collections?.map(c=>c.title).join(' · ')}
                                {selTour?.price && <span style={{ color:'var(--primary-green)', marginLeft:'6px', fontWeight:'700' }}>{selTour.price}</span>}
                              </div>
                              {/* Variantes do produto */}
                              {selTour?.variants?.length > 1 && (
                                <div style={{ display:'flex', gap:'4px', flexWrap:'wrap', marginTop:'5px' }}>
                                  {selTour.variants.map((v,i) => (
                                    <span key={i} style={{ fontSize:'10px', background:'#fff', border:'1px solid #ddd', padding:'2px 6px', borderRadius:'4px', color:'#555' }}>
                                      {v.title === 'Default Title' ? tr('Ingresso','Ticket') : v.title}: {v.price}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Seletor de horário */}
                          <div className="pmy-form-group">
                            <label>{t.block_select_hour}</label>
                            <select className="pmy-form-input" value={blockSelectedHour} onChange={e=>setBlockSelectedHour(e.target.value)}>
                              <option value="ALL">{tr('🔒 Bloquear Todos os Horários','🔒 Block All Times')}</option>
                              {tourAvailableHours.length > 0
                                ? tourAvailableHours.map(h => {
                                    // Mostra quais variantes existem nesse horário
                                    const selTourForHour = tourOptions.find(t => t.id === blockTourId);
                                    const variantsAtHour = (selTourForHour?.variants || []).filter(v => (v.title || "").includes(h));
                                    return (
                                      <option key={h} value={h}>
                                        {h} {variantsAtHour.length > 0 ? `— ${variantsAtHour.length} variant${variantsAtHour.length > 1 ? 'es' : 'e'}` : ''}
                                      </option>
                                    );
                                  })
                                : null
                              }
                            </select>
                            {tourAvailableHours.length === 0 && (
                              <div style={{ fontSize:'11px', color:'#e08000', marginTop:'5px', background:'#fffbeb', padding:'5px 8px', borderRadius:'5px', border:'1px solid #fcd34d' }}>
                                {tr('⚠️ Nenhum horário encontrado. Os horários são extraídos automaticamente das variantes do produto (ex: "Adult / 09:30 - Tour") ou do metafield','⚠️ No time found. Times are automatically extracted from product variants (e.g. "Adult / 09:30 - Tour") or from the metafield')} <code>schedule</code>.
                              </div>
                            )}
                          </div>

                          {/* Metafields do produto */}
                          {selTour?.metafields && Object.keys(selTour.metafields).length > 0 && (
                            <div style={{ background:'#fafafa', border:'1px solid #eee', borderRadius:'8px', padding:'10px 12px', marginBottom:'12px' }}>
                              <div style={{ fontSize:'11px', fontWeight:'800', color:'#aaa', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'8px' }}>{tr('Metafields do Produto','Product Metafields')}</div>
                              <div style={{ display:'flex', flexDirection:'column', gap:'5px' }}>
                                {Object.entries(selTour.metafields).map(([key, val]) => (
                                  <div key={key} style={{ display:'flex', justifyContent:'space-between', fontSize:'12px' }}>
                                    <span style={{ color:'#888', fontFamily:'monospace' }}>{key}</span>
                                    <span style={{ color:'var(--text-dark)', fontWeight:'600', maxWidth:'60%', textAlign:'right', wordBreak:'break-all' }}>{val}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}

                    {/* PLATAFORMAS DO BLOQUEIO */}
                    <div className="pmy-form-group" style={{ marginBottom:'18px' }}>
                      <label style={{ marginBottom:'4px', display:'block' }}>
                        {tr('Bloquear em quais plataformas?','Which platforms should be blocked?')}
                        <span style={{ fontWeight:'400', color:'#aaa', fontSize:'11px', marginLeft:'6px' }}>{tr('Selecione uma ou mais','Select one or more')}</span>
                      </label>
                      <div className="pmy-platform-pills">
                        {reservationPlatforms.map(p => {
                          const conn = platformConnections[p.key];
                          const sel  = blockPlatforms.includes(p.key);
                          return (
                            <button
                              key={p.key}
                              type="button"
                              className={`pmy-platform-pill${sel ? ' selected-block' : ''}${!conn.connected ? ' disconnected' : ''}`}
                              onClick={() => handleTogglePlatformSelection(p.key, blockPlatforms, setBlockPlatforms)}
                              title={!conn.connected ? `${p.name} ${tr('não conectado','not connected')}` : ''}
                            >
                              <span className="pmy-platform-pill-logo">{p.logo}</span>
                              {p.name}
                              {sel && <span className="pmy-platform-pill-check">✓</span>}
                            </button>
                          );
                        })}
                      </div>
                      {blockPlatforms.length > 0 && (
                        <div style={{ fontSize:'12px', color:'#555', marginTop:'7px', display:'flex', alignItems:'center', gap:'6px' }}>
                          <span style={{ background:'#2b2b2b', color:'#fff', fontSize:'10px', fontWeight:'800', padding:'2px 8px', borderRadius:'10px' }}>{blockPlatforms.length}</span>
                          plataforma{blockPlatforms.length>1?'s':''}  será{blockPlatforms.length>1?'ão':''} bloqueada{blockPlatforms.length>1?'s':''}
                          {reservationPlatforms.filter(p=>platformConnections[p.key]?.connected && !blockPlatforms.includes(p.key)).length > 0 && (
                            <span style={{ color:'var(--primary-green)', fontWeight:'700' }}>
                              · {reservationPlatforms.filter(p=>platformConnections[p.key]?.connected && !blockPlatforms.includes(p.key)).length} continuará{reservationPlatforms.filter(p=>platformConnections[p.key]?.connected && !blockPlatforms.includes(p.key)).length>1?'ão':''} aberta{reservationPlatforms.filter(p=>platformConnections[p.key]?.connected && !blockPlatforms.includes(p.key)).length>1?'s':''}
                            </span>
                          )}
                        </div>
                      )}
                      {blockPlatforms.length === 0 && (
                        <div style={{ fontSize:'12px', color:'#e08000', marginTop:'6px', background:'#fffbeb', padding:'6px 10px', borderRadius:'6px', border:'1px solid #fcd34d' }}>
                          {tr('⚠️ Nenhuma plataforma selecionada — bloqueio não terá efeito.','⚠️ No platform selected — this block will have no effect.')}
                        </div>
                      )}
                    </div>

                    {blockMessage && (
                      <div style={{
                        fontSize:'12px',
                        marginBottom:'10px',
                        padding:'9px 11px',
                        borderRadius:'7px',
                        background: blockMessage.toLowerCase().includes("erro") || blockMessage.toLowerCase().includes("selecione") || blockMessage.toLowerCase().includes("informe") ? '#fff2f2' : '#eef8ee',
                        color: blockMessage.toLowerCase().includes("erro") || blockMessage.toLowerCase().includes("selecione") || blockMessage.toLowerCase().includes("informe") ? '#a40000' : '#006600',
                      }}>
                        {blockMessage}
                      </div>
                    )}
                    <button type="submit" className="pmy-btn-submit"
                      style={{ background:'#2b2b2b', opacity: (blockPlatforms.length===0 || blockSaving) ? 0.5 : 1 }}
                      disabled={blockPlatforms.length===0 || blockSaving}>
                      {blockSaving ? tr('Salvando bloqueio...','Saving block...') : t.form_btn_block}
                      {!blockSaving && blockPlatforms.length > 0 && <span style={{ marginLeft:'8px', fontSize:'11px', opacity:0.7 }}>em {blockPlatforms.length} plataforma{blockPlatforms.length>1?'s':''}</span>}
                    </button>
                  </form>

                  <div style={{ marginTop:'18px', borderTop:'1px solid #eee', paddingTop:'15px' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px' }}>
                      <strong style={{ fontSize:'13px', color:'#444' }}>{tr('🔒 Bloqueios ativos no banco','🔒 Active blocks in the database')}</strong>
                      <span style={{ fontSize:'11px', color:'#888' }}>{blockedDates.length} regra{blockedDates.length===1?'':'s'}</span>
                    </div>
                    {blockedDates.length === 0 ? (
                      <div style={{ fontSize:'12px', color:'#999', padding:'10px 0' }}>{tr('Nenhum bloqueio ativo.','No active blocks.')}</div>
                    ) : (
                      <div style={{ display:'flex', flexDirection:'column', gap:'7px', maxHeight:'260px', overflowY:'auto' }}>
                        {blockedDates.slice(0, 30).map(block => (
                          <div key={block.id} style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:'10px', alignItems:'center', background:'#fafafa', border:'1px solid #eee', borderRadius:'8px', padding:'9px 10px' }}>
                            <div>
                              <div style={{ fontSize:'12px', fontWeight:'800', color:'#333' }}>{block.tour?.title || tr('Todos os tours','All tours')}</div>
                              <div style={{ fontSize:'11px', color:'#777', marginTop:'3px' }}>
                                {block.date ? `📅 ${String(block.date).slice(0,10)}` : `🔁 dia da semana ${block.dayOfWeek}`}
                                {' · '}
                                {block.timeSlot === 'ALL' || !block.timeSlot ? tr('todos os horários','all times') : block.timeSlot}
                                {' · '}
                                {(block.platforms || []).length ? block.platforms.join(', ') : tr('todas as plataformas','all platforms')}
                              </div>
                            </div>
                            <button type="button" onClick={() => handleRemoveBlock(block.id)}
                              style={{ border:'none', background:'#ffe7e7', color:'#a40000', borderRadius:'6px', padding:'6px 9px', cursor:'pointer', fontSize:'11px', fontWeight:'800' }}>
                              Remover
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="pmy-form-box">
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px', flexWrap:'wrap', gap:'15px' }}>
                  <div className="pmy-calendar-month-selector-bar">
                    <button type="button" className="pmy-calendar-nav-arrow-btn" onClick={handlePrevMonth}>◀</button>
                    <div className="pmy-calendar-current-month-year-label">{currentMonthLabel} {currentYear}</div>
                    <button type="button" className="pmy-calendar-nav-arrow-btn" onClick={handleNextMonth}>▶</button>
                  </div>
                  <div className="pmy-calendar-view-tabs">
                    {[['1d',t.view_1d],['3d',t.view_3d],['7d',t.view_7d],['month',t.view_month]].map(([v,l]) => (
                      <button key={v} type="button" className={`pmy-cal-tab ${calendarView===v?'active':''}`} onClick={() => setCalendarView(v)}>{l}</button>
                    ))}
                  </div>
                </div>
                <div className="pmy-calendar-scroll">
                  {calendarView==="month" && (
                    <div className="pmy-calendar-week-headers">
                      <div>{tr('Seg','Mon')}</div><div>{tr('Ter','Tue')}</div><div>{tr('Qua','Wed')}</div><div>{tr('Qui','Thu')}</div><div>{tr('Sex','Fri')}</div><div>{tr('Sáb','Sat')}</div><div>{tr('Dom','Sun')}</div>
                    </div>
                  )}
                  <div className={`pmy-calendar-grid ${calendarView==='month'?'month-view':''}`}>{renderCalendarDays()}</div>
                </div>

                <div style={{ borderTop:'1px solid #eee', paddingTop:'20px' }}>
                  <h4 style={{ fontSize:'16px', fontWeight:'bold', color:'var(--primary-green)', marginBottom:'6px' }}>{tr('📊 Capacidade Máxima por Tour e Horário','📊 Maximum Capacity by Tour and Time')}</h4>
                  <div style={{ fontSize:'12px', color:'#888', marginBottom:'15px' }}>{tr('A Central desconta automaticamente desta capacidade todas as reservas confirmadas e pré-reservas ativas, independentemente do canal de venda.','The Central automatically deducts all confirmed bookings and active pre-bookings from this capacity, regardless of sales channel.')}</div>
                  {tourOptions.map(tour => {
                    const cap = tourCapacities[tour.id] !== undefined ? tourCapacities[tour.id] : 20;
                    return (
                      <div className="pmy-tour-item" key={tour.id}>
                        <div style={{ display:'flex', gap:'15px', alignItems:'center' }}>
                          <div className={`pmy-tour-img ${imageShape}`} style={{ display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px' }}>🏰</div>
                          <div>
                            <strong style={{ fontSize:'15px' }}>{tour.title}</strong>
                            <div style={{ fontSize:'12px', color:'#888', marginTop:'4px' }}>
                              {tour.price && <span style={{ color:'var(--primary-green)', fontWeight:'700', marginRight:'8px' }}>{tour.price}</span>}
                              {tr('Capacidade:','Capacity:')} {cap} {lang === 'en' ? `person${cap===1?'':'s'} per time` : `pessoa${cap===1?'':'s'} por horário`}
                              {cap===0 && <span style={{ color:'#cc0000', fontWeight:'bold', marginLeft:'10px' }}>{tr('🔒 VENDAS SUSPENSAS','🔒 SALES SUSPENDED')}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="pmy-capacity-controls">
                          <button type="button" className="pmy-cap-btn" onClick={() => handleCapacityChange(tour.id,-1)}>−</button>
                          <span style={{ fontWeight:'bold', fontSize:'14px', width:'20px', textAlign:'center' }}>{cap}</span>
                          <button type="button" className="pmy-cap-btn" onClick={() => handleCapacityChange(tour.id,1)}>+</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
    </>
  );
}
