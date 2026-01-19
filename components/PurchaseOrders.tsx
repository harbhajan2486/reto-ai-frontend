
import React, { useState } from 'react';
import { NLCItem, PurchaseOrder, InventoryItem, UserRole, RetailerProfile, InvoiceSettings } from '../types';
import { Plus, Check, Truck, Building2, ChevronRight, ChevronDown, Eye, X, ThumbsUp, ThumbsDown, Filter, Loader2, ShoppingCart, Trash2, Clock, List, FileCheck, ArrowUpDown, ArrowUp, ArrowDown, Hash, MapPin, Package, CalendarDays } from 'lucide-react';

interface PurchaseOrdersProps {
  nlcItems: NLCItem[];
  orders: PurchaseOrder[];
  setOrders: React.Dispatch<React.SetStateAction<PurchaseOrder[]>>;
  setInventory: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
  userRole: UserRole;
  activeRetailerId: string;
  retailers: RetailerProfile[];
  allOrders: PurchaseOrder[]; 
  invoiceSettings: InvoiceSettings;
  setRetailers?: React.Dispatch<React.SetStateAction<RetailerProfile[]>>;
}

const getFinalNLC = (nlcItem: NLCItem | undefined): number => {
    if (!nlcItem) return 0;
    const upfront = nlcItem.discountSchemes.filter(d => !d.isBackend).reduce((sum, d) => sum + d.amount, 0);
    const backend = nlcItem.discountSchemes.filter(d => d.isBackend).reduce((sum, d) => sum + d.amount, 0);
    const netBasic = nlcItem.basicPrice - upfront;
    const gst = netBasic * (nlcItem.gstRate / 100);
    const invoiceAmt = netBasic + gst;
    return invoiceAmt - backend;
};

