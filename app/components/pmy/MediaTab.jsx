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
    shopifyImages,
    showShopifySource
  } = props;

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

              <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:'25px', alignItems:'start' }}>
                {/* Área principal */}
                <div>
                  {/* Header com filtros e toggle de fonte */}
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px', flexWrap:'wrap', gap:'10px' }}>
                    <div className="pmy-media-filter-tabs" style={{ marginBottom:0 }}>
                      {[
                        ['all','🗂️ Todas', mediaList.filter(m=>showShopifySource || !m.source?.startsWith('shopify')).length],
                        ['logo','🖼️ Logos', mediaList.filter(m=>m.category==='logo'&&(showShopifySource||!m.source?.startsWith('shopify'))).length],
                        ['guide','👤 Guias', mediaList.filter(m=>m.category==='guide'&&(showShopifySource||!m.source?.startsWith('shopify'))).length],
                        ['tour','🏰 Tours', mediaList.filter(m=>m.category==='tour'&&(showShopifySource||!m.source?.startsWith('shopify'))).length],
                        ['general','📎 Geral', mediaList.filter(m=>m.category==='general'&&(showShopifySource||!m.source?.startsWith('shopify'))).length],
                      ].map(([v,l,count]) => (
                        <button key={v} className={`pmy-media-ftab ${mediaFilter===v?'active':''}`} onClick={()=>setMediaFilter(v)}>
                          {l} <span style={{ opacity:0.7, marginLeft:'4px' }}>({count})</span>
                        </button>
                      ))}
                    </div>

                    {/* Toggle fonte Shopify */}
                    <div style={{ display:'flex', alignItems:'center', gap:'8px', background:'#f5f5f5', padding:'6px 14px', borderRadius:'20px', flexShrink:0 }}>
                      <span style={{ fontSize:'12px', fontWeight:'700', color:'#555' }}>🛍️ Imagens do Shopify</span>
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
                        {shopifyImages.length} imagens
                      </span>
                    </div>
                  </div>

                  {/* Grid de mídias */}
                  {mediaList.filter(m => mediaFilter==='all' || m.category===mediaFilter).length === 0 ? (
                    <div style={{ background:'#f9f9f9', borderRadius:'12px', padding:'50px', textAlign:'center', color:'#aaa' }}>
                      <div style={{ fontSize:'40px', marginBottom:'12px' }}>📂</div>
                      <div style={{ fontWeight:'700', fontSize:'15px', marginBottom:'6px' }}>Nenhuma mídia nesta categoria</div>
                      <div style={{ fontSize:'13px' }}>Use o painel ao lado para fazer upload</div>
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
                            {media.source?.startsWith('shopify') && (
                              <div style={{
                                position:'absolute', top:'8px', left:'8px', zIndex:2,
                                background:'rgba(0,0,0,0.55)', backdropFilter:'blur(4px)',
                                color:'#fff', fontSize:'9px', fontWeight:'800', padding:'2px 7px',
                                borderRadius:'10px', textTransform:'uppercase', letterSpacing:'0.3px'
                              }}>
                                🛍️ {media.source === 'shopify_product' ? 'Produto' : 'Files'}
                              </div>
                            )}

                            {/* Ações hover */}
                            <div className="pmy-media-actions" onClick={e=>e.stopPropagation()}>
                              <button className="pmy-media-action-btn pmy-media-action-copy"
                                title="Copiar URL" onClick={() => handleCopyMediaUrl(media.url)}>📋</button>
                              {/* Só mostra excluir para uploads próprios */}
                              {!media.source?.startsWith('shopify') && (
                                <button className="pmy-media-action-btn pmy-media-action-delete"
                                  title="Remover" onClick={() => handleDeleteMedia(media.id)}>🗑️</button>
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
                                {media.category === 'logo' ? '🖼️ Logo' : media.category === 'guide' ? '👤 Guia' : media.category === 'tour' ? '🏰 Tour' : '📎 Geral'}
                              </span>
                              <div className="pmy-media-label" title={media.label || media.filename}>{media.label || media.filename}</div>
                              <div className="pmy-media-meta">
                                {media.source === 'shopify_product' && <span style={{ color:'#cc9900' }}>{media.productTitle} · </span>}
                                {media.filename?.length > 25 ? media.filename.slice(0,22)+'...' : media.filename}
                                {media.isLocal && <span style={{ color:'#e08000', marginLeft:'5px' }}>• local</span>}
                              </div>
                            </div>
                          </div>
                        ))
                      }
                    </div>
                  )}
                </div>

                {/* Painel de upload */}
                <div style={{ position:'sticky', top:'0' }}>
                  <div className="pmy-form-box" style={{ marginBottom:0 }}>
                    <h3 style={{ marginBottom:'16px' }}>📤 Adicionar Mídia</h3>

                    <div className="pmy-form-group">
                      <label>Categoria:</label>
                      <select className="pmy-form-input" value={mediaCategoryInput} onChange={e=>setMediaCategoryInput(e.target.value)}>
                        <option value="logo">🖼️ Logo</option>
                        <option value="guide">👤 Foto de Guia</option>
                        <option value="tour">🏰 Imagem de Tour</option>
                        <option value="general">📎 Geral</option>
                      </select>
                    </div>

                    <div className="pmy-form-group">
                      <label>Nome/Etiqueta (opcional):</label>
                      <input type="text" className="pmy-form-input" placeholder="Ex: Logo PMY 2024"
                        value={mediaLabelInput} onChange={e=>setMediaLabelInput(e.target.value)} />
                    </div>

                    <input type="file" accept="image/*,application/pdf" ref={mediaUploadRef}
                      style={{ display:'none' }} onChange={handleMediaUpload} />

                    <div style={{ display:'flex', flexDirection:'column', gap:'8px', marginBottom:'8px' }}>
                      <button type="button" className="pmy-btn-submit"
                        onClick={() => {
                          window.__pmyPickerCallback = (url) => {
                            const newItem = {
                              id: `shopify_picked_${Date.now()}`,
                              url,
                              filename: url.split('/').pop().split('?')[0],
                              mimetype: 'image/jpeg',
                              category: mediaCategoryInput,
                              label: mediaLabelInput || url.split('/').pop().split('?')[0],
                              source: 'shopify_files',
                              createdAt: new Date().toISOString(),
                            };
                            setMediaList(prev => prev.some(m => m.url === url) ? prev : [newItem, ...prev]);
                            setMediaLabelInput('');
                            window.__pmyPickerCallback = null;
                          };
                          setActiveModal('pickPhotoForGuide');
                        }}>
                        🖼️ Selecionar do Banco de Imagens
                      </button>
                      <div style={{ textAlign:'center', fontSize:'11px', color:'#aaa' }}>ou</div>
                    </div>
                    <div className="pmy-upload-zone" onClick={() => !mediaUploading && mediaUploadRef.current?.click()}>
                      {mediaUploading ? (
                        <div>
                          <div style={{ fontSize:'24px', marginBottom:'8px' }}>⏳</div>
                          <div style={{ fontSize:'13px', fontWeight:'700', color:'var(--primary-green)', marginBottom:'8px' }}>
                            Enviando... {mediaUploadProgress}%
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
                          <div style={{ fontSize:'11px', color:'#aaa' }}>PNG, JPG, GIF, PDF · Máx 10MB</div>
                        </div>
                      )}
                    </div>

                    <div style={{ marginTop:'20px', padding:'12px', background:'#f5f5f5', borderRadius:'8px', fontSize:'12px', color:'#888', lineHeight:'1.6' }}>
                      <strong style={{ display:'block', color:'#555', marginBottom:'4px' }}>💡 Como usar:</strong>
                      <div>• <strong>Logo</strong> → aparece na sidebar do app</div>
                      <div>• <strong>Guia</strong> → foto de perfil dos guias</div>
                      <div>• <strong>Tour</strong> → imagem dos passeios</div>
                      <div>• Clique em 📋 para copiar a URL de qualquer imagem</div>
                      <div>• Clique na imagem para ampliar</div>
                    </div>

                    {/* Estatísticas */}
                    <div style={{ marginTop:'16px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
                      {[
                        { label:'Total', count: mediaList.length, color:'#555' },
                        { label:'Uploads', count: mediaList.filter(m=>!m.source?.startsWith('shopify')).length, color:'var(--primary-green)' },
                        { label:'Shopify', count: shopifyImages.length, color:'#e08000' },
                        { label:'Tours', count: mediaList.filter(m=>m.category==='tour').length, color:'#cc9900' },
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
                        <strong>Uploads</strong> — enviados diretamente aqui
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                        <span style={{ width:'8px', height:'8px', borderRadius:'50%', background:'#e08000', display:'inline-block' }}></span>
                        <strong>🛍️ Shopify</strong> — imagens dos seus produtos e Files
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
