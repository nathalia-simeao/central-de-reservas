export default function SettingsTab(props) {
  const {
    activeMappingPlatform,
    activeTab,
    allPlatforms,
    defaultMappings,
    fieldMappings,
    fileInputRef,
    handleLogoChange,
    handleRemoveLogo,
    handleThemeChange,
    handleRestoreThemeDefaults,
    handleImageShapeChange,
    handleSaveFieldMappings,
    handleResetFieldMappings,
    handleUpdateFieldMapping,
    imageShape,
    internalFields,
    logoUrl,
    platformConnections,
    reservationPlatforms,
    setActiveMappingPlatform,
    settingsSaveMessage,
    shopifyStaff,
    t,
    theme
  } = props;

  return (
    <>
{/* ===== TAB: CONFIGURAÇÕES ===== */}
          {activeTab==='configuracoes' && (
            <div style={{ display:'grid', gap:'30px' }}>

              {/* LOGO */}
              <div className="pmy-form-box">
                <h3>🖼️ Logo da Agência</h3>
                <p style={{ fontSize:'13px', color:'#666', marginBottom:'8px' }}>Aparece na barra lateral. Salva automaticamente no banco e fica igual em qualquer navegador ou máquina.</p>
                {settingsSaveMessage && (
                  <div style={{ fontSize:'11px', fontWeight:'800', color:settingsSaveMessage.includes('Erro')?'#b91c1c':'var(--primary-green)', marginBottom:'14px' }}>
                    {settingsSaveMessage}
                  </div>
                )}
                <div style={{ display:'flex', gap:'15px', alignItems:'center' }}>
                  <input type="file" accept="image/*" onChange={handleLogoChange} style={{ display:'none' }} ref={fileInputRef} />
                  {logoUrl
                    ? <img src={logoUrl} alt="Logo" style={{ height:'60px', maxWidth:'180px', objectFit:'contain', background:'#f5f5f5', padding:'8px', borderRadius:'8px', border:'1px solid #eee' }} />
                    : <div style={{ width:'120px', height:'60px', background:'#f5f5f5', borderRadius:'8px', border:'2px dashed #ddd', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', color:'#aaa' }}>Sem logo</div>
                  }
                  <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                    <button type="button" className="pmy-format-btn" onClick={() => fileInputRef.current.click()}>📤 Carregar Logo</button>
                    {logoUrl && <button type="button" className="pmy-format-btn" style={{ color:'#cc0000', background:'#ffe6e6' }} onClick={handleRemoveLogo}>🗑️ Remover</button>}
                  </div>
                </div>
              </div>

              {/* PERSONALIZAÇÃO / THEME */}
              <div className="pmy-form-box">
                <h3>🎨 Personalização Visual</h3>
                <p style={{ fontSize:'13px', color:'#666', marginBottom:'25px' }}>Adapte o sistema às cores e tipografia da sua marca. As alterações são salvas automaticamente.</p>

                {/* Presets rápidos */}
                <div className="pmy-form-group">
                  <label>Esquemas Prontos (Presets):</label>
                  <div style={{ display:'flex', gap:'10px', flexWrap:'wrap', marginTop:'8px' }}>
                    {[
                      { name:'Verde PMY', bg:'#F4DCDC', primary:'#006600', sidebar:'#ffffff', title:'#006600', text:'#2b2b2b' },
                      { name:'Azul Oceano', bg:'#dce8f4', primary:'#004e9a', sidebar:'#f0f6ff', title:'#003377', text:'#1a2b3c' },
                      { name:'Laranja Terra', bg:'#fdf0e6', primary:'#c45e00', sidebar:'#fff8f2', title:'#a04a00', text:'#2b2010' },
                      { name:'Roxo Moderno', bg:'#f0ecf9', primary:'#5e35b1', sidebar:'#faf8ff', title:'#4527a0', text:'#1a0a3b' },
                      { name:'Preto Elegante', bg:'#f0f0f0', primary:'#1a1a1a', sidebar:'#1a1a1a', title:'#000000', text:'#2b2b2b' },
                      { name:'Minimalista', bg:'#f9f9f9', primary:'#333333', sidebar:'#ffffff', title:'#111111', text:'#444444' },
                    ].map((preset, i) => (
                      <button key={i} type="button"
                        onClick={() => {
                          handleThemeChange('bgColor', preset.bg);
                          handleThemeChange('primaryColor', preset.primary);
                          handleThemeChange('sidebarBg', preset.sidebar);
                          handleThemeChange('titleColor', preset.title);
                          handleThemeChange('textColor', preset.text);
                        }}
                        style={{ display:'flex', alignItems:'center', gap:'8px', padding:'8px 14px', border:'1.5px solid #ddd', borderRadius:'20px', background:'#fff', cursor:'pointer', fontSize:'13px', fontWeight:'700', transition:'0.2s' }}>
                        <span style={{ display:'flex', gap:'3px' }}>
                          <span style={{ width:'12px', height:'12px', borderRadius:'50%', background: preset.bg, border:'1px solid #ccc', display:'inline-block' }}></span>
                          <span style={{ width:'12px', height:'12px', borderRadius:'50%', background: preset.primary, display:'inline-block' }}></span>
                          <span style={{ width:'12px', height:'12px', borderRadius:'50%', background: preset.sidebar, border:'1px solid #ccc', display:'inline-block' }}></span>
                        </span>
                        {preset.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px', marginTop:'10px' }}>
                  <div className="pmy-form-group" style={{ marginBottom:0 }}>
                    <label>Cor de Fundo Principal:</label>
                    <div style={{ display:'flex', gap:'10px', alignItems:'center', marginTop:'6px' }}>
                      <input type="color" value={theme.bgColor} onChange={e=>handleThemeChange('bgColor',e.target.value)}
                        style={{ width:'44px', height:'38px', border:'1px solid #ddd', borderRadius:'8px', cursor:'pointer', padding:'2px' }} />
                      <input type="text" className="pmy-form-input" style={{ fontFamily:'monospace', fontSize:'13px' }}
                        value={theme.bgColor} onChange={e=>handleThemeChange('bgColor',e.target.value)} />
                    </div>
                  </div>

                  <div className="pmy-form-group" style={{ marginBottom:0 }}>
                    <label>Cor Primária (botões, menu ativo):</label>
                    <div style={{ display:'flex', gap:'10px', alignItems:'center', marginTop:'6px' }}>
                      <input type="color" value={theme.primaryColor} onChange={e=>handleThemeChange('primaryColor',e.target.value)}
                        style={{ width:'44px', height:'38px', border:'1px solid #ddd', borderRadius:'8px', cursor:'pointer', padding:'2px' }} />
                      <input type="text" className="pmy-form-input" style={{ fontFamily:'monospace', fontSize:'13px' }}
                        value={theme.primaryColor} onChange={e=>handleThemeChange('primaryColor',e.target.value)} />
                    </div>
                  </div>

                  <div className="pmy-form-group" style={{ marginBottom:0 }}>
                    <label>Cor de Fundo da Sidebar:</label>
                    <div style={{ display:'flex', gap:'10px', alignItems:'center', marginTop:'6px' }}>
                      <input type="color" value={theme.sidebarBg} onChange={e=>handleThemeChange('sidebarBg',e.target.value)}
                        style={{ width:'44px', height:'38px', border:'1px solid #ddd', borderRadius:'8px', cursor:'pointer', padding:'2px' }} />
                      <input type="text" className="pmy-form-input" style={{ fontFamily:'monospace', fontSize:'13px' }}
                        value={theme.sidebarBg} onChange={e=>handleThemeChange('sidebarBg',e.target.value)} />
                    </div>
                  </div>

                  <div className="pmy-form-group" style={{ marginBottom:0 }}>
                    <label>Cor dos Títulos:</label>
                    <div style={{ display:'flex', gap:'10px', alignItems:'center', marginTop:'6px' }}>
                      <input type="color" value={theme.titleColor} onChange={e=>handleThemeChange('titleColor',e.target.value)}
                        style={{ width:'44px', height:'38px', border:'1px solid #ddd', borderRadius:'8px', cursor:'pointer', padding:'2px' }} />
                      <input type="text" className="pmy-form-input" style={{ fontFamily:'monospace', fontSize:'13px' }}
                        value={theme.titleColor} onChange={e=>handleThemeChange('titleColor',e.target.value)} />
                    </div>
                  </div>

                  <div className="pmy-form-group" style={{ marginBottom:0 }}>
                    <label>Cor do Texto Principal:</label>
                    <div style={{ display:'flex', gap:'10px', alignItems:'center', marginTop:'6px' }}>
                      <input type="color" value={theme.textColor} onChange={e=>handleThemeChange('textColor',e.target.value)}
                        style={{ width:'44px', height:'38px', border:'1px solid #ddd', borderRadius:'8px', cursor:'pointer', padding:'2px' }} />
                      <input type="text" className="pmy-form-input" style={{ fontFamily:'monospace', fontSize:'13px' }}
                        value={theme.textColor} onChange={e=>handleThemeChange('textColor',e.target.value)} />
                    </div>
                  </div>

                  <div className="pmy-form-group" style={{ marginBottom:0 }}>
                    <label>Tipo de Fonte:</label>
                    <select className="pmy-form-input" style={{ marginTop:'6px' }} value={theme.fontFamily} onChange={e=>handleThemeChange('fontFamily',e.target.value)}>
                      <option value="Assistant">Assistant (Padrão)</option>
                      <option value="Inter">Inter</option>
                      <option value="Roboto">Roboto</option>
                      <option value="Poppins">Poppins</option>
                      <option value="Lato">Lato</option>
                      <option value="Open Sans">Open Sans</option>
                      <option value="Montserrat">Montserrat</option>
                      <option value="Nunito">Nunito</option>
                      <option value="Georgia">Georgia (Serif)</option>
                    </select>
                  </div>

                  <div className="pmy-form-group" style={{ marginBottom:0 }}>
                    <label>Tamanho da Fonte:</label>
                    <select className="pmy-form-input" style={{ marginTop:'6px' }} value={theme.fontSize} onChange={e=>handleThemeChange('fontSize',e.target.value)}>
                      <option value="12px">Pequena (12px)</option>
                      <option value="13px">Compacta (13px)</option>
                      <option value="14px">Padrão (14px)</option>
                      <option value="15px">Média (15px)</option>
                      <option value="16px">Grande (16px)</option>
                    </select>
                  </div>

                  <div className="pmy-form-group" style={{ marginBottom:0 }}>
                    <label>Formato das Imagens de Perfil:</label>
                    <div style={{ display:'flex', gap:'10px', marginTop:'8px' }}>
                      {[['circle','🔵 Redonda'],['rounded','⬜ Arredondada']].map(([v,l]) => (
                        <button key={v} type="button" className="pmy-format-btn"
                          style={{ background: imageShape===v?'var(--primary-green)':'#f0f0f0', color: imageShape===v?'#fff':'#555' }}
                          onClick={() => handleImageShapeChange(v)}>{l}</button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Preview */}
                <div style={{ marginTop:'25px', padding:'20px', background: theme.bgColor, borderRadius:'12px', border:'1px solid #eee' }}>
                  <div style={{ fontSize:'11px', fontWeight:'800', color:'#aaa', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'12px' }}>Preview</div>
                  <div style={{ display:'flex', gap:'15px', alignItems:'center' }}>
                    <div style={{ width:'120px', background: theme.sidebarBg, borderRadius:'10px', padding:'15px', boxShadow:'0 2px 8px rgba(0,0,0,0.06)' }}>
                      <div style={{ width:'100%', height:'8px', background: theme.primaryColor, borderRadius:'4px', marginBottom:'8px' }}></div>
                      <div style={{ width:'80%', height:'6px', background:'#eee', borderRadius:'4px', marginBottom:'5px' }}></div>
                      <div style={{ width:'60%', height:'6px', background:'#eee', borderRadius:'4px' }}></div>
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:'18px', fontWeight:'800', color: theme.titleColor, fontFamily: theme.fontFamily, marginBottom:'8px' }}>Visão Geral</div>
                      <div style={{ fontSize: theme.fontSize, color: theme.textColor, fontFamily: theme.fontFamily }}>Texto de exemplo com a fonte e cor selecionadas.</div>
                      <div style={{ marginTop:'10px', display:'inline-block', background: theme.primaryColor, color:'#fff', padding:'6px 14px', borderRadius:'6px', fontSize:'12px', fontWeight:'700' }}>Botão Primário</div>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop:'15px' }}>
                  <button type="button"
                    onClick={handleRestoreThemeDefaults}
                    style={{ background:'#f0f0f0', border:'none', borderRadius:'8px', padding:'10px 20px', fontWeight:'700', fontSize:'13px', cursor:'pointer', color:'#555' }}>
                    🔄 Restaurar Padrões
                  </button>
                </div>
              </div>

              {/* USUÁRIOS DA LOJA */}
              <div className="pmy-form-box">
                <h3>👥 Equipe com Acesso ao App</h3>
                <p style={{ fontSize:'13px', color:'#666', marginBottom:'20px', lineHeight:'1.6' }}>
                  Estes são os membros da sua equipe no Shopify que têm acesso ao app.
                  Para adicionar ou remover pessoas, gerencie no <a href="https://admin.shopify.com/settings/account" target="_blank" rel="noreferrer" style={{ color:'var(--primary-green)', fontWeight:'700' }}>painel de conta do Shopify ↗</a>
                </p>

                {shopifyStaff.length === 0 ? (
                  <div style={{ background:'#f9f9f9', borderRadius:'8px', padding:'20px', textAlign:'center', color:'#888', fontSize:'13px' }}>
                    A Central não solicita acesso à lista de funcionários do Shopify por padrão. Esse dado exige o scope restrito <code>read_users</code> e não é necessário para reservas, pedidos ou checkouts. Gerencie os acessos diretamente no Shopify.
                  </div>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                    {shopifyStaff.map(staff => (
                      <div key={staff.id} style={{ display:'flex', alignItems:'center', gap:'14px', padding:'14px 16px', background:'#fafafa', borderRadius:'10px', border:'1px solid #eee' }}>
                        {staff.avatar
                          ? <img src={staff.avatar} alt={staff.name} style={{ width:'42px', height:'42px', borderRadius:'50%', objectFit:'cover', flexShrink:0 }} />
                          : <div style={{ width:'42px', height:'42px', borderRadius:'50%', background:'var(--primary-green)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:'800', fontSize:'16px', flexShrink:0 }}>
                              {staff.name?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                        }
                        <div style={{ flex:1 }}>
                          <div style={{ fontWeight:'700', fontSize:'14px', color:'var(--text-dark)', display:'flex', alignItems:'center', gap:'8px' }}>
                            {staff.name}
                            {staff.isOwner && <span style={{ fontSize:'10px', background:'#e6f2e6', color:'var(--primary-green)', padding:'2px 8px', borderRadius:'10px', fontWeight:'800' }}>Proprietário</span>}
                            {!staff.active && <span style={{ fontSize:'10px', background:'#f5f5f5', color:'#aaa', padding:'2px 8px', borderRadius:'10px', fontWeight:'800' }}>Inativo</span>}
                          </div>
                          <div style={{ fontSize:'12px', color:'#888', marginTop:'2px' }}>{staff.email}</div>
                          <div style={{ fontSize:'11px', color:'#aaa', marginTop:'2px' }}>{staff.role}</div>
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                          <span style={{ width:'8px', height:'8px', borderRadius:'50%', background: staff.active ? '#22c55e' : '#ddd', display:'inline-block' }}></span>
                          <span style={{ fontSize:'11px', color: staff.active ? '#22c55e' : '#aaa', fontWeight:'700' }}>{staff.active ? 'Ativo' : 'Inativo'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ marginTop:'20px', padding:'14px 16px', background:'#fffbeb', border:'1px solid #fcd34d', borderRadius:'8px', fontSize:'13px', color:'#92400e', lineHeight:'1.5' }}>
                  💡 <strong>Para convidar novos membros:</strong> Vá em Shopify Admin → Configurações → Usuários e permissões → Adicionar membro da equipe. Após adicionado, ele aparecerá automaticamente aqui.
                </div>
              </div>

              {/* MAPEAMENTO DE CAMPOS */}
              <div className="pmy-form-box">
                <h3>🗺️ Mapeamento de Campos entre Plataformas</h3>
                <p style={{ fontSize:'13px', color:'#666', marginBottom:'25px', lineHeight:'1.6' }}>
                  Defina como os campos de cada plataforma externa correspondem aos campos internos do sistema PMY.
                  Isso garante que reservas sejam importadas corretamente, independentemente do formato de cada API.
                </p>

                <div className="pmy-mapping-platform-tabs">
                  {reservationPlatforms.map(p => (
                    <button key={p.key} className={`pmy-mapping-tab ${activeMappingPlatform===p.key?'active':''}`} onClick={() => setActiveMappingPlatform(p.key)}>
                      <span>{p.logo}</span>{p.name}
                      {platformConnections[p.key]?.connected && (
                        <span style={{ fontSize:'9px', background:'rgba(255,255,255,0.3)', borderRadius:'10px', padding:'1px 5px' }}>✓</span>
                      )}
                    </button>
                  ))}
                </div>

                {!platformConnections[activeMappingPlatform]?.connected && (
                  <div style={{ background:'#fffbeb', border:'1px solid #fcd34d', borderRadius:'8px', padding:'12px 16px', marginBottom:'20px', fontSize:'13px', color:'#92400e', display:'flex', alignItems:'center', gap:'10px' }}>
                    <span>⚠️</span>
                    <span>Esta plataforma não está conectada. Vá em <strong>Integrações</strong> para ativar. Você pode pré-configurar o mapeamento agora.</span>
                  </div>
                )}

                <div style={{ display:'flex', gap:'20px', marginBottom:'15px', alignItems:'center', flexWrap:'wrap' }}>
                  <div style={{ fontSize:'12px', color:'#888', display:'flex', alignItems:'center', gap:'6px' }}>
                    <span style={{ fontFamily:'monospace', background:'#f0f0f0', padding:'2px 6px', borderRadius:'4px', fontSize:'11px' }}>campo_pmy</span>
                    = campo fixo interno
                  </div>
                  <div style={{ fontSize:'12px', color:'#888', display:'flex', alignItems:'center', gap:'6px' }}>
                    <span style={{ fontFamily:'monospace', border:'1px solid #ddd', padding:'2px 8px', borderRadius:'4px', fontSize:'11px' }}>campo.api</span>
                    = campo da plataforma (editável)
                  </div>
                  <span className="pmy-field-badge required">● Obrigatório</span>
                  <span className="pmy-field-badge optional">○ Opcional</span>
                </div>

                <div style={{ overflowX:'auto' }}>
                  <table className="pmy-mapping-table">
                    <thead>
                      <tr>
                        <th>Campo Interno PMY</th>
                        <th style={{ width:'30px' }}></th>
                        <th>Campo na API {allPlatforms.find(p=>p.key===activeMappingPlatform)?.name}</th>
                        <th style={{ width:'100px' }}>Tipo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {internalFields.map(field => (
                        <tr key={field.key} className={`pmy-mapping-row ${platformConnections[activeMappingPlatform]?.connected?'active-conn':''}`}>
                          <td>
                            <div style={{ display:'flex', flexDirection:'column', gap:'2px' }}>
                              <span className="pmy-mapping-internal-label">{field.key}</span>
                              <span style={{ fontSize:'11px', color:'#aaa', marginTop:'3px' }}>{field.desc}</span>
                            </div>
                          </td>
                          <td className="pmy-mapping-arrow">→</td>
                          <td>
                            <input type="text" className="pmy-mapping-field-input"
                              value={fieldMappings[activeMappingPlatform]?.[field.key]||""}
                              onChange={e => handleUpdateFieldMapping(activeMappingPlatform, field.key, e.target.value)}
                              placeholder={`Nome do campo em ${allPlatforms.find(p=>p.key===activeMappingPlatform)?.name}`} />
                          </td>
                          <td>
                            <span className={`pmy-field-badge ${field.required?'required':'optional'}`}>
                              {field.required ? '● Obrig.' : '○ Opc.'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{ marginTop:'25px', background:'#fafafa', border:'1px solid #eee', borderRadius:'10px', padding:'20px' }}>
                  <h4 style={{ fontSize:'14px', fontWeight:'800', color:'var(--text-dark)', marginBottom:'15px' }}>⚙️ Transformações de Status Automáticas</h4>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px,1fr))', gap:'12px' }}>
                    {[
                      { label:"CONFIRMED", values:["confirmed","CONFIRMED","accepted","aceptada","booked"] },
                      { label:"CANCELED",  values:["cancelled","canceled","CANCELLED","cancelada","rejected"] },
                      { label:"PENDING",   values:["pending","PENDING","awaiting","pendiente","on_hold"] },
                      { label:"EUR €",     values:["EUR","Eur","€","euro","euros"] },
                    ].map((tr,i) => (
                      <div key={i} style={{ background:'#fff', border:'1px solid #eee', borderRadius:'8px', padding:'12px' }}>
                        <div style={{ fontSize:'12px', fontWeight:'800', color:'var(--text-dark)', marginBottom:'8px' }}>→ {tr.label}</div>
                        <div style={{ display:'flex', flexWrap:'wrap', gap:'5px' }}>
                          {tr.values.map((v,j) => (
                            <span key={j} style={{ fontSize:'11px', fontFamily:'monospace', background:'#f0f4ff', color:'#4466cc', padding:'2px 7px', borderRadius:'4px' }}>{v}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ marginTop:'20px', display:'flex', gap:'12px' }}>
                  <button type="button" className="pmy-btn-submit" onClick={handleSaveFieldMappings} style={{ width:'auto', padding:'11px 25px' }}>
                    💾 Salvar — {allPlatforms.find(p=>p.key===activeMappingPlatform)?.name}
                  </button>
                  <button type="button" onClick={handleResetFieldMappings}
                    style={{ background:'#f0f0f0', border:'none', borderRadius:'8px', padding:'11px 20px', fontWeight:'700', fontSize:'13px', cursor:'pointer', color:'#555' }}>
                    🔄 Restaurar Padrões
                  </button>
                </div>
              </div>
            </div>
          )}
    </>
  );
}