const PurchaseOrders: React.FC<PurchaseOrdersProps> = ({ 
    nlcItems, orders, setOrders, setInventory, userRole, activeRetailerId, retailers, allOrders, invoiceSettings, setRetailers
}) => {
  const [showCreate, setShowCreate] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });
  
  const [adminMainTab, setAdminMainTab] = useState<'PROCUREMENT' | 'DIRECT_GODOWN'>('PROCUREMENT');
  const [procurementSubTab, setProcurementSubTab] = useState<'PENDING' | 'CONSOLIDATE' | 'HISTORY'>('PENDING');
  
  const [consolidateBrandFilter, setConsolidateBrandFilter] = useState<string>('ALL');
  const [selectedConsolidationKeys, setSelectedConsolidationKeys] = useState<Set<string>>(new Set());
  const [showMasterPreview, setShowMasterPreview] = useState(false);

  const [newOrderBrand, setNewOrderBrand] = useState('');
  const [newOrderItems, setNewOrderItems] = useState<{model: string, qty: number}[]>([]);

  const handleUpdateStatus = (id: string, newStatus: PurchaseOrder['status']) => {
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o));
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const renderSortIcon = (key: string) => {
    if (sortConfig.key !== key) return <ArrowUpDown size={10} className="ml-1 opacity-20" />;
    return sortConfig.direction === 'asc' ? <ArrowUp size={10} className="ml-1 text-white" /> : <ArrowDown size={10} className="ml-1 text-white" />;
  };

  const getStatusLabel = (order: PurchaseOrder) => {
      switch(order.status) {
          case 'REQUESTED': return 'Pending Approval';
          case 'APPROVED': return 'Approved / Pending Consolidation';
          case 'ON_HOLD': return 'On Hold';
          case 'CONSOLIDATED': return 'Consolidated / Order Not Placed';
          case 'MASTER_ORDERED': return 'Consolidated & Order Placed';
          case 'SHIPPED': return 'Order Placed / Delivery Pending';
          case 'RECEIVED': return 'Order Received';
          case 'REJECTED': return 'Rejected';
          default: return order.status;
      }
  };

  const getStatusColor = (order: PurchaseOrder) => {
      switch(order.status) {
          case 'REQUESTED': return 'bg-orange-100 text-orange-700';
          case 'APPROVED': return 'bg-blue-50 text-blue-600';
          case 'ON_HOLD': return 'bg-yellow-100 text-yellow-700';
          case 'CONSOLIDATED': return 'bg-indigo-50 text-indigo-600';
          case 'MASTER_ORDERED': return 'bg-indigo-600 text-white';
          case 'SHIPPED': return 'bg-amber-100 text-amber-700';
          case 'RECEIVED': return 'bg-green-100 text-green-700';
          case 'REJECTED': return 'bg-red-100 text-red-700';
          default: return 'bg-gray-100 text-gray-700';
      }
  };

  const calculateOrderValue = (order: PurchaseOrder) => {
      return order.items.reduce((sum, item) => {
          const nlc = nlcItems.find(n => n.id === item.nlcItemId);
          return sum + (getFinalNLC(nlc) * item.quantity);
      }, 0);
  };

  const handleAddOrder = () => {
      if(!newOrderBrand || newOrderItems.length === 0) return;
      
      const poItems = newOrderItems.map(oi => {
          // FIND LATEST NLC FOR THIS MODEL
          const latestNlc = nlcItems
            .filter(n => n.model === oi.model)
            .sort((a,b) => new Date(b.batchDate).getTime() - new Date(a.batchDate).getTime())[0];
          
          return { nlcItemId: latestNlc.id, quantity: oi.qty };
      });

      const newPO: PurchaseOrder = {
          id: `REQ-${newOrderBrand.substring(0,2).toUpperCase()}-${Date.now().toString().slice(-4)}`,
          manufacturer: newOrderBrand,
          date: new Date().toISOString(),
          status: userRole === 'ADMIN' ? 'APPROVED' : 'REQUESTED',
          retailerId: userRole === 'ADMIN' ? 'admin_central' : activeRetailerId,
          items: poItems
      };
      
      setOrders([newPO, ...orders]);
      setShowCreate(false);
      setNewOrderBrand('');
      setNewOrderItems([]);
  };

  const handleToggleSelection = (key: string, brand: string) => {
      const newSet = new Set(selectedConsolidationKeys);
      if (newSet.has(key)) {
          newSet.delete(key);
      } else {
          const existingKeys = Array.from(newSet) as string[];
          if (existingKeys.length > 0) {
              const firstOrder = allOrders.find(o => o.id === existingKeys[0].split('_')[0]);
              if (firstOrder && firstOrder.manufacturer !== brand) {
                  alert("Consolidation must be for the same brand.");
                  return;
              }
          }
          newSet.add(key);
      }
      setSelectedConsolidationKeys(newSet);
  };

  const handleGenerateMasterPO = async () => {
      setIsProcessing(true);
      await new Promise(resolve => setTimeout(resolve, 1500));
      const itemsToConsolidate = Array.from(selectedConsolidationKeys) as string[];
      if (itemsToConsolidate.length === 0) {
          setIsProcessing(false);
          return;
      }
      const firstOrderId = itemsToConsolidate[0].split('_')[0];
      const brand = allOrders.find(o => o.id === firstOrderId)?.manufacturer || 'UNKNOWN';
      const masterPOId = `M-PO-${brand.toUpperCase()}-${Date.now().toString().slice(-3)}`;
      const orderIds = new Set(itemsToConsolidate.map(k => k.split('_')[0]));

      setOrders(prev => prev.map(o => {
          if (orderIds.has(o.id)) {
              return { ...o, status: 'MASTER_ORDERED' as const, masterPOId };
          }
          return o;
      }));
      setSelectedConsolidationKeys(new Set());
      setShowMasterPreview(false);
      setIsProcessing(false);
      alert(`Master PO ${masterPOId} Generated Successfully. Brand Order Executed.`);
  };

  const renderTable = (filteredOrders: PurchaseOrder[], showMasterColumn = true, showActions = false) => {
    const sorted = [...filteredOrders].sort((a, b) => {
        if (sortConfig.key === 'date') {
            const da = new Date(a.date).getTime();
            const db = new Date(b.date).getTime();
            return sortConfig.direction === 'asc' ? da - db : db - da;
        }
        if (sortConfig.key === 'value') {
            const va = calculateOrderValue(a);
            const vb = calculateOrderValue(b);
            return sortConfig.direction === 'asc' ? va - vb : vb - va;
        }
        return 0;
    });

    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in">
          <table className="w-full text-left text-[11px] table-fixed border-collapse">
              <thead className="bg-slate-900 text-white font-black uppercase tracking-widest border-b border-slate-800">
                  <tr className="divide-x divide-slate-800">
                      <th className="px-5 py-4 w-28 cursor-pointer hover:bg-slate-800 transition" onClick={() => handleSort('date')}>In-Date {renderSortIcon('date')}</th>
                      <th className="px-5 py-4 w-32">Retailer Req ID</th>
                      {showMasterColumn && <th className="px-5 py-4 w-32">Master PO Ref</th>}
                      <th className="px-5 py-4 w-28">Brand</th>
                      <th className="px-5 py-4 w-auto">Store Location</th>
                      <th className="px-5 py-4 w-48">Lifecycle Status</th>
                      <th className="px-5 py-4 text-right w-28 cursor-pointer hover:bg-slate-800 transition" onClick={() => handleSort('value')}>Value {renderSortIcon('value')}</th>
                      {showActions && <th className="px-5 py-4 text-center w-36">Controls</th>}
                  </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                  {sorted.map(order => {
                      const isExpanded = expandedId === order.id;
                      const retailer = retailers.find(r => r.id === order.retailerId);
                      return (
                        <React.Fragment key={order.id}>
                          <tr className="hover:bg-slate-50 transition cursor-pointer group" onClick={() => setExpandedId(isExpanded ? null : order.id)}>
                              <td className="px-5 py-4 text-slate-500 font-bold">{new Date(order.date).toLocaleDateString()}</td>
                              <td className="px-5 py-4 font-black text-blue-600 font-mono tracking-tighter">
                                <div className="flex items-center gap-1.5"><Hash size={10} className="text-slate-300"/>{order.id}</div>
                              </td>
                              {showMasterColumn && <td className="px-5 py-4 font-black text-indigo-600 font-mono tracking-tighter">{order.masterPOId || '-'}</td>}
                              <td className="px-5 py-4 font-black text-slate-800 uppercase">{order.manufacturer}</td>
                              <td className="px-5 py-4 font-bold text-slate-600 truncate">{retailer?.name || 'Direct Hub Stock'}</td>
                              <td className="px-5 py-4">
                                  <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-sm ${getStatusColor(order)}`}>
                                      {getStatusLabel(order)}
                                  </span>
                              </td>
                              <td className="px-5 py-4 text-right font-black text-slate-900 flex items-center justify-end gap-2">
                                <span>₹{calculateOrderValue(order).toFixed(0)}</span>
                                <ChevronRight size={14} className={`text-slate-300 transition-transform ${isExpanded ? 'rotate-90 text-blue-500' : ''}`} />
                              </td>
                              {showActions && (
                                  <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                                      <div className="flex items-center justify-center gap-2">
                                          <button onClick={() => handleUpdateStatus(order.id, 'APPROVED')} title="Approve Request" className="p-2 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 transition shadow-sm border border-green-100"><Check size={14}/></button>
                                          <button onClick={() => handleUpdateStatus(order.id, 'ON_HOLD')} title="Hold Request" className="p-2 bg-yellow-50 text-yellow-600 rounded-xl hover:bg-yellow-100 transition shadow-sm border border-yellow-100"><Clock size={14}/></button>
                                          <button onClick={() => handleUpdateStatus(order.id, 'REJECTED')} title="Reject Request" className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition shadow-sm border border-red-100"><X size={14}/></button>
                                      </div>
                                  </td>
                              )}
                          </tr>
                          {isExpanded && (
                            <tr className="bg-slate-50 border-y shadow-inner animate-fade-in">
                                <td colSpan={showActions ? 8 : (showMasterColumn ? 7 : 6)} className="px-8 py-6">
                                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2 text-indigo-600 font-black text-[10px] uppercase tracking-widest">
                                                <Truck size={14}/> Logistics Detail Audit
                                            </div>
                                            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-sm">
                                                <div>
                                                    <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Target Delivery Address</span>
                                                    <p className="text-xs font-bold text-slate-700 leading-relaxed flex items-start gap-2">
                                                        <MapPin size={12} className="text-red-500 mt-0.5 shrink-0"/>
                                                        {retailer ? (
                                                            `${retailer.showroomAddress}, ${retailer.city}, ${retailer.pincode}`
                                                        ) : (
                                                            'RETO Central Godown Hub, Bangalore'
                                                        )}
                                                    </p>
                                                </div>
                                                <div className="pt-3 border-t">
                                                    <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Consolidated Master PO Ref</span>
                                                    <p className="text-sm font-black text-indigo-900 font-mono tracking-tighter">{order.masterPOId || 'PENDING CONSOLIDATION'}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2 text-blue-600 font-black text-[10px] uppercase tracking-widest">
                                                <Package size={14}/> SKU Batch Specification
                                            </div>
                                            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                                                <table className="w-full text-[10px] text-left">
                                                    <thead className="bg-slate-900 text-white font-black uppercase tracking-widest">
                                                        <tr>
                                                            <th className="px-5 py-3">Model Specifics</th>
                                                            <th className="px-5 py-3 text-center">Batch Qty</th>
                                                            <th className="px-5 py-3 text-right">Line Subtotal</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y">
                                                        {order.items.map(item => {
                                                            const nlc = nlcItems.find(n => n.id === item.nlcItemId);
                                                            return (
                                                                <tr key={item.nlcItemId} className="hover:bg-slate-50 transition-colors">
                                                                    <td className="px-5 py-3 font-black text-slate-800 uppercase tracking-tighter">{nlc?.model}</td>
                                                                    <td className="px-5 py-3 text-center font-black text-indigo-600">{item.quantity} U</td>
                                                                    <td className="px-5 py-3 text-right font-black">₹{(getFinalNLC(nlc) * item.quantity).toFixed(0)}</td>
                                                                </tr>
                                                            )
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                  })}
              </tbody>
          </table>
      </div>
    );
  }

  const selectedItemsData = allOrders.filter(o => o.status === 'APPROVED').flatMap(o => o.items.map(i => ({ order: o, item: i, key: `${o.id}_${i.nlcItemId}` })))
                            .filter(x => selectedConsolidationKeys.has(x.key as string));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Supply Chain Procurement</h2>
        <button 
          onClick={() => setShowCreate(true)} 
          className="bg-blue-600 text-white px-6 py-3 rounded-2xl flex items-center hover:bg-blue-700 shadow-xl shadow-blue-500/20 font-black text-xs uppercase tracking-widest transition-all active:scale-95 z-20"
        >
            <Plus size={18} className="mr-2" /> {userRole === 'ADMIN' ? 'Place Direct Hub Order' : 'New Procurement Request'}
        </button>
      </div>

      {userRole === 'ADMIN' && (
          <div className="space-y-6 animate-fade-in">
              <div className="flex bg-slate-200 p-1 rounded-2xl w-fit">
                  <button onClick={() => setAdminMainTab('PROCUREMENT')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${adminMainTab === 'PROCUREMENT' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Retailer Supply Pipeline</button>
                  <button onClick={() => setAdminMainTab('DIRECT_GODOWN')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${adminMainTab === 'DIRECT_GODOWN' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Hub Direct Imports</button>
              </div>

              {adminMainTab === 'PROCUREMENT' ? (
                  <div className="space-y-4">
                      <div className="flex gap-2">
                          {['PENDING', 'CONSOLIDATE', 'HISTORY'].map(tab => (
                              <button key={tab} onClick={() => setProcurementSubTab(tab as any)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${procurementSubTab === tab ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-500/20' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>
                                  {tab === 'PENDING' ? 'Unapproved Requests' : tab === 'CONSOLIDATE' ? 'Consolidation Hub' : 'Full Support History'}
                              </button>
                          ))}
                      </div>

                      {procurementSubTab === 'PENDING' && renderTable(allOrders.filter(o => (o.status === 'REQUESTED' || o.status === 'ON_HOLD') && o.retailerId !== 'admin_central'), false, true)}
                      
                      {procurementSubTab === 'CONSOLIDATE' && (
                          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-fade-in">
                              <div className="p-5 border-b bg-slate-50/50 flex justify-between items-center">
                                  <div className="flex items-center gap-4 bg-white p-2 rounded-xl border shadow-inner">
                                      <Filter size={14} className="text-slate-400"/>
                                      <select className="text-xs font-black uppercase text-slate-800 outline-none bg-transparent" value={consolidateBrandFilter} onChange={e => setConsolidateBrandFilter(e.target.value)}>
                                          <option value="ALL">Consolidate By Brand</option>
                                          {Array.from(new Set(allOrders.filter(o => o.status === 'APPROVED').map(o => o.manufacturer))).map(b => <option key={b} value={b}>{b}</option>)}
                                      </select>
                                  </div>
                                  <div className="flex items-center gap-3">
                                      <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{selectedConsolidationKeys.size} Requests Staged</span>
                                      <button disabled={selectedConsolidationKeys.size === 0} onClick={() => setShowMasterPreview(true)} className="px-8 py-3 bg-indigo-600 text-white text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center shadow-lg shadow-indigo-500/20">
                                          <FileCheck size={16} className="mr-2"/> Generate Master PO
                                      </button>
                                  </div>
                              </div>
                              <table className="w-full text-left text-xs table-fixed">
                                  <thead className="bg-slate-900 text-white font-black uppercase tracking-widest border-b border-slate-800">
                                      <tr>
                                          <th className="px-5 py-4 w-12 text-center"></th>
                                          <th className="px-5 py-4 w-32">Req ID</th>
                                          <th className="px-5 py-4 w-auto">Retailer Node</th>
                                          <th className="px-5 py-4 w-28">Brand</th>
                                          <th className="px-5 py-4 w-48">SKU Spec</th>
                                          <th className="px-5 py-4 text-center w-20">Units</th>
                                          <th className="px-5 py-4 text-right w-28">Line Val</th>
                                      </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                      {allOrders.filter(o => o.status === 'APPROVED' && (consolidateBrandFilter === 'ALL' || o.manufacturer === consolidateBrandFilter)).flatMap(order => order.items.map(item => {
                                          const key = `${order.id}_${item.nlcItemId}`;
                                          const isSelected = selectedConsolidationKeys.has(key);
                                          const retailer = retailers.find(r => r.id === order.retailerId);
                                          const nlc = nlcItems.find(n => n.id === item.nlcItemId);
                                          const val = getFinalNLC(nlc) * item.quantity;
                                          return (
                                              <tr key={key} className={`cursor-pointer transition-colors ${isSelected ? 'bg-indigo-50' : 'hover:bg-slate-50'}`} onClick={() => handleToggleSelection(key, order.manufacturer)}>
                                                  <td className="px-5 py-4 text-center"><input type="checkbox" className="rounded-lg w-5 h-5 text-indigo-600 border-slate-300 pointer-events-none" checked={isSelected} readOnly /></td>
                                                  <td className="px-5 py-4 font-mono font-bold text-blue-500 tracking-tighter">{order.id}</td>
                                                  <td className="px-5 py-4 font-black text-slate-800 truncate">{retailer?.name}</td>
                                                  <td className="px-5 py-4 font-black text-slate-600 uppercase">{order.manufacturer}</td>
                                                  <td className="px-5 py-4 text-slate-500 font-bold truncate">{nlc?.model}</td>
                                                  <td className="px-5 py-4 text-center font-black text-indigo-600 bg-indigo-50/20">{item.quantity}</td>
                                                  <td className="px-5 py-4 text-right font-black">₹{val.toFixed(0)}</td>
                                              </tr>
                                          )
                                      }))}
                                  </tbody>
                              </table>
                          </div>
                      )}

                      {procurementSubTab === 'HISTORY' && renderTable(allOrders.filter(o => o.status !== 'REQUESTED' && o.status !== 'ON_HOLD' && o.retailerId !== 'admin_central'), true)}
                  </div>
              ) : (
                  renderTable(allOrders.filter(o => o.retailerId === 'admin_central'), true)
              )}
          </div>
      )}

      {userRole === 'RETAILER' && renderTable(allOrders.filter(o => o.retailerId === activeRetailerId), true)}

      {/* CREATE PO MODAL */}
      {showCreate && (
          <div className="fixed inset-0 bg-slate-900/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm overflow-hidden">
              <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden animate-scale-up border border-slate-200">
                  <div className="p-6 border-b bg-slate-50 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-600 rounded-lg text-white"><ShoppingCart size={20}/></div>
                        <h3 className="font-black uppercase tracking-widest text-slate-800">{userRole === 'ADMIN' ? 'Place Bulk Hub Order' : 'Procurement Request'}</h3>
                      </div>
                      <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-slate-600 transition p-1"><X size={24}/></button>
                  </div>
                  <div className="p-6 space-y-4">
                      <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Select Manufacturer</label>
                          <select className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold bg-white text-slate-800 shadow-sm" value={newOrderBrand} onChange={e => {setNewOrderBrand(e.target.value); setNewOrderItems([]);}}>
                              <option value="" className="text-slate-400">-- Choose Brand Node --</option>
                              {Array.from(new Set(nlcItems.map(i => i.manufacturer))).map(b => <option key={b} value={b}>{b}</option>)}
                          </select>
                      </div>
                      {newOrderBrand && (
                          <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2 scrollbar-hide">
                              {/* DISTINCT MODELS FOR BRAND */}
                              {Array.from(new Set(nlcItems.filter(i => i.manufacturer === newOrderBrand).map(i => i.model))).map(modelName => {
                                  const latestNlc = nlcItems
                                    .filter(n => n.model === modelName)
                                    .sort((a,b) => new Date(b.batchDate).getTime() - new Date(a.batchDate).getTime())[0];
                                  
                                  const calculatedNlc = getFinalNLC(latestNlc);
                                  const batchMonth = new Date(latestNlc.batchDate).toLocaleString('default', { month: 'long', year: 'numeric' });

                                  return (
                                      <div key={modelName} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl group hover:bg-white hover:shadow-md transition-all">
                                          <div className="flex-1 pr-3">
                                              <span className="font-black text-slate-800 block text-xs">{modelName}</span>
                                              <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[9px] text-blue-600 font-black tracking-widest bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                                                    ₹{calculatedNlc.toFixed(0)}
                                                </span>
                                                <span className="text-[8px] text-slate-400 uppercase font-black tracking-tighter flex items-center gap-1">
                                                    <CalendarDays size={10}/> {batchMonth} Deck
                                                </span>
                                              </div>
                                          </div>
                                          <input 
                                            type="number" 
                                            className="w-20 p-2.5 border-2 border-slate-200 rounded-xl text-center font-black text-blue-600 focus:border-blue-500 outline-none bg-white shadow-inner" 
                                            placeholder="0"
                                            min="0"
                                            value={newOrderItems.find(ni => ni.model === modelName)?.qty || ''}
                                            onChange={e => {
                                                const qty = parseInt(e.target.value) || 0;
                                                setNewOrderItems(prev => {
                                                    const filtered = prev.filter(p => p.model !== modelName);
                                                    return qty > 0 ? [...filtered, {model: modelName, qty}] : filtered;
                                                });
                                            }}
                                          />
                                      </div>
                                  );
                              })}
                          </div>
                      )}
                      <div className="pt-4 border-t mt-4">
                          <div className="flex justify-between items-center mb-6 bg-indigo-50/50 p-5 rounded-2xl border border-indigo-100/50">
                              <div>
                                  <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest block mb-1">Estimated Purchase Value</span>
                                  <span className="text-2xl font-black text-indigo-900">
                                      ₹{newOrderItems.reduce((acc, curr) => {
                                          const nlc = nlcItems.filter(n => n.model === curr.model).sort((a,b) => new Date(b.batchDate).getTime() - new Date(a.batchDate).getTime())[0];
                                          return acc + (getFinalNLC(nlc) * curr.qty);
                                      }, 0).toFixed(0)}
                                  </span>
                              </div>
                              <div className="text-right">
                                  <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest block mb-1">Total SKU Volume</span>
                                  <span className="text-xl font-black text-indigo-700">{newOrderItems.reduce((s,i) => s + i.qty, 0)} Units</span>
                              </div>
                          </div>
                          <button 
                            disabled={!newOrderBrand || newOrderItems.length === 0}
                            onClick={handleAddOrder} 
                            className="w-full py-4 bg-blue-600 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl hover:bg-blue-700 transition shadow-xl shadow-blue-500/20 disabled:opacity-50 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
                          >
                              {userRole === 'ADMIN' ? 'Execute Bulk Import' : 'Dispatch Request to Hub'}
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* PREVIEW MASTER PO MODAL */}
      {showMasterPreview && (
          <div className="fixed inset-0 bg-slate-900/90 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-scale-up border-4 border-indigo-600/20">
                  <div className="p-8 border-b bg-slate-900 text-white flex justify-between items-center">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-600/20"><Truck size={28} /></div>
                        <div>
                            <h3 className="text-xl font-black uppercase tracking-widest">Master PO Generation</h3>
                            <p className="text-[10px] text-indigo-300 font-black uppercase tracking-[0.2em] mt-1">Consolidating {selectedItemsData.length} Requests for {selectedItemsData[0]?.order.manufacturer}</p>
                        </div>
                      </div>
                      <button onClick={() => setShowMasterPreview(false)} className="bg-slate-800 p-2 rounded-xl text-slate-400 hover:text-white transition-all"><X size={20}/></button>
                  </div>
                  <div className="p-8">
                      <div className="mb-8 bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden shadow-inner">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-900 text-white font-black uppercase tracking-widest border-b">
                                <tr>
                                    <th className="px-6 py-3">Model Specifics</th>
                                    <th className="px-6 py-3 text-center">Batch Qty</th>
                                    <th className="px-6 py-3 text-right">Batch NLC Value</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {Array.from(new Set(selectedItemsData.map(x => x.item.nlcItemId))).map(nlcId => {
                                    const nlc = nlcItems.find(n => n.id === nlcId);
                                    const totalQty = selectedItemsData.filter(x => x.item.nlcItemId === nlcId).reduce((sum, x) => sum + x.item.quantity, 0);
                                    const totalValue = getFinalNLC(nlc) * totalQty;
                                    return (
                                        <tr key={nlcId} className="hover:bg-white transition-colors">
                                            <td className="px-6 py-4 font-black text-slate-800">{nlc?.model}</td>
                                            <td className="px-6 py-4 text-center font-black text-indigo-600">{totalQty} Units</td>
                                            <td className="px-6 py-4 text-right font-black">₹{totalValue.toFixed(0)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                      </div>

                      <div className="grid grid-cols-2 gap-6 mb-10">
                          <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100 shadow-sm flex flex-col justify-center">
                              <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.1em] block mb-1">Master PO Estimated Total</span>
                              <span className="text-2xl font-black text-blue-900">
                                  ₹{selectedItemsData.reduce((sum, x) => {
                                      const nlc = nlcItems.find(n => n.id === x.item.nlcItemId);
                                      return sum + (getFinalNLC(nlc) * x.item.quantity);
                                  }, 0).toFixed(0)}
                              </span>
                          </div>
                          <div className="p-6 bg-indigo-50 rounded-2xl border border-indigo-100 shadow-sm flex flex-col justify-center">
                              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.1em] block mb-1">Consolidated Unit Count</span>
                              <span className="text-2xl font-black text-indigo-900">{selectedItemsData.reduce((sum, x) => sum + x.item.quantity, 0)} Units</span>
                          </div>
                      </div>

                      <div className="flex gap-4">
                          <button onClick={() => setShowMasterPreview(false)} className="flex-1 py-4 text-xs font-black uppercase tracking-[0.2em] text-slate-500 bg-slate-100 rounded-2xl hover:bg-slate-200 transition-all">Cancel Consolidation</button>
                          <button disabled={isProcessing} onClick={handleGenerateMasterPO} className="flex-2 py-4 px-10 bg-indigo-600 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-3">
                            {isProcessing ? <Loader2 className="animate-spin" size={20}/> : <Check size={20}/>}
                            {isProcessing ? 'Finalizing Master PO...' : 'Execute Brand Order'}
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default PurchaseOrders;
