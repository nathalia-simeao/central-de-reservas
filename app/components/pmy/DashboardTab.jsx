
const ExpandIcon = () => (
  <svg className="pmy-card-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 17l9.2-9.2M17 17V7H7"/>
  </svg>
);

export default function DashboardTab(props) {
  const {
    activeTab,
    setActiveModal,
    t,
    totalSalesCount,
    confirmedRevenueValue,
    formatMoney,
    missingFinancialBookings,
    pricedConfirmedBookings,
    revenueCurrencies,
    lang,
    averageTicketValue,
    canceledCount,
    cancellationRate,
    upcomingCount,
    getPeriodLabel,
    salesByChannel,
    categoriesData,
    toggleCategory,
    openCategories,
    realConfirmedBookings,
    imageShape
  } = props;

  return (
    <>
{/* ===== TAB: DASHBOARD ===== */}
          {activeTab==='dashboard' && (
            <div>
              <div className="pmy-grid">
                <div className="pmy-card has-hover" onClick={() => setActiveModal('sales')}><ExpandIcon />
                  <div className="pmy-card-title">{t.dash_total_sales}</div>
                  <div className="pmy-card-value">{totalSalesCount}</div>
                  <div style={{ fontSize:'12px', color:'#888', marginTop:'5px' }}>{t.dash_vs_last_month}</div>
                </div>
                <div className="pmy-card has-hover" onClick={() => setActiveModal('confirmed')}><ExpandIcon />
                  <div className="pmy-card-title">{t.dash_revenue_confirmed}</div>
                  <div className="pmy-card-value">{confirmedRevenueValue > 0 ? formatMoney(confirmedRevenueValue) : "—"}</div>
                  <div style={{ fontSize:'11px', color:missingFinancialBookings.length ? '#b45309' : '#888', marginTop:'4px' }}>
                    {pricedConfirmedBookings.length} com valor real
                    {missingFinancialBookings.length > 0 ? ` · ${missingFinancialBookings.length} sem valor` : ''}
                    {revenueCurrencies.length > 1 ? ` · ${revenueCurrencies.length} moedas` : ''}
                  </div>
                </div>
                <div className="pmy-card has-hover" onClick={() => setActiveModal('estimated')}><ExpandIcon />
                  <div className="pmy-card-title">{lang==='pt'?'Ticket Médio':'Average Ticket'}</div>
                  <div className="pmy-card-value" style={{ color:'#c99a3c' }}>{averageTicketValue > 0 ? formatMoney(averageTicketValue) : "—"}</div>
                  <div style={{ fontSize:'11px', color:'#888', marginTop:'4px' }}>{pricedConfirmedBookings.length} {lang==='pt'?'reservas com valor':'priced bookings'}</div>
                </div>
                <div className="pmy-card has-hover" onClick={() => setActiveModal('canceled')}><ExpandIcon />
                  <div className="pmy-card-title">{lang==='pt'?'Cancelamentos':'Cancellations'}</div>
                  <div className="pmy-card-value" style={{ color:'#cc0000' }}>{canceledCount}</div>
                  <div style={{ fontSize:'11px', color:'#888', marginTop:'4px' }}>{cancellationRate.toFixed(1)}% {lang==='pt'?'das reservas fechadas/canceladas':'of closed/canceled bookings'}</div>
                </div>
                <div className="pmy-card has-hover" onClick={() => setActiveModal('upcoming')}><ExpandIcon />
                  <div className="pmy-card-title">{lang==='pt'?'Próximas Saídas':'Upcoming Departures'}</div>
                  <div className="pmy-card-value">{upcomingCount}</div>
                  <div style={{ fontSize:'11px', color:'#888', marginTop:'4px' }}>{lang==='pt'?'próximos 30 dias':'next 30 days'}</div>
                </div>
              </div>

              <div className="pmy-card" style={{ marginBottom:'20px', padding:'18px 22px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:'12px', flexWrap:'wrap', marginBottom:'12px' }}>
                  <div>
                    <div className="pmy-card-title" style={{ fontSize:'16px', marginBottom:'3px' }}>{lang==='pt'?'Vendas por Canal':'Sales by Channel'}</div>
                    <div style={{ fontSize:'11px', color:'#888' }}>{getPeriodLabel()} · {lang==='pt'?'somente reservas confirmadas':'confirmed bookings only'}</div>
                  </div>
                  {missingFinancialBookings.length > 0 && (
                    <span style={{ fontSize:'10px', background:'#fff7ed', color:'#b45309', padding:'5px 9px', borderRadius:'14px', fontWeight:'800' }}>
                      ⚠️ {missingFinancialBookings.length} {lang==='pt'?'sem valor financeiro':'without financial value'}
                    </span>
                  )}
                </div>
                {salesByChannel.length === 0 ? (
                  <div style={{ color:'#999', fontSize:'13px', padding:'8px 0' }}>{lang==='pt'?'Nenhuma venda confirmada no período.':'No confirmed sales in this period.'}</div>
                ) : (
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:'10px' }}>
                    {salesByChannel.map(channel => {
                      const revenues = Object.entries(channel.revenueByCurrency);
                      return (
                        <div key={channel.platform} style={{ border:'1px solid #eee', borderRadius:'10px', padding:'12px 14px', background:'#fff' }}>
                          <div style={{ fontWeight:'900', fontSize:'13px', color:'#333' }}>{channel.label}</div>
                          <div style={{ fontSize:'21px', fontWeight:'900', color:'var(--primary-green)', marginTop:'5px' }}>{channel.bookings}</div>
                          <div style={{ fontSize:'10px', color:'#888' }}>{lang==='pt'?'reservas confirmadas':'confirmed bookings'} · {channel.passengers} pax</div>
                          <div style={{ fontSize:'12px', fontWeight:'800', marginTop:'7px', color:'#444' }}>
                            {revenues.length > 0
                              ? revenues.map(([currency, amount]) => formatMoney(amount, currency)).join(' + ')
                              : '—'}
                          </div>
                          {channel.missingValue > 0 && <div style={{ fontSize:'10px', color:'#b45309', marginTop:'3px' }}>⚠️ {channel.missingValue} {lang==='pt'?'sem valor':'without value'}</div>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="pmy-grid" style={{ gridTemplateColumns:'1fr' }}>
                <div className="pmy-card" style={{ padding:'0 25px 25px 25px' }}>
                  <div style={{ padding:'25px 0 10px 0', borderBottom:'2px solid #f0f0f0' }}>
                    <div className="pmy-card-title" style={{ fontSize:'18px', color:'#000', margin:0 }}>{t.dash_performance}</div>
                  </div>
                  {categoriesData.map(cat => (
                    <div key={cat.name}>
                      <div className="pmy-accordion-header" onClick={() => toggleCategory(cat.name)}>
                        <span className="pmy-accordion-title">{cat.name}</span>
                        <span className="pmy-accordion-arrow">▼</span>
                      </div>
                      <div className={`pmy-accordion-content ${openCategories.includes(cat.name)?'open':''}`}>
                        {cat.toursList.length === 0 ? (
                          <p style={{ padding:'10px 0', color:'#999', fontSize:'14px' }}>Nenhum passeio nesta categoria.</p>
                        ) : cat.toursList.map(tour => {
                          const masterTourId = tour.masterTourId || tour.id;
                          const tourBookings = realConfirmedBookings.filter(b => b.tourId === masterTourId);
                          const shopifyB = tourBookings.filter(b=>b.platform==='SHOPIFY').length;
                          const viatorB  = tourBookings.filter(b=>b.platform==='VIATOR').length;
                          const gygB     = tourBookings.filter(b=>b.platform==='GETYOURGUIDE').length;
                          return (
                            <div className="pmy-tour-item" key={tour.id}>
                              {tour.image
                                ? <img src={tour.image} alt={tour.imageAlt || tour.title} className={`pmy-tour-img ${imageShape}`} />
                                : <div className={`pmy-tour-img ${imageShape}`} style={{ display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px', background:'#f9f2f2' }}>🏰</div>
                              }
                              <div className="pmy-tour-details">
                                <div className="pmy-tour-name">{tour.title||"Tour sem título"}</div>
                                {tour.price && <div style={{ fontSize:'12px', color:'var(--primary-green)', fontWeight:'700', marginBottom:'4px' }}>{tour.price}</div>}
                                <div className="pmy-tag-row">
                                  <span className="pmy-tag site">{t.source_site}: {shopifyB} reservas</span>
                                  <span className="pmy-tag viator">{t.source_viator}: {viatorB} reservas</span>
                                  <span className="pmy-tag gyg">{t.source_gyg}: {gygB} reservas</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
    </>
  );
}
