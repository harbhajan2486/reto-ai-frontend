
import React, { useState } from 'react';
import { RetailerProfile, Sale, InventoryItem, NLCItem, UserRole } from '../types';
import { MapPin, Store, ChevronDown, ChevronUp, Edit3, X, Save, TrendingUp, Globe, Columns, LayoutList, Calendar } from 'lucide-react';

interface RetailerManagerProps {
  retailers: RetailerProfile[];
  setRetailers: React.Dispatch<React.SetStateAction<RetailerProfile[]>>;
  sales: Sale[];
  inventory: InventoryItem[];
  nlcItems: NLCItem[];
  currentUserRole?: UserRole;
  activeRetailerId?: string;
}

const RetailerManager: React.FC<RetailerManagerProps> = ({ 
    retailers, setRetailers, sales, inventory, nlcItems, currentUserRole = 'ADMIN', activeRetailerId 
}) => {
  const [expandedRetailerId, setExpandedRetailerId] = useState<string | null>(currentUserRole === 'RETAILER' ? activeRetailerId || null : null);
  const [expandedMonthKey, setExpandedMonthKey] = useState<string | null>(null);
  const [editingRetailer, setEditingRetailer] = useState<RetailerProfile | null>(null);
  const [showLifecycleColumns, setShowLifecycleColumns] = useState(false);
  
  const [cityFilter, setCityFilter] = useState('ALL');
  const [areaFilter, setAreaFilter] = useState('ALL');

  const getFinalNLC = (nlcId: string) => {
      const item = nlcItems.find(n => n.id === nlcId);
      if(!item) return 0;
      const upfront = item.discountSchemes.filter(d => !d.isBackend).reduce((sum, d) => sum + d.amount, 0);
      const netBasic = item.basicPrice - upfront;
      const gst = netBasic * (item.gstRate / 100);
      const invoiceAmt = netBasic + gst;
      const backend = item.discountSchemes.filter(d => d.isBackend).reduce((sum, d) => sum + d.amount, 0);
      return invoiceAmt - backend; 
  };

  const getInputTax = (nlcId: string) => {
    const item = nlcItems.find(n => n.id === nlcId);
    if(!item) return 0;
    const upfront = item.discountSchemes.filter(d => !d.isBackend).reduce((sum, d) => sum + d.amount, 0);
    const netBasic = item.basicPrice - upfront;
    return netBasic * (item.gstRate / 100);
  };

  const calculateFinancials = (retailerId: string) => {
      const retailerSales = sales.filter(s => s.retailerId === retailerId);
      let revenue = 0;
      let cost = 0;
      retailerSales.forEach(sale => {
          revenue += sale.totalAmount;
          sale.items.forEach(si => {
              const inv = inventory.find(i => i.id === si.inventoryId);
              if(inv) cost += getFinalNLC(inv.nlcItemId);
          });
      });
      const grossMargin = revenue - cost;
      const gmPercent = revenue > 0 ? (grossMargin / revenue) * 100 : 0;
      return { revenue, grossMargin, gmPercent };
  };

  const filteredRetailers = retailers.filter(r => {
      if (r.id === 'admin_central') return false; 
      if (currentUserRole === 'RETAILER') return r.id === activeRetailerId;
      const cityMatch = cityFilter === 'ALL' || r.city === cityFilter;
      const areaMatch = areaFilter === 'ALL' || r.area === areaFilter;
      return cityMatch && areaMatch;
  });

  const uniqueCities = Array.from(new Set(retailers.filter(r => r.id !== 'admin_central').map(r => r.city))).sort();
  const uniqueAreas = Array.from(new Set(retailers.filter(r => r.id !== 'admin_central' && (cityFilter === 'ALL' || r.city === cityFilter)).map(r => r.area))).sort();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4">
        <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">
            {currentUserRole === 'ADMIN' ? 'Geographic Node Portfolio' : 'My Store Performance'}
        </h2>
        
        {currentUserRole === 'ADMIN' && (
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-wrap gap-6 items-center">
              <div className="flex items-center gap-4">
                  <div className="flex flex-col gap-1.5">
                      <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Context City</span>
                      <div className="flex items-center gap-3 bg-slate-100 px-4 py-2 rounded-xl border border-slate-200">
                          <Globe size={14} className="text-blue-500"/>
                          <select className="text-[11px] font-black uppercase outline-none bg-transparent" value={cityFilter} onChange={e => { setCityFilter(e.target.value); setAreaFilter('ALL'); }}>
                              <option value="ALL">All Cities</option>
                              {uniqueCities.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                      </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                      <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Operating Area</span>
                      <div className="flex items-center gap-3 bg-slate-100 px-4 py-2 rounded-xl border border-slate-200">
                          <MapPin size={14} className="text-red-500"/>
                          <select className="text-[11px] font-black uppercase outline-none bg-transparent" value={areaFilter} onChange={e => setAreaFilter(e.target.value)}>
                              <option value="ALL">All Areas</option>
                              {uniqueAreas.map(a => <option key={a} value={a}>{a}</option>)}
                          </select>
                      </div>
                  </div>
              </div>
          </div>
        )}
      </div>
      
      <div className="grid gap-6">
          {filteredRetailers.map(retailer => {
              const { revenue, gmPercent } = calculateFinancials(retailer.id);
              const isExpanded = expandedRetailerId === retailer.id;
              
              const retailerSales = sales.filter(s => s.retailerId === retailer.id);
              const flatList = retailerSales.flatMap(sale => 
                  sale.items.map((saleItem, idx) => {
                      const invItem = inventory.find(i => i.id === saleItem.inventoryId);
                      const nlcItem = nlcItems.find(n => n.id === invItem?.nlcItemId);
                      return { sale, saleItem, idx, invItem, nlcItem };
                  })
              );

              const groupedByMonth: Record<string, { items: typeof flatList, totals: any }> = {};
              flatList.forEach(item => {
                  const { nlcItem, saleItem } = item;
                  const monthKey = new Date(item.sale.date).toLocaleString('default', { month: 'long', year: 'numeric' });
                  if (!groupedByMonth[monthKey]) {
                      groupedByMonth[monthKey] = { items: [], totals: { sellVal: 0, gm: 0, netMargin: 0, retShare: 0, retoShare: 0 } };
                  }
                  if (nlcItem) {
                      const finalNLC = getFinalNLC(nlcItem.id);
                      const sellPrice = saleItem.sellingPrice - saleItem.additionalDiscount;
                      const gm = sellPrice - finalNLC;
                      const outTax = sellPrice - (sellPrice / 1.18);
                      const inTax = getInputTax(nlcItem.id);
                      const netMargin = gm - (outTax - inTax);

                      groupedByMonth[monthKey].totals.sellVal += sellPrice;
                      groupedByMonth[monthKey].totals.gm += gm;
                      groupedByMonth[monthKey].totals.netMargin += netMargin;
                      groupedByMonth[monthKey].totals.retShare += (netMargin * (retailer.partnerSharePercent / 100));
                      groupedByMonth[monthKey].totals.retoShare += (netMargin * ((100 - retailer.partnerSharePercent) / 100));
                  }
                  groupedByMonth[monthKey].items.push(item);
              });

              return (
                  <div key={retailer.id} className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden group transition-all">
                      <div className="p-6 flex flex-col md:flex-row items-center justify-between gap-6 cursor-pointer hover:bg-slate-50 transition-all" onClick={() => currentUserRole === 'ADMIN' && setExpandedRetailerId(isExpanded ? null : retailer.id)}>
                          <div className="flex items-center space-x-5 min-w-[320px]">
                              <div className="bg-blue-600 p-4 rounded-3xl text-white shadow-xl shadow-blue-500/20 group-hover:scale-105 transition-transform"><Store size={28} /></div>
                              <div>
                                  <div className="flex items-center gap-3">
                                      <h3 className="text-lg font-black text-slate-800 tracking-tight">{retailer.name}</h3>
                                      {currentUserRole === 'ADMIN' && (
                                          <button onClick={(e) => { e.stopPropagation(); setEditingRetailer(retailer); }} className="text-blue-600 hover:bg-blue-100 p-2 rounded-xl transition-all bg-blue-50">
                                              <Edit3 size={16}/>
                                          </button>
                                      )}
                                  </div>
                                  <div className="flex gap-4 mt-1.5">
                                      <div className="text-[10px] font-black text-slate-400 flex items-center uppercase tracking-widest"><Globe size={12} className="mr-1.5 text-blue-500"/> {retailer.city}</div>
                                      <div className="text-[10px] font-black text-slate-400 flex items-center uppercase tracking-widest"><MapPin size={12} className="mr-1.5 text-red-500"/> {retailer.area}</div>
                                  </div>
                              </div>
                          </div>
                          <div className="flex-1 w-full grid grid-cols-2 sm:grid-cols-4 gap-8 items-center text-right border-l border-slate-100 pl-8">
                              <div><span className="block text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1">Total Revenue</span><span className="text-sm font-black text-slate-900">₹{revenue.toLocaleString()}</span></div>
                              <div><span className="block text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1">Yield Band</span><span className={`text-sm font-black ${gmPercent >= 12 ? 'text-green-600' : 'text-blue-600'}`}>{gmPercent.toFixed(1)}%</span></div>
                              <div><span className="block text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1">Used Credit</span><span className="text-sm font-black text-slate-700">₹{(retailer.usedCredit/100000).toFixed(1)}L</span></div>
                              <div><span className="block text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1">Profit Share</span><span className="text-sm font-black text-indigo-600">{retailer.partnerSharePercent}%</span></div>
                          </div>
                          {currentUserRole === 'ADMIN' && <div className="text-slate-300 pl-4 group-hover:text-blue-600 transition-colors">{isExpanded ? <ChevronUp size={28}/> : <ChevronDown size={28}/>}</div>}
                      </div>

                      {isExpanded && (
                          <div className="bg-slate-50 border-t border-slate-100 p-8 animate-fade-in space-y-6">
                              <div className="flex justify-between items-center mb-6">
                                  <div className="flex items-center gap-3">
                                      <TrendingUp size={20} className="text-indigo-600"/>
                                      <h4 className="font-black text-xs text-slate-800 uppercase tracking-widest">Node Financial Audit Trail</h4>
                                  </div>
                                  <button onClick={() => setShowLifecycleColumns(!showLifecycleColumns)} className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-2xl text-[10px] font-black text-slate-600 hover:shadow-lg shadow-sm transition-all active:scale-95">
                                      {showLifecycleColumns ? <LayoutList size={16}/> : <Columns size={16}/>}
                                      {showLifecycleColumns ? 'Ledger Only' : 'Supply Lifecycle Trace'}
                                  </button>
                              </div>
                              
                              <div className="space-y-4">
                                {Object.entries(groupedByMonth).map(([month, data]) => {
                                    const isMonthExpanded = expandedMonthKey === `${retailer.id}-${month}`;
                                    return (
                                        <div key={month} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                                            <div onClick={() => setExpandedMonthKey(isMonthExpanded ? null : `${retailer.id}-${month}`)} className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors">
                                                <div className="flex items-center gap-4">
                                                    <div className={`p-3 rounded-2xl ${isMonthExpanded ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 text-slate-500'}`}><Calendar size={20}/></div>
                                                    <div>
                                                        <h5 className="text-sm font-black text-slate-800 uppercase tracking-tight">{month}</h5>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{data.items.length} Transactions</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-10 text-right">
                                                    <div><span className="block text-[9px] text-slate-400 font-black uppercase mb-0.5 tracking-widest">Gross Bill</span><span className="text-sm font-black text-blue-700">₹{data.totals.sellVal.toFixed(0)}</span></div>
                                                    <div><span className="block text-[9px] text-slate-400 font-black uppercase mb-0.5 tracking-widest">Partner Profit</span><span className="text-sm font-black text-indigo-600">₹{data.totals.retShare.toFixed(0)}</span></div>
                                                    <div className="text-slate-300 ml-6">{isMonthExpanded ? <ChevronUp size={24}/> : <ChevronDown size={24}/>}</div>
                                                </div>
                                            </div>
                                            {isMonthExpanded && (
                                                <div className="border-t border-slate-100 overflow-x-auto scrollbar-hide animate-fade-in">
                                                    <table className="w-full text-left text-[10px] border-collapse min-w-[1400px]">
                                                        <thead className="bg-slate-900 text-white font-black uppercase tracking-widest">
                                                            <tr>
                                                                <th className="px-6 py-5">Sale Date</th>
                                                                <th className="px-6 py-5">Tax Invoice Ref</th>
                                                                {showLifecycleColumns && (
                                                                    <>
                                                                        <th className="px-6 py-5 w-40">Mapped Serial</th>
                                                                        <th className="px-6 py-5 w-40">Procurement PO</th>
                                                                        <th className="px-6 py-5 text-right bg-indigo-950">Unit NLC</th>
                                                                    </>
                                                                )}
                                                                <th className="px-6 py-5 text-right font-black bg-blue-900 text-white">Gross Bill</th>
                                                                <th className="px-6 py-5 text-right font-black text-green-400">GM Value</th>
                                                                <th className="px-6 py-5 text-right bg-yellow-950 text-yellow-300">Partner Profit</th>
                                                                <th className="px-6 py-5 text-right bg-purple-900 text-purple-100">Reto Share</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100 font-bold">
                                                            {data.items.map((item, idx) => {
                                                                const finalNLC = getFinalNLC(item.nlcItem?.id || '');
                                                                const sellPrice = item.saleItem.sellingPrice - item.additionalDiscount;
                                                                const gm = sellPrice - finalNLC;
                                                                const outTax = sellPrice - (sellPrice / 1.18);
                                                                const inTax = getInputTax(item.nlcItem?.id || '');
                                                                const netMargin = gm - (outTax - inTax);

                                                                return (
                                                                    <tr key={`${item.sale.id}-${idx}`} className="hover:bg-slate-50 transition-colors">
                                                                        <td className="px-6 py-4 text-slate-500">{new Date(item.sale.date).toLocaleDateString()}</td>
                                                                        <td className="px-6 py-4 font-black text-slate-800">{item.sale.invoiceNumber}</td>
                                                                        {showLifecycleColumns && (
                                                                            <>
                                                                                <td className="px-6 py-4 font-mono font-black text-blue-600 tracking-tighter">{item.invItem?.serialNumber}</td>
                                                                                <td className="px-6 py-4 font-mono text-slate-400 tracking-tighter">{item.invItem?.retailerPOId || '-'}</td>
                                                                                <td className="px-6 py-4 text-right font-black text-indigo-400 bg-indigo-50/20">₹{finalNLC.toLocaleString()}</td>
                                                                            </>
                                                                        )}
                                                                        <td className="px-6 py-4 text-right font-black text-blue-700 bg-blue-50/20">₹{sellPrice.toLocaleString()}</td>
                                                                        <td className="px-6 py-4 text-right font-black text-green-600">₹{gm.toLocaleString()}</td>
                                                                        <td className="px-6 py-4 text-right font-black bg-yellow-50 text-yellow-800">₹{(netMargin * (retailer.partnerSharePercent / 100)).toFixed(0)}</td>
                                                                        <td className="px-6 py-4 text-right font-black bg-purple-50 text-purple-800">₹{(netMargin * ((100 - retailer.partnerSharePercent) / 100)).toFixed(0)}</td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                              </div>
                          </div>
                      )}
                  </div>
              );
          })}
      </div>

      {editingRetailer && (
          <div className="fixed inset-0 bg-slate-950/80 z-[100] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in">
              <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden border border-slate-200 animate-scale-up">
                  <div className="p-8 border-b bg-slate-900 text-white flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-600 rounded-xl text-white"><Store size={24}/></div>
                        <h3 className="font-black uppercase tracking-widest text-base leading-none">Node Identity Sync</h3>
                      </div>
                      <button onClick={() => setEditingRetailer(null)} className="text-slate-400 hover:text-white transition-all"><X size={28}/></button>
                  </div>
                  <div className="p-10 space-y-8">
                      <div className="grid grid-cols-2 gap-6">
                          <div className="col-span-2">
                             <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Store Display Name</label>
                             <input className="w-full p-4 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-600 text-sm font-black text-slate-800 bg-slate-50" value={editingRetailer.name} onChange={e => setEditingRetailer({...editingRetailer, name: e.target.value})} />
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Region City</label>
                            <input className="w-full p-4 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-600 text-sm font-black text-slate-800 bg-slate-50" value={editingRetailer.city} onChange={e => setEditingRetailer({...editingRetailer, city: e.target.value})} />
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Territory Area</label>
                            <input className="w-full p-4 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-600 text-sm font-black text-slate-800 bg-slate-50" value={editingRetailer.area} onChange={e => setEditingRetailer({...editingRetailer, area: e.target.value})} />
                          </div>
                          <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Credit Exposure (₹)</label>
                                <input type="number" className="w-full p-4 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-600 text-sm font-black text-slate-800 bg-slate-50" value={editingRetailer.creditLimit} onChange={e => setEditingRetailer({...editingRetailer, creditLimit: parseFloat(e.target.value)})} />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Partner Split %</label>
                                <input type="number" className="w-full p-4 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-600 text-sm font-black text-slate-800 bg-slate-50" value={editingRetailer.partnerSharePercent} onChange={e => setEditingRetailer({...editingRetailer, partnerSharePercent: parseFloat(e.target.value)})} />
                            </div>
                      </div>
                      <div className="flex gap-4 pt-4">
                          <button onClick={() => setEditingRetailer(null)} className="flex-1 py-4 text-xs font-black uppercase tracking-widest text-slate-500 bg-slate-100 rounded-2xl hover:bg-slate-200 transition-all">Discard</button>
                          <button onClick={() => { setRetailers(prev => prev.map(r => r.id === editingRetailer.id ? editingRetailer : r)); setEditingRetailer(null); }} className="flex-1 py-4 bg-blue-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 flex items-center justify-center gap-3">
                            <Save size={18}/> Commit Update
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default RetailerManager;
