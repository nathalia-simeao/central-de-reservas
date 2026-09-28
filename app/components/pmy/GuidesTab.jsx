export default function GuidesTab(props) {
  const {
    activeTab,
    ddiList,
    getFlagUrl,
    guideDdi,
    guideEmail,
    guideName,
    guidePhoto,
    guidePhotoRef,
    guideUtmId,
    guideWhatsapp,
    guidesList,
    handleAddGuide,
    handleDeleteGuide,
    handleGuidePhotoChange,
    handleOpenEditGuide,
    openShopifyFilePicker,
    setActiveModal,
    setGuideDdi,
    setGuideEmail,
    setGuideName,
    setGuidePhoto,
    setGuideUtmId,
    setGuideWhatsapp,
    setSelectedGuideInfo,
    setUpcomingToursFilter,
    t,
    upcomingToursFilter,
    lang
  } = props;

  const tr = (pt, en) => lang === "en" ? en : pt;

  return (
    <>
{/* ===== TAB: GUIAS ===== */}
          {activeTab==='guias' && (
            <div>
              <div className="pmy-form-box" style={{ maxWidth:'600px', margin:'0 auto 40px auto' }}>
                <h3>{t.form_new_guide}</h3>
                <form onSubmit={handleAddGuide}>
                  <div className="pmy-form-group"><label>{t.form_guide_name}</label><input type="text" className="pmy-form-input" value={guideName} onChange={e=>setGuideName(e.target.value)} required /></div>
                  <div className="pmy-form-group"><label>{t.form_guide_email}</label><input type="email" className="pmy-form-input" value={guideEmail} onChange={e=>setGuideEmail(e.target.value)} /></div>
                  <div className="pmy-form-group">
                    <label>{t.form_guide_whatsapp}</label>
                    <div style={{ display:'flex', gap:'10px', alignItems:'center' }}>
                      <div style={{ position:'relative', display:'flex', alignItems:'center', flexShrink:0 }}>
                        <img src={getFlagUrl(ddiList.find(d=>d.code===guideDdi)?.iso||'pt')} alt=""
                          style={{ position:'absolute', left:'10px', width:'20px', height:'14px', objectFit:'cover', borderRadius:'2px', zIndex:1, pointerEvents:'none', boxShadow:'0 1px 3px rgba(0,0,0,0.2)' }} />
                        <select className="pmy-form-input" style={{ width:'120px', paddingLeft:'38px' }} value={guideDdi} onChange={e=>setGuideDdi(e.target.value)}>
                          {ddiList.map((d,i) => <option key={i} value={d.code}>{d.code}</option>)}
                        </select>
                      </div>
                      <input type="tel" className="pmy-form-input" placeholder="912 345 678" value={guideWhatsapp} onChange={e=>setGuideWhatsapp(e.target.value)} required />
                    </div>
                  </div>
                  <div className="pmy-form-group">
                    <label>{t.form_guide_photo}</label>
                    <div style={{ display:'flex', gap:'8px', alignItems:'center', flexWrap:'wrap' }}>
                      <button type="button" className="pmy-format-btn" onClick={() => guidePhotoRef.current.click()}>{tr('📤 Upload','📤 Upload')}</button>
                      <input type="file" accept="image/*" onChange={handleGuidePhotoChange} style={{ display:'none' }} ref={guidePhotoRef} />
                      <button type="button" className="pmy-format-btn" onClick={() => openShopifyFilePicker((url) => setGuidePhoto(url))}>
                        🛍️ Escolher do Banco
                      </button>
                      {guidePhoto && <img src={guidePhoto} alt="preview" style={{ width:'40px', height:'40px', borderRadius:'8px', objectFit:'cover' }} />}
                    </div>
                  </div>
                  <div className="pmy-form-group">
                    <label>{tr('ID da Campanha UTM (opcional):','UTM Campaign ID (optional):')}</label>
                    <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
                      <input type="text" className="pmy-form-input" placeholder="Ex: 21d91c"
                        value={guideUtmId} onChange={e=>setGuideUtmId(e.target.value)}
                        style={{ fontFamily:'monospace' }} />
                    </div>
                    {guideUtmId && guideName && (
                      <div style={{ marginTop:'6px', fontSize:'11px', background:'#f0fdf4', border:'1px solid #b8e6b8', borderRadius:'6px', padding:'6px 10px', wordBreak:'break-all', color:'#555' }}>
                        🔗 {`https://portugalmeandyou.com/?utm_campaign=${guideUtmId}&utm_source=guia&utm_medium=indicacao&utm_content=${guideName.toLowerCase().replace(/\s+/g,"_").replace(/[^a-z0-9_]/g,"")}`}
                      </div>
                    )}
                  </div>
                  <button type="submit" className="pmy-btn-submit" style={{ marginTop:'10px' }}>{t.btn_add_guide}</button>
                </form>
              </div>

              <div className="pmy-form-box">
                <h3 style={{ marginBottom:'25px' }}>{t.registered_guides_list}</h3>
                {guidesList.length === 0 ? <p style={{ color:'#999' }}>{tr('Nenhum guia cadastrado.','No guides registered.')}</p> : (
                  <div className="pmy-guides-grid">
                    {guidesList.map(g => (
                      <div key={g.id} className="pmy-guide-card-square" style={{ paddingBottom:'10px' }}
                        onClick={() => { setSelectedGuideInfo(g); setActiveModal('guideDetails'); }}>
                        <img src={g.photo} alt={g.name} className="pmy-guide-square-img" />
                        <div className="pmy-guide-square-name">{g.name.split(' ')[0]}<br/>{g.name.split(' ').slice(1).join(' ')}</div>
                        <div style={{ display:'flex', gap:'5px', marginTop:'10px', width:'100%' }} onClick={e=>e.stopPropagation()}>
                          <button className="pmy-guide-edit-btn" onClick={()=>handleOpenEditGuide(g)}>{tr('✏️ Editar','✏️ Edit')}</button>
                          {g.referralLink && (
                            <button title={tr('Copiar link de indicação','Copy referral link')} onClick={()=>navigator.clipboard.writeText(g.referralLink).then(()=>alert(tr('Link copiado!','Link copied!'))).catch(()=>{})}
                              style={{ padding:'5px 8px', background:'#f0fdf4', border:'1px solid #b8e6b8', borderRadius:'6px', fontSize:'13px', cursor:'pointer' }}>🔗</button>
                          )}
                          <button className="pmy-guide-delete-btn" onClick={()=>handleDeleteGuide(g.id)}>🗑️</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pmy-form-box">
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'1px solid #f5f5f5', paddingBottom:'15px', marginBottom:'15px' }}>
                  <h3 style={{ borderBottom:'none', margin:0, padding:0 }}>🚐 {t.upcoming_tours_list}</h3>
                  <div className="pmy-calendar-view-tabs" style={{ margin:0 }}>
                    {[['today',t.filter_today],['7d',t.view_7d],['15d',tr('15 dias','15 days')],['30d',tr('30 dias','30 days')]].map(([v,l]) => (
                      <button key={v} className={`pmy-cal-tab ${upcomingToursFilter===v?'active':''}`} onClick={() => setUpcomingToursFilter(v)}>{l}</button>
                    ))}
                  </div>
                </div>
                <div style={{ background:'#fdfdfd', padding:'15px', borderRadius:'8px', border:'1px solid #eee' }}>
                  {upcomingToursFilter === 'today' ? (
                    <div className="pmy-list-item" style={{ borderBottom:'none' }}>
                      <span style={{ fontWeight:'bold' }}>🏰 Fátima, Batalha e Nazaré</span>
                      <span style={{ fontSize:'12px', background:'#e6f2e6', color:'var(--primary-green)', padding:'4px 10px', borderRadius:'20px' }}>{tr('Hoje, 14:00 (Guia: Renan)','Today, 14:00 (Guide: Renan)')}</span>
                    </div>
                  ) : (
                    <div>
                      <div className="pmy-list-item"><span style={{ fontWeight:'bold' }}>🏰 Fátima, Batalha e Nazaré</span><span style={{ fontSize:'12px', background:'#f5f5f5', padding:'4px 10px', borderRadius:'20px' }}>{tr('Amanhã, 09:00','Tomorrow, 09:00')}</span></div>
                      <div className="pmy-list-item"><span style={{ fontWeight:'bold' }}>🚶‍♂️ Walking Tour Lisboa</span><span style={{ fontSize:'12px', background:'#f5f5f5', padding:'4px 10px', borderRadius:'20px' }}>{tr('Daqui a 3 dias','In 3 days')}</span></div>
                      <div className="pmy-list-item" style={{ borderBottom:'none' }}><span style={{ fontWeight:'bold' }}>🏰 Sintra e Cascais</span><span style={{ fontSize:'12px', background:'#f5f5f5', padding:'4px 10px', borderRadius:'20px' }}>{tr('Daqui a 5 dias','In 5 days')}</span></div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
    </>
  );
}
