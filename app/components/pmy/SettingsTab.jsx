export default function SettingsTab(props) {
  const {
    activeMappingPlatform,
    activeTab,
    allPlatforms,
    defaultMappings,
    fieldMappings,
    handleChooseBrandLogo,
    handleRemoveBrandLogo,
    handleThemeChange,
    handleRestoreThemeDefaults,
    handleImageShapeChange,
    handleSaveFieldMappings,
    handleResetFieldMappings,
    handleUpdateFieldMapping,
    imageShape,
    internalFields,
    logoOnLightUrl,
    logoOnDarkUrl,
    logoUploadingVariant,
    sidebarIsDark,
    activeSidebarLogoUrl,
    mappingSaveState,
    platformConnections,
    reservationPlatforms,
    setActiveMappingPlatform,
    settingsSaveMessage,
    shopifyStaff,
    t,
    theme,
    lang
  } = props;

  const tr = (pt, en) => lang === "en" ? en : pt;
  const fieldEnglish = {
    customerName: { label: "Customer Name", desc: "Passenger full name" },
    tourId: { label: "Tour / Product ID", desc: "Tour identifier in the PMY system" },
    startTime: { label: "Start Date and Time", desc: "Tour departure date and time" },
    status: { label: "Booking Status", desc: "State: CONFIRMED / CANCELED / PENDING" },
    email: { label: "Customer Email", desc: "Passenger contact email" },
    phone: { label: "Phone / WhatsApp", desc: "Number including country code" },
    quantity: { label: "Ticket Quantity", desc: "Total tickets by variant" },
    price: { label: "Total Amount Paid", desc: "Final booking amount" },
    currency: { label: "Currency", desc: "EUR, USD, BRL, etc." },
    bookingRef: { label: "Booking Reference", desc: "Unique booking ID from the platform" },
    language: { label: "Language", desc: "Tour or booking language" },
  };
  const fieldLabel = (field) => lang === "en" ? (fieldEnglish[field.key]?.label || field.label) : field.label;
  const fieldDesc = (field) => lang === "en" ? (fieldEnglish[field.key]?.desc || field.desc) : field.desc;

  return (
    <>
{/* ===== TAB: CONFIGURAÇÕES ===== */}
          {activeTab==='configuracoes' && (
            <div style={{ display:'grid', gap:'30px' }}>

              {/* LOGO */}
              <div className="pmy-form-box">
                <div style={{ display:'flex', justifyContent:'space-between', gap:'16px', alignItems:'flex-start', flexWrap:'wrap', marginBottom:'18px' }}>
                  <div>
                    <h3 style={{ marginBottom:'6px' }}>{tr("🖼️ Identidade da Agência", "🖼️ Agency Identity")}</h3>
                    <p style={{ fontSize:'13px', color:'#666', margin:0, maxWidth:'720px', lineHeight:'1.55' }}>
                      {tr("Escolha as duas versões diretamente na biblioteca da Shopify. A seleção fica salva na própria instalação do app e a barra lateral usa automaticamente a versão correta.", "Choose both versions directly from Shopify's library. The selection is stored in the app installation and the sidebar automatically uses the correct version.")}
                    </p>
                  </div>
                  <div style={{
                    display:'inline-flex',
                    alignItems:'center',
                    gap:'7px',
                    padding:'7px 11px',
                    borderRadius:'999px',
                    background: sidebarIsDark ? '#171717' : '#f4f7f4',
                    color: sidebarIsDark ? '#fff' : '#245c2d',
                    fontSize:'11px',
                    fontWeight:'800'
                  }}>
                    {sidebarIsDark
      ? tr('🌙 Sidebar escura · logo clara', '🌙 Dark sidebar · light logo')
      : tr('☀️ Sidebar clara · logo colorida', '☀️ Light sidebar · colored logo')}
                  </div>
                </div>

                {settingsSaveMessage && (
                  <div style={{
                    fontSize:'11px',
                    fontWeight:'800',
                    color:settingsSaveMessage.includes('Erro')?'#b91c1c':'var(--primary-green)',
                    marginBottom:'14px'
                  }}>
                    {settingsSaveMessage}
                  </div>
                )}

                <div className="pmy-brand-logo-grid">
                  <div className="pmy-brand-logo-card">
                    <div className="pmy-brand-logo-card-head">
                      <div>
                        <strong>{tr("Logo para fundo claro", "Logo for light backgrounds")}</strong>
                        <span>{tr("Use a versão verde/colorida da marca.", "Use the green/colored version of the brand.")}</span>
                      </div>
                      {logoOnLightUrl && <span className="pmy-brand-logo-status">{tr("Salva ✓", "Saved ✓")}</span>}
                    </div>

                    <div className="pmy-brand-logo-preview is-light">
                      {logoOnLightUrl
                        ? <img src={logoOnLightUrl} alt={tr('Logo para fundo claro','Logo for light backgrounds')} />
                        : <span>{tr("Sem logo clara", "No light-background logo")}</span>}
                    </div>

                    <div className="pmy-brand-logo-actions">
                      <button
                        type="button"
                        className="pmy-format-btn"
                        disabled={logoUploadingVariant !== null}
                        onClick={() => handleChooseBrandLogo('light')}
                      >
                        {logoUploadingVariant === 'light' ? tr('⏳ Abrindo biblioteca...', '⏳ Opening library...') : tr('🖼️ Escolher na biblioteca Shopify', '🖼️ Choose from Shopify library')}
                      </button>
                      {logoOnLightUrl && (
                        <button
                          type="button"
                          className="pmy-format-btn"
                          style={{ color:'#b91c1c', background:'#fff1f1' }}
                          onClick={() => handleRemoveBrandLogo('light')}
                        >
                          {tr('Remover', 'Remove')}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="pmy-brand-logo-card">
                    <div className="pmy-brand-logo-card-head">
                      <div>
                        <strong>{tr("Logo para fundo escuro", "Logo for dark backgrounds")}</strong>
                        <span>{tr("Use a versão branca/negativa da marca.", "Use the white/reversed version of the brand.")}</span>
                      </div>
                      {logoOnDarkUrl && <span className="pmy-brand-logo-status">{tr("Salva ✓", "Saved ✓")}</span>}
                    </div>

                    <div className="pmy-brand-logo-preview is-dark">
                      {logoOnDarkUrl
                        ? <img src={logoOnDarkUrl} alt={tr('Logo para fundo escuro','Logo for dark backgrounds')} />
                        : logoOnLightUrl
                          ? <img src={logoOnLightUrl} alt={tr('Prévia branca automática','Automatic white preview')} className="is-auto-white" />
                          : <span>{tr("Sem logo escura", "No dark-background logo")}</span>}
                    </div>

                    <div className="pmy-brand-logo-actions">
                      <button
                        type="button"
                        className="pmy-format-btn"
                        disabled={logoUploadingVariant !== null}
                        onClick={() => handleChooseBrandLogo('dark')}
                      >
                        {logoUploadingVariant === 'dark' ? tr('⏳ Abrindo biblioteca...', '⏳ Opening library...') : tr('🖼️ Escolher na biblioteca Shopify', '🖼️ Choose from Shopify library')}
                      </button>
                      {logoOnDarkUrl && (
                        <button
                          type="button"
                          className="pmy-format-btn"
                          style={{ color:'#b91c1c', background:'#fff1f1' }}
                          onClick={() => handleRemoveBrandLogo('dark')}
                        >
                          {tr('Remover', 'Remove')}
                        </button>
                      )}
                    </div>

                    {!logoOnDarkUrl && logoOnLightUrl && (
                      <div style={{ fontSize:'10px', color:'#777', lineHeight:'1.45', marginTop:'9px' }}>
                        {tr("Sem versão branca enviada. A Central cria uma versão branca automaticamente enquanto isso.", "No white version has been uploaded. The Central automatically generates a white version in the meantime.")}
                      </div>
                    )}
                  </div>
                </div>

                <div className="pmy-brand-logo-current">
                  <span>{tr("Logo usada agora na sidebar", "Logo currently used in the sidebar")}</span>
                  <div style={{ background:theme.sidebarBg }}>
                    {activeSidebarLogoUrl
                      ? <img
                          src={activeSidebarLogoUrl}
                          alt={tr('Logo ativa','Active logo')}
                          className={sidebarIsDark && !logoOnDarkUrl && logoOnLightUrl ? 'is-auto-white' : ''}
                        />
                      : <strong>Portugal Me & You</strong>}
                  </div>
                </div>
              </div>

              {/* PERSONALIZAÇÃO / THEME */}
              <div className="pmy-form-box">
                <h3>{tr("🎨 Personalização Visual", "🎨 Visual Customization")}</h3>
                <p style={{ fontSize:'13px', color:'#666', marginBottom:'25px' }}>{tr("Adapte o sistema às cores e tipografia da sua marca. As alterações são salvas automaticamente.", "Adapt the system to your brand colors and typography. Changes are saved automatically.")}</p>

                {/* Presets rápidos */}
                <div className="pmy-form-group">
                  <label>{tr("Esquemas Prontos (Presets):", "Ready-made schemes (Presets):")}</label>
                  <div style={{ display:'flex', gap:'10px', flexWrap:'wrap', marginTop:'8px' }}>
                    {[
                      {
                        name:tr('Verde PMY', 'PMY Green'), bg:'#F4DCDC', surface:'#FFFFFF', input:'#FFFFFF',
                        primary:'#006600', sidebar:'#FFFFFF', title:'#006600', text:'#2B2B2B',
                        sidebarText:'#2B2B2B', sidebarMuted:'#777777', sidebarHover:'#F2F7F2',
                        sidebarActive:'#006600', sidebarActiveText:'#FFFFFF', sidebarBorder:'#E7ECE7'
                      },
                      {
                        name:tr('Azul Oceano', 'Ocean Blue'), bg:'#DCE8F4', surface:'#FFFFFF', input:'#FFFFFF',
                        primary:'#004E9A', sidebar:'#F0F6FF', title:'#003377', text:'#1A2B3C',
                        sidebarText:'#17324A', sidebarMuted:'#60778D', sidebarHover:'#E3EFFB',
                        sidebarActive:'#004E9A', sidebarActiveText:'#FFFFFF', sidebarBorder:'#CADAEA'
                      },
                      {
                        name:tr('Laranja Terra', 'Earth Orange'), bg:'#FDF0E6', surface:'#FFFFFF', input:'#FFFFFF',
                        primary:'#C45E00', sidebar:'#FFF8F2', title:'#A04A00', text:'#2B2010',
                        sidebarText:'#3A2918', sidebarMuted:'#806A56', sidebarHover:'#FCEBDD',
                        sidebarActive:'#C45E00', sidebarActiveText:'#FFFFFF', sidebarBorder:'#EED8C5'
                      },
                      {
                        name:tr('Roxo Moderno', 'Modern Purple'), bg:'#F0ECF9', surface:'#FFFFFF', input:'#FFFFFF',
                        primary:'#5E35B1', sidebar:'#FAF8FF', title:'#4527A0', text:'#1A0A3B',
                        sidebarText:'#291A45', sidebarMuted:'#74638D', sidebarHover:'#EEE8FA',
                        sidebarActive:'#5E35B1', sidebarActiveText:'#FFFFFF', sidebarBorder:'#DDD3EE'
                      },
                      {
                        name:tr('Preto Elegante', 'Elegant Black'), bg:'#F5F5F2', surface:'#FFFFFF', input:'#FFFFFF',
                        primary:'#111111', sidebar:'#111111', title:'#111111', text:'#1F1F1F',
                        sidebarText:'#F5F5F2', sidebarMuted:'#B8B8B3', sidebarHover:'#2A2A2A',
                        sidebarActive:'#FFFFFF', sidebarActiveText:'#111111', sidebarBorder:'#343434'
                      },
                      {
                        name:tr('Minimalista', 'Minimalist'), bg:'#F8F8F6', surface:'#FFFFFF', input:'#FFFFFF',
                        primary:'#333333', sidebar:'#FFFFFF', title:'#111111', text:'#444444',
                        sidebarText:'#333333', sidebarMuted:'#7A7A7A', sidebarHover:'#F1F1EF',
                        sidebarActive:'#333333', sidebarActiveText:'#FFFFFF', sidebarBorder:'#E8E8E5'
                      },
                    ].map((preset, i) => (
                      <button key={i} type="button"
                        onClick={() => {
                          const values = {
                            bgColor: preset.bg,
                            surfaceColor: preset.surface,
                            inputBgColor: preset.input,
                            primaryColor: preset.primary,
                            sidebarBg: preset.sidebar,
                            titleColor: preset.title,
                            textColor: preset.text,
                            sidebarTextColor: preset.sidebarText,
                            sidebarMutedTextColor: preset.sidebarMuted,
                            sidebarHoverBg: preset.sidebarHover,
                            sidebarActiveBg: preset.sidebarActive,
                            sidebarActiveTextColor: preset.sidebarActiveText,
                            sidebarBorderColor: preset.sidebarBorder,
                          };
                          Object.entries(values).forEach(([key, value]) => handleThemeChange(key, value));
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

                <div className="pmy-settings-color-grid">
                  <div className="pmy-form-group" style={{ marginBottom:0 }}>
                    <label>{tr("Cor de Fundo Principal:", "Main Background Color:")}</label>
                    <div style={{ display:'flex', gap:'10px', alignItems:'center', marginTop:'6px' }}>
                      <input type="color" value={theme.bgColor} onChange={e=>handleThemeChange('bgColor',e.target.value)}
                        style={{ width:'44px', height:'38px', border:'1px solid #ddd', borderRadius:'8px', cursor:'pointer', padding:'2px' }} />
                      <input type="text" className="pmy-form-input" style={{ fontFamily:'monospace', fontSize:'13px' }}
                        value={theme.bgColor} onChange={e=>handleThemeChange('bgColor',e.target.value)} />
                    </div>
                  </div>

                  <div className="pmy-form-group" style={{ marginBottom:0 }}>
                    <label>{tr("Cor Primária (botões, menu ativo):", "Primary Color (buttons, active menu):")}</label>
                    <div style={{ display:'flex', gap:'10px', alignItems:'center', marginTop:'6px' }}>
                      <input type="color" value={theme.primaryColor} onChange={e=>handleThemeChange('primaryColor',e.target.value)}
                        style={{ width:'44px', height:'38px', border:'1px solid #ddd', borderRadius:'8px', cursor:'pointer', padding:'2px' }} />
                      <input type="text" className="pmy-form-input" style={{ fontFamily:'monospace', fontSize:'13px' }}
                        value={theme.primaryColor} onChange={e=>handleThemeChange('primaryColor',e.target.value)} />
                    </div>
                  </div>

                  <div className="pmy-form-group" style={{ marginBottom:0 }}>
                    <label>{tr("Cor de Fundo da Sidebar:", "Sidebar Background Color:")}</label>
                    <div style={{ display:'flex', gap:'10px', alignItems:'center', marginTop:'6px' }}>
                      <input type="color" value={theme.sidebarBg} onChange={e=>handleThemeChange('sidebarBg',e.target.value)}
                        style={{ width:'44px', height:'38px', border:'1px solid #ddd', borderRadius:'8px', cursor:'pointer', padding:'2px' }} />
                      <input type="text" className="pmy-form-input" style={{ fontFamily:'monospace', fontSize:'13px' }}
                        value={theme.sidebarBg} onChange={e=>handleThemeChange('sidebarBg',e.target.value)} />
                    </div>
                  </div>

                  <div className="pmy-form-group" style={{ marginBottom:0 }}>
                    <label>{tr("Cor dos Títulos:", "Heading Color:")}</label>
                    <div style={{ display:'flex', gap:'10px', alignItems:'center', marginTop:'6px' }}>
                      <input type="color" value={theme.titleColor} onChange={e=>handleThemeChange('titleColor',e.target.value)}
                        style={{ width:'44px', height:'38px', border:'1px solid #ddd', borderRadius:'8px', cursor:'pointer', padding:'2px' }} />
                      <input type="text" className="pmy-form-input" style={{ fontFamily:'monospace', fontSize:'13px' }}
                        value={theme.titleColor} onChange={e=>handleThemeChange('titleColor',e.target.value)} />
                    </div>
                  </div>

                  <div className="pmy-form-group" style={{ marginBottom:0 }}>
                    <label>{tr("Cor do Texto Principal:", "Main Text Color:")}</label>
                    <div style={{ display:'flex', gap:'10px', alignItems:'center', marginTop:'6px' }}>
                      <input type="color" value={theme.textColor} onChange={e=>handleThemeChange('textColor',e.target.value)}
                        style={{ width:'44px', height:'38px', border:'1px solid #ddd', borderRadius:'8px', cursor:'pointer', padding:'2px' }} />
                      <input type="text" className="pmy-form-input" style={{ fontFamily:'monospace', fontSize:'13px' }}
                        value={theme.textColor} onChange={e=>handleThemeChange('textColor',e.target.value)} />
                    </div>
                  </div>

                  <div className="pmy-form-group" style={{ marginBottom:0 }}>
                    <label>{tr("Texto da Sidebar:", "Sidebar Text:")}</label>
                    <div style={{ display:'flex', gap:'10px', alignItems:'center', marginTop:'6px' }}>
                      <input type="color" value={theme.sidebarTextColor || '#2B2B2B'} onChange={e=>handleThemeChange('sidebarTextColor',e.target.value)}
                        style={{ width:'44px', height:'38px', border:'1px solid #ddd', borderRadius:'8px', cursor:'pointer', padding:'2px' }} />
                      <input type="text" className="pmy-form-input" style={{ fontFamily:'monospace', fontSize:'13px' }}
                        value={theme.sidebarTextColor || ''} onChange={e=>handleThemeChange('sidebarTextColor',e.target.value)} />
                    </div>
                  </div>

                  <div className="pmy-form-group" style={{ marginBottom:0 }}>
                    <label>{tr("Texto Secundário da Sidebar:", "Secondary Sidebar Text:")}</label>
                    <div style={{ display:'flex', gap:'10px', alignItems:'center', marginTop:'6px' }}>
                      <input type="color" value={theme.sidebarMutedTextColor || '#777777'} onChange={e=>handleThemeChange('sidebarMutedTextColor',e.target.value)}
                        style={{ width:'44px', height:'38px', border:'1px solid #ddd', borderRadius:'8px', cursor:'pointer', padding:'2px' }} />
                      <input type="text" className="pmy-form-input" style={{ fontFamily:'monospace', fontSize:'13px' }}
                        value={theme.sidebarMutedTextColor || ''} onChange={e=>handleThemeChange('sidebarMutedTextColor',e.target.value)} />
                    </div>
                  </div>

                  <div className="pmy-form-group" style={{ marginBottom:0 }}>
                    <label>{tr("Fundo do Menu Ativo:", "Active Menu Background:")}</label>
                    <div style={{ display:'flex', gap:'10px', alignItems:'center', marginTop:'6px' }}>
                      <input type="color" value={theme.sidebarActiveBg || theme.primaryColor} onChange={e=>handleThemeChange('sidebarActiveBg',e.target.value)}
                        style={{ width:'44px', height:'38px', border:'1px solid #ddd', borderRadius:'8px', cursor:'pointer', padding:'2px' }} />
                      <input type="text" className="pmy-form-input" style={{ fontFamily:'monospace', fontSize:'13px' }}
                        value={theme.sidebarActiveBg || ''} onChange={e=>handleThemeChange('sidebarActiveBg',e.target.value)} />
                    </div>
                  </div>

                  <div className="pmy-form-group" style={{ marginBottom:0 }}>
                    <label>{tr("Texto do Menu Ativo:", "Active Menu Text:")}</label>
                    <div style={{ display:'flex', gap:'10px', alignItems:'center', marginTop:'6px' }}>
                      <input type="color" value={theme.sidebarActiveTextColor || '#FFFFFF'} onChange={e=>handleThemeChange('sidebarActiveTextColor',e.target.value)}
                        style={{ width:'44px', height:'38px', border:'1px solid #ddd', borderRadius:'8px', cursor:'pointer', padding:'2px' }} />
                      <input type="text" className="pmy-form-input" style={{ fontFamily:'monospace', fontSize:'13px' }}
                        value={theme.sidebarActiveTextColor || ''} onChange={e=>handleThemeChange('sidebarActiveTextColor',e.target.value)} />
                    </div>
                  </div>

                  <div className="pmy-form-group" style={{ marginBottom:0 }}>
                    <label>{tr("Tipo de Fonte:", "Font Family:")}</label>
                    <select className="pmy-form-input" style={{ marginTop:'6px' }} value={theme.fontFamily} onChange={e=>handleThemeChange('fontFamily',e.target.value)}>
                      <option value="Assistant">{tr("Assistant (Padrão)", "Assistant (Default)")}</option>
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
                    <label>{tr("Tamanho da Fonte:", "Font Size:")}</label>
                    <select className="pmy-form-input" style={{ marginTop:'6px' }} value={theme.fontSize} onChange={e=>handleThemeChange('fontSize',e.target.value)}>
                      <option value="12px">{tr("Pequena (12px)", "Small (12px)")}</option>
                      <option value="13px">{tr("Compacta (13px)", "Compact (13px)")}</option>
                      <option value="14px">{tr("Padrão (14px)", "Default (14px)")}</option>
                      <option value="15px">{tr("Média (15px)", "Medium (15px)")}</option>
                      <option value="16px">{tr("Grande (16px)", "Large (16px)")}</option>
                    </select>
                  </div>

                  <div className="pmy-form-group" style={{ marginBottom:0 }}>
                    <label>{tr("Formato das Imagens de Perfil:", "Profile Image Shape:")}</label>
                    <div style={{ display:'flex', gap:'10px', marginTop:'8px' }}>
                      {[['circle',tr('🔵 Redonda','🔵 Circle')],['rounded',tr('⬜ Arredondada','⬜ Rounded')]].map(([v,l]) => (
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
                    <div style={{ width:'150px', background: theme.sidebarBg, borderRadius:'14px', padding:'12px', boxShadow:'0 2px 8px rgba(0,0,0,0.06)', border:`1px solid ${theme.sidebarBorderColor || '#E7ECE7'}` }}>
                      <div style={{ color:theme.sidebarMutedTextColor || '#777777', fontSize:'9px', fontWeight:'800', marginBottom:'8px' }}>PMY</div>
                      <div style={{ color:theme.sidebarTextColor || theme.textColor, fontSize:'10px', fontWeight:'700', padding:'7px 8px', borderRadius:'20px', marginBottom:'5px' }}>Dashboard</div>
                      <div style={{ background:theme.sidebarActiveBg || theme.primaryColor, color:theme.sidebarActiveTextColor || '#FFFFFF', fontSize:'10px', fontWeight:'800', padding:'7px 8px', borderRadius:'20px', marginBottom:'5px' }}>{tr("Configurações", "Settings")}</div>
                      <div style={{ color:theme.sidebarMutedTextColor || '#777777', fontSize:'8px', padding:'4px 8px' }}>Portugal Me & You</div>
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:'18px', fontWeight:'800', color: theme.titleColor, fontFamily: theme.fontFamily, marginBottom:'8px' }}>{tr("Visão Geral", "Overview")}</div>
                      <div style={{ fontSize: theme.fontSize, color: theme.textColor, fontFamily: theme.fontFamily }}>{tr("Texto de exemplo com a fonte e cor selecionadas.", "Sample text using the selected font and color.")}</div>
                      <div style={{ marginTop:'10px', display:'inline-block', background: theme.primaryColor, color:'#fff', padding:'6px 14px', borderRadius:'6px', fontSize:'12px', fontWeight:'700' }}>{tr("Botão Primário", "Primary Button")}</div>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop:'15px' }}>
                  <button type="button"
                    onClick={handleRestoreThemeDefaults}
                    style={{ background:'#f0f0f0', border:'none', borderRadius:'8px', padding:'10px 20px', fontWeight:'700', fontSize:'13px', cursor:'pointer', color:'#555' }}>
                    {tr('🔄 Restaurar Padrões', '🔄 Restore Defaults')}
                  </button>
                </div>
              </div>

              {/* USUÁRIOS DA LOJA */}
              <div className="pmy-form-box">
                <h3>{tr("👥 Equipe com Acesso ao App", "👥 Team with App Access")}</h3>
                <p style={{ fontSize:'13px', color:'#666', marginBottom:'20px', lineHeight:'1.6' }}>
                  {tr("Estes são os membros da sua equipe no Shopify que têm acesso ao app.", "These are the members of your Shopify team who have access to the app.")}
                  {tr(' Para adicionar ou remover pessoas, gerencie no ', ' To add or remove people, manage them in the ')}<a href="https://admin.shopify.com/settings/account" target="_blank" rel="noreferrer" style={{ color:'var(--primary-green)', fontWeight:'700' }}>{tr("painel de conta do Shopify ↗", "Shopify account panel ↗")}</a>
                </p>

                {shopifyStaff.length === 0 ? (
                  <div style={{ background:'#f9f9f9', borderRadius:'8px', padding:'20px', textAlign:'center', color:'#888', fontSize:'13px' }}>
                    {tr("A Central não solicita acesso à lista de funcionários do Shopify por padrão. Esse dado exige o scope restrito", "The Central does not request access to Shopify staff lists by default. This data requires the restricted scope")} <code>read_users</code> {tr('e não é necessário para reservas, pedidos ou checkouts. Gerencie os acessos diretamente no Shopify.', 'and it is not required for bookings, orders, or checkouts. Manage access directly in Shopify.')}
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
                            {staff.isOwner && <span style={{ fontSize:'10px', background:'#e6f2e6', color:'var(--primary-green)', padding:'2px 8px', borderRadius:'10px', fontWeight:'800' }}>{tr("Proprietário", "Owner")}</span>}
                            {!staff.active && <span style={{ fontSize:'10px', background:'#f5f5f5', color:'#aaa', padding:'2px 8px', borderRadius:'10px', fontWeight:'800' }}>{tr("Inativo", "Inactive")}</span>}
                          </div>
                          <div style={{ fontSize:'12px', color:'#888', marginTop:'2px' }}>{staff.email}</div>
                          <div style={{ fontSize:'11px', color:'#aaa', marginTop:'2px' }}>{staff.role}</div>
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                          <span style={{ width:'8px', height:'8px', borderRadius:'50%', background: staff.active ? '#22c55e' : '#ddd', display:'inline-block' }}></span>
                          <span style={{ fontSize:'11px', color: staff.active ? '#22c55e' : '#aaa', fontWeight:'700' }}>{staff.active ? tr('Ativo', 'Active') : tr('Inativo', 'Inactive')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ marginTop:'20px', padding:'14px 16px', background:'#fffbeb', border:'1px solid #fcd34d', borderRadius:'8px', fontSize:'13px', color:'#92400e', lineHeight:'1.5' }}>
                  💡 <strong>{tr("Para convidar novos membros:", "To invite new members:")}</strong> {tr('Vá em Shopify Admin → Configurações → Usuários e permissões → Adicionar membro da equipe. Após adicionado, ele aparecerá automaticamente aqui.', 'Go to Shopify Admin → Settings → Users and permissions → Add staff member. Once added, they will appear here automatically.')}
                </div>
              </div>

              {/* MAPEAMENTO DE CAMPOS */}
              <div className="pmy-form-box">
                <h3>{tr("🗺️ Mapeamento de Campos entre Plataformas", "🗺️ Field Mapping Across Platforms")}</h3>
                <p style={{ fontSize:'13px', color:'#666', marginBottom:'10px', lineHeight:'1.6' }}>
                  {tr("Defina como os campos de cada plataforma externa correspondem aos campos internos do sistema PMY.", "Define how fields from each external platform map to PMY internal fields.")}
                  {tr("Cada plataforma possui agora seu próprio mapeamento persistido no banco.", "Each platform now has its own mapping persisted in the database.")}
                </p>
                {mappingSaveState?.platform === activeMappingPlatform && mappingSaveState?.message && (
                  <div style={{
                    fontSize:'11px',
                    fontWeight:'800',
                    marginBottom:'16px',
                    color:
                      mappingSaveState.status === 'error' ? '#b91c1c'
                      : mappingSaveState.status === 'dirty' ? '#b45309'
                      : mappingSaveState.status === 'saving' ? '#6b7280'
                      : 'var(--primary-green)'
                  }}>
                    {mappingSaveState.status === 'dirty' ? '● ' : mappingSaveState.status === 'saving' ? '⏳ ' : mappingSaveState.status === 'error' ? '❌ ' : '✓ '}
                    {mappingSaveState.message}
                  </div>
                )}

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
                    <span>{tr('Esta plataforma não está conectada. Vá em', 'This platform is not connected. Go to')} <strong>{tr("Integrações", "Integrations")}</strong> {tr('para ativar. Você pode pré-configurar o mapeamento agora.', 'to activate it. You can preconfigure the mapping now.')}</span>
                  </div>
                )}

                <div style={{ display:'flex', gap:'20px', marginBottom:'15px', alignItems:'center', flexWrap:'wrap' }}>
                  <div style={{ fontSize:'12px', color:'#888', display:'flex', alignItems:'center', gap:'6px' }}>
                    <span style={{ fontFamily:'monospace', background:'#f0f0f0', padding:'2px 6px', borderRadius:'4px', fontSize:'11px' }}>campo_pmy</span>
                    {tr('= campo fixo interno', '= fixed internal field')}
                  </div>
                  <div style={{ fontSize:'12px', color:'#888', display:'flex', alignItems:'center', gap:'6px' }}>
                    <span style={{ fontFamily:'monospace', border:'1px solid #ddd', padding:'2px 8px', borderRadius:'4px', fontSize:'11px' }}>campo.api</span>
                    {tr('= campo da plataforma (editável)', '= platform field (editable)')}
                  </div>
                  <span className="pmy-field-badge required">{tr("● Obrigatório", "● Required")}</span>
                  <span className="pmy-field-badge optional">{tr("○ Opcional", "○ Optional")}</span>
                </div>

                <div style={{ overflowX:'auto' }}>
                  <table className="pmy-mapping-table">
                    <thead>
                      <tr>
                        <th>{tr("Campo Interno PMY", "PMY Internal Field")}</th>
                        <th style={{ width:'30px' }}></th>
                        <th>{tr('Campo na API', 'API field')} {allPlatforms.find(p=>p.key===activeMappingPlatform)?.name}</th>
                        <th style={{ width:'100px' }}>{tr("Tipo", "Type")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {internalFields.map(field => (
                        <tr key={field.key} className={`pmy-mapping-row ${platformConnections[activeMappingPlatform]?.connected?'active-conn':''}`}>
                          <td>
                            <div style={{ display:'flex', flexDirection:'column', gap:'2px' }}>
                              <span className="pmy-mapping-internal-label">{field.key}</span>
                              <span style={{ fontSize:'11px', color:'#aaa', marginTop:'3px' }}>{fieldDesc(field)}</span>
                            </div>
                          </td>
                          <td className="pmy-mapping-arrow">→</td>
                          <td>
                            <input type="text" className="pmy-mapping-field-input"
                              value={fieldMappings[activeMappingPlatform]?.[field.key]||""}
                              onChange={e => handleUpdateFieldMapping(activeMappingPlatform, field.key, e.target.value)}
                              placeholder={`${tr('Nome do campo em', 'Field name in')} ${allPlatforms.find(p=>p.key===activeMappingPlatform)?.name}`} />
                          </td>
                          <td>
                            <span className={`pmy-field-badge ${field.required?'required':'optional'}`}>
                              {field.required ? tr('● Obrig.', '● Req.') : tr('○ Opc.', '○ Opt.')}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{ marginTop:'25px', background:'#fafafa', border:'1px solid #eee', borderRadius:'10px', padding:'20px' }}>
                  <h4 style={{ fontSize:'14px', fontWeight:'800', color:'var(--text-dark)', marginBottom:'15px' }}>{tr("⚙️ Transformações de Status Automáticas", "⚙️ Automatic Status Transformations")}</h4>
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
                  <button
                    type="button"
                    className="pmy-btn-submit"
                    onClick={handleSaveFieldMappings}
                    disabled={mappingSaveState?.status === 'saving'}
                    style={{
                      width:'auto',
                      padding:'11px 25px',
                      opacity: mappingSaveState?.status === 'saving' ? 0.6 : 1
                    }}
                  >
                    {mappingSaveState?.status === 'saving' && mappingSaveState?.platform === activeMappingPlatform
                      ? tr('⏳ Salvando...', '⏳ Saving...')
                      : `💾 ${tr('Salvar', 'Save')} — ${allPlatforms.find(p=>p.key===activeMappingPlatform)?.name}`}
                  </button>
                  <button
                    type="button"
                    onClick={handleResetFieldMappings}
                    disabled={mappingSaveState?.status === 'saving'}
                    style={{ background:'#f0f0f0', border:'none', borderRadius:'8px', padding:'11px 20px', fontWeight:'700', fontSize:'13px', cursor:'pointer', color:'#555', opacity:mappingSaveState?.status === 'saving'?0.6:1 }}
                  >
                    {tr('🔄 Restaurar e salvar padrões', '🔄 Restore and save defaults')}
                  </button>
                </div>
              </div>
            </div>
          )}
    </>
  );
}
