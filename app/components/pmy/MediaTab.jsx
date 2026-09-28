// PMY unified media library: PostgreSQL catalog + Shopify Files/product references.
export default function MediaTab(props) {
  const {
    activeTab,
    handleCopyMediaUrl,
    handleDeleteMedia,
    handleMediaUpload,
    mediaCategoryInput,
    mediaFilter,
    mediaLabelInput,
    mediaList,
    mediaPreview,
    mediaUploadError,
    mediaUploadProgress,
    mediaUploadRef,
    mediaUploading,
    setActiveModal,
    setMediaCategoryInput,
    setMediaFilter,
    setMediaLabelInput,
    setMediaList,
    setMediaPreview,
    setShowShopifySource,
    showShopifySource,
    lang
  } = props;

  const tr = (pt, en) => lang === "en" ? en : pt;

  const shopifyMediaCount = mediaList.filter((item) =>
    String(item.source || "").startsWith("shopify_"),
  ).length;
  const pmyUploadCount = mediaList.filter(
    (item) => !String(item.source || "").startsWith("shopify_"),
  ).length;

  return (
    <>
{/* ===== TAB: BANCO DE MÍDIAS ===== */}
          {activeTab==='midias' && (
            <div>
              {/* Preview modal */}
              {mediaPreview && (
                <div className="pmy-media-preview-overlay" onClick={() => setMediaPreview(null)}>
                  <img src={mediaPreview} alt="preview" className="pmy-media-preview-img" onClick={e=>e.stopPropagation()} />
                </div>
              )}

              <div className="pmy-media-layout">
                {/* Área principal */}
                <div>
                  {/* Header com filtros e toggle de fonte */}
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px', flexWrap:'wrap', gap:'10px' }}>
                    <div className="pmy-media-filter-tabs" style={{ marginBottom:0 }}>
                      {[
                        ['all',tr('🗂️ Todas','🗂️ All'), mediaList.filter(m=>showShopifySource || !m.source?.startsWith('shopify')).length],
                        ['logo',tr('🖼️ Logos','🖼️ Logos'), mediaList.filter(m=>m.category==='logo'&&(showShopifySource||!m.source?.startsWith('shopify'))).length],
                        ['guide',tr('👤 Guias','👤 Guides'), mediaList.filter(m=>m.category==='guide'&&(showShopifySource||!m.source?.startsWith('shopify'))).length],
                        ['tour',tr('🏰 Tours','🏰 Tours'), mediaList.filter(m=>m.category==='tour'&&(showShopifySource||!m.source?.startsWith('shopify'))).length],
                        ['general',tr('📎 Geral','📎 General'), mediaList.filter(m=>m.category==='general'&&(showShopifySource||!m.source?.startsWith('shopify'))).length],
                      ].map(([v,l,count]) => (
                        <button key={v} className={`pmy-media-ftab ${mediaFilter===v?'active':''}`} onClick={()=>setMediaFilter(v)}>
                          {l} <span style={{ opacity:0.7, marginLeft:'4px' }}>({count})</span>
                        </button>
                      ))}
                    </div>

                    {/* Toggle fonte Shopify */}
                    <div style={{ display:'flex', alignItems:'center', gap:'8px', background:'#f5f5f5', padding:'6px 14px', borderRadius:'20px', flexShrink:0 }}>
                      <span style={{ fontSize:'12px', fontWeight:'700', color:'#555' }}>{tr('🛍️ Fontes Shopify','🛍️ Shopify Sources')}</span>
                      <label style={{ position:'relative', width:'36px', height:'20px', cursor:'pointer', flexShrink:0 }}>
                        <input type="checkbox" checked={showShopifySource} onChange={e=>setShowShopifySource(e.target.checked)}
                          style={{ opacity:0, width:0, height:0 }} />
                        <span style={{
                          position:'absolute', top:0, left:0, right:0, bottom:0,
                          background: showShopifySource ? 'var(--primary-green)' : '#ddd',
                          borderRadius:'20px', transition:'0.2s'
                        }}>
                          <span style={{
                            position:'absolute', width:'14px', height:'14px', top:'3px',
                            left: showShopifySource ? '19px' : '3px',
                            background:'#fff', borderRadius:'50%', transition:'0.2s'
                          }}></span>
                        </span>
                      </label>
                      <span style={{ fontSize:'11px', color:'#aaa' }}>
                        {shopifyMediaCount} {tr('itens','items')}
                      </span>
                    </div>
                  </div>

                  {/* Grid de mídias */}
                  {mediaList.filter(m => mediaFilter==='all' || m.category===mediaFilter).length === 0 ? (
                    <div style={{ background:'#f9f9f9', borderRadius:'12px', padding:'50px', textAlign:'center', color:'#aaa' }}>
                      <div style={{ fontSize:'40px', marginBottom:'12px' }}>📂</div>
                      <div style={{ fontWeight:'700', fontSize:'15px', marginBottom:'6px' }}>{tr('Nenhuma mídia nesta categoria','No media in this category')}</div>
                      <div style={{ fontSize:'13px' }}>{tr('Use o painel ao lado para fazer upload','Use the panel beside it to upload a file')}</div>
                    </div>
                  ) : (
                    <div className="pmy-media-grid">
                      {mediaList
                        .filter(m => {
                          if (!showShopifySource && m.source?.startsWith('shopify')) return false;
                          if (mediaFilter !== 'all' && m.category !== mediaFilter) return false;
                          return true;
                        })
                        .map(media => (
                          <div key={media.id} className="pmy-media-card" onClick={() => setMediaPreview(media.url)}>
                            {/* Badge de fonte */}
                            <div style={{
                              position:'absolute', top:'8px', left:'8px', zIndex:2,
                              background:'rgba(0,0,0,0.55)', backdropFilter:'blur(4px)',
                              color:'#fff', fontSize:'9px', fontWeight:'800', padding:'2px 7px',
                              borderRadius:'10px', textTransform:'uppercase', letterSpacing:'0.3px'
                            }}>
                              {media.source === 'shopify_product'
                                ? tr('🛍️ Produto','🛍️ Product')
                                : media.source === 'shopify_files'
                                  ? '🛍️ Shopify Files'
                                  : '🗂️ PMY'}
                            </div>

                            {/* Ações hover */}
                            <div className="pmy-media-actions" onClick={e=>e.stopPropagation()}>
                              <button className="pmy-media-action-btn pmy-media-action-copy"
                                title={tr('Copiar URL','Copy URL')} onClick={() => handleCopyMediaUrl(media.url)}>📋</button>
                              {/* Só mostra excluir para uploads próprios */}
                              {!media.source?.startsWith('shopify') && (
                                <button className="pmy-media-action-btn pmy-media-action-delete"
                                  title={tr('Remover','Remove')} onClick={() => handleDeleteMedia(media.id)}>🗑️</button>
                              )}
                            </div>

                            {/* Thumbnail */}
                            {media.mimetype?.startsWith('image/')
                              ? <img src={media.url} alt={media.label} className="pmy-media-thumb"
                                  onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }}
                                />
                              : null
                            }
                            <div className="pmy-media-thumb-placeholder" style={{ display: media.mimetype?.startsWith('image/') ? 'none' : 'flex' }}>📄</div>

                            {/* Info */}
                            <div className="pmy-media-info">
                              <span className={`pmy-media-cat-badge pmy-media-cat-${media.category}`}>
                                {media.category === 'logo' ? '🖼️ Logo' : media.category === 'guide' ? tr('👤 Guia','👤 Guide') : media.category === 'tour' ? '🏰 Tour' : tr('📎 Geral','📎 General')}
                              </span>
                              <div className="pmy-media-label" title={media.label || media.filename}>{media.label || media.filename}</div>
                              <div className="pmy-media-meta">
                                {media.source === 'shopify_product' && <span style={{ color:'#cc9900' }}>{media.productTitle} · </span>}
                                {media.filename?.length > 25 ? media.filename.slice(0,22)+'...' : media.filename}
                                {media.width && media.height ? <span> · {media.width}×{media.height}</span> : null}
                              </div>
                            </div>
                          </div>
                        ))
                      }
                    </div>
                  )}
                </div>

                {/* Painel de upload */}
                <div className="pmy-media-upload-panel">
                  <div className="pmy-form-box" style={{ marginBottom:0 }}>
                    <h3 style={{ marginBottom:'16px' }}>{tr('📤 Adicionar Mídia','📤 Add Media')}</h3>

                    <div className="pmy-form-group">
                      <label>{tr('Categoria:','Category:')}</label>
                      <select className="pmy-form-input" value={mediaCategoryInput} onChange={e=>setMediaCategoryInput(e.target.value)}>
                        <option value="logo">🖼️ Logo</option>
                        <option value="guide">{tr('👤 Foto de Guia','👤 Guide Photo')}</option>
                        <option value="tour">{tr('🏰 Imagem de Tour','🏰 Tour Image')}</option>
                        <option value="general">{tr('📎 Geral','📎 General')}</option>
                      </select>
                    </div>

                    <div className="pmy-form-group">
                      <label>{tr('Nome/Etiqueta (opcional):','Name/Label (optional):')}</label>
                      <input type="text" className="pmy-form-input" placeholder={tr('Ex: Logo PMY 2024','E.g. PMY Logo 2024')}
                        value={mediaLabelInput} onChange={e=>setMediaLabelInput(e.target.value)} />
                    </div>

                    <input type="file" accept="image/*,application/pdf" ref={mediaUploadRef}
                      style={{ display:'none' }} onChange={handleMediaUpload} />

                    <div style={{ display:'flex', flexDirection:'column', gap:'8px', marginBottom:'8px' }}>
                      <button
                        type="button"
                        className="pmy-format-btn"
                        onClick={() => window.location.reload()}
                      >
                        🔄 Atualizar fontes Shopify
                      </button>
                      <div style={{ textAlign:'center', fontSize:'11px', color:'#aaa', lineHeight:'1.4' }}>
                        Shopify Files e imagens de produtos são reconciliados automaticamente com a biblioteca PMY.
                      </div>
                    </div>
                    {mediaUploadError && (
                      <div style={{ marginBottom:'10px', padding:'9px 10px', background:'#fef2f2', border:'1px solid #fecaca', borderRadius:'8px', color:'#b91c1c', fontSize:'12px', lineHeight:'1.4' }}>
                        ❌ {mediaUploadError}
                      </div>
                    )}
                    <div className="pmy-upload-zone" onClick={() => !mediaUploading && mediaUploadRef.current?.click()}>
                      {mediaUploading ? (
                        <div>
                          <div style={{ fontSize:'24px', marginBottom:'8px' }}>⏳</div>
                          <div style={{ fontSize:'13px', fontWeight:'700', color:'var(--primary-green)', marginBottom:'8px' }}>
                            {tr('Enviando...','Uploading...')} {mediaUploadProgress}%
                          </div>
                          <div className="pmy-upload-progress">
                            <div className="pmy-upload-progress-bar" style={{ width:`${mediaUploadProgress}%` }}></div>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div style={{ fontSize:'32px', marginBottom:'8px' }}>📁</div>
                          <div style={{ fontSize:'13px', fontWeight:'700', color:'#555', marginBottom:'4px' }}>
                            Clique para selecionar arquivo
                          </div>
                          <div style={{ fontSize:'11px', color:'#aaa' }}>PNG, JPG, GIF, PDF · {tr('Máx','Max')} 10MB</div>
                        </div>
                      )}
                    </div>

                    <div style={{ marginTop:'20px', padding:'12px', background:'#f5f5f5', borderRadius:'8px', fontSize:'12px', color:'#888', lineHeight:'1.6' }}>
                      <strong style={{ display:'block', color:'#555', marginBottom:'4px' }}>{tr('💡 Biblioteca única PMY:','💡 Unified PMY Library:')}</strong>
                      <div>{tr('• Uploads feitos aqui são gravados no ','• Uploads made here are stored in ')}<strong>Shopify Files + PostgreSQL</strong></div>
                      <div>• <strong>Logo</strong> → {tr('aparece na sidebar do app','appears in the app sidebar')}</div>
                      <div>• <strong>{tr('Guia','Guide')}</strong> → {tr('foto de perfil dos guias','guide profile photo')}</div>
                      <div>• <strong>Tour</strong> → {tr('imagem dos passeios','tour image')}</div>
                      <div>{tr('• Clique em 📋 para copiar a URL de qualquer imagem','• Click 📋 to copy any image URL')}</div>
                      <div>{tr('• Clique na imagem para ampliar','• Click an image to enlarge it')}</div>
                    </div>

                    {/* Estatísticas */}
                    <div style={{ marginTop:'16px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
                      {[
                        { label:tr('Total','Total'), count: mediaList.length, color:'#555' },
                        { label:'PMY', count: pmyUploadCount, color:'var(--primary-green)' },
                        { label:'Shopify', count: shopifyMediaCount, color:'#e08000' },
                        { label:tr('Tours','Tours'), count: mediaList.filter(m=>m.category==='tour').length, color:'#cc9900' },
                      ].map((stat,i) => (
                        <div key={i} style={{ background:'#fafafa', border:'1px solid #eee', borderRadius:'8px', padding:'10px 12px', textAlign:'center' }}>
                          <div style={{ fontSize:'20px', fontWeight:'900', color:stat.color }}>{stat.count}</div>
                          <div style={{ fontSize:'11px', color:'#aaa', fontWeight:'600' }}>{stat.label}</div>
                        </div>
                      ))}
                    </div>

                    {/* Legenda de fontes */}
                    <div style={{ marginTop:'12px', padding:'10px 12px', background:'#fafafa', borderRadius:'8px', fontSize:'11px', color:'#888', lineHeight:'1.8' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'3px' }}>
                        <span style={{ width:'8px', height:'8px', borderRadius:'50%', background:'var(--primary-green)', display:'inline-block' }}></span>
                        <strong>PMY</strong> — uploads gerenciados pela Central e armazenados no Shopify Files
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                        <span style={{ width:'8px', height:'8px', borderRadius:'50%', background:'#e08000', display:'inline-block' }}></span>
                        <strong>🛍️ Shopify</strong> — referências sincronizadas de Files e imagens dos produtos
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
    </>
  );
}
