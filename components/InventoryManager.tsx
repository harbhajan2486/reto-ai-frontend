
import React, { useState } from 'react';
import { InventoryItem, NLCItem, RetailerProfile, UserRole, PurchaseOrder } from '../types';
// Added Truck to the list of imports from lucide-react
import { Package, Search, ChevronDown, ChevronRight, Timer, MapPin, X, Bot, Loader2, ClipboardList, History, FileCheck, Hash, CalendarDays, Paperclip, BadgeCheck, ArrowUpDown, ArrowUp, ArrowDown, Info, Box, Layers, Wallet, ExternalLink, Truck } from 'lucide-react';

interface InventoryManagerProps {
  inventory: InventoryItem[];
  nlcItems: NLCItem[];
  retailers: RetailerProfile[];
  userRole: UserRole;
  activeRetailerId?: string;
  orders: PurchaseOrder[];
  setOrders: React.Dispatch<React.SetStateAction<PurchaseOrder[]>>;
  setInventory: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
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

const InventoryManager: React.FC<InventoryManagerProps> = ({ 
  inventory, nlcItems, retailers, userRole, activeRetailerId, orders, setOrders, setInventory 
}) => {
  const [activeTab, setActiveTab] = useState<'STOCK' | 'INWARD' | 'RECON_LOG'>('STOCK');
  const [searchQuery, setSearchQuery] = useState('');
  const [retailerFilter, setRetailerFilter] = useState('ALL');
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'model', direction: 'asc' });
  const [expandedGroupKey, setExpandedGroupKey] = useState<string | null>(null);
  const [expandedReconKey, setExpandedReconKey] = useState<string | null>(null);
  
  const [mappingOrder, setMappingOrder] = useState<PurchaseOrder | null>(null);
  const [mappingData, setMappingData] = useState<Record<string, { received: number, serials: string }>>({});
  const [invoiceRef, setInvoiceRef] = useState('');
  const [isAiProcessing, setIsAiProcessing] = useState(false);

  const getLocationName = (retailerId: string) => {
      if (retailerId === 'admin_central') return 'RETO Central Hub';
      const retailer = retailers.find(r => r.id === retailerId);
      return retailer ? retailer.name : 'Unknown Location';
  };

  const getFullAddress = (retailerId: string) => {
      const retailer = retailers.find(r => r.id === retailerId);
      if (retailerId === 'admin_central') return 'RETO HQ, Indiranagar, Bangalore';
      return retailer ? `${retailer.showroomAddress}, ${retailer.city}` : 'Unknown Address';
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
    return sortConfig.direction === 'asc' ? <ArrowUp size={10} className="ml-1" /> : <ArrowDown size={10} className="ml-1" />;
  };

  const finalizeInward = () => {
    if (!mappingOrder) return;
    const newItems: InventoryItem[] = [];
    (Object.entries(mappingData) as [string, { received: number, serials: string }][]).forEach(([nlcId, data]) => {
        const serials = data.serials.split('\n').filter(s => s.trim() !== '');
        serials.forEach(sn => {
            newItems.push({
                id: `inv-new-${Math.random().toString(36).substr(2,9)}`,
                serialNumber: sn.trim(),
                nlcItemId: nlcId,
                status: 'IN_STOCK',
                dateReceived: new Date().toISOString(),
                retailerId: mappingOrder.retailerId,
                retailerPOId: mappingOrder.id,
                consolidatedPOId: mappingOrder.masterPOId,
                brandInvoiceId: invoiceRef
            });
        });
    });

    setOrders(prev => prev.map(o => o.id === mappingOrder.id ? { 
        ...o, status: 'RECEIVED', brandInvoiceNumber: invoiceRef
    } : o));
    setInventory(prev => [...prev, ...newItems]);
    setMappingOrder(null);
    setMappingData({});
    setInvoiceRef('');
  };

  const renderStockTab = () => {
    const effectiveRetailerFilter = userRole === 'RETAILER' ? activeRetailerId : retailerFilter;
    const filteredInventory = inventory.filter(item => {
        const nlc = nlcItems.find(n => n.id === item.nlcItemId);
        if (!nlc || item.status !== 'IN_STOCK') return false;
        const matchesSearch = nlc.model.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              nlc.manufacturer.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              item.serialNumber.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesRetailer = userRole === 'RETAILER' 
            ? (item.retailerId === activeRetailerId)
            : (effectiveRetailerFilter === 'ALL' || item.retailerId === effectiveRetailerFilter);
        return matchesSearch && matchesRetailer;
    });

    let totalInventoryValue = 0;
    const groupedInventory: Record<string, any> = {};
    filteredInventory.forEach(item => {
        const key = `${item.nlcItemId}_${item.retailerId}`;
        const nlc = nlcItems.find(n => n.id === item.nlcItemId);
        const itemValue = getFinalNLC(nlc);
        totalInventoryValue += itemValue;

        if (!groupedInventory[key]) {
            groupedInventory[key] = { 
                key, nlcItemId: item.nlcItemId, retailerId: item.retailerId, quantity: 0, 
                unitNLC: itemValue, 
                items: [], 
                model: nlc?.model || 'Unknown', brand: nlc?.manufacturer || 'Unknown'
            };
        }
        groupedInventory[key].quantity += 1;
        groupedInventory[key].items.push(item);
    });

    const sortedGroups = Object.values(groupedInventory).sort((a: any, b: any) => {
        const { key, direction } = sortConfig;
        const valA = a[key] || '';
        const valB = b[key] || '';
        if (typeof valA === 'string') return direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        return direction === 'asc' ? valA - valB : valB - valA;
    });

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-5">
                    <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl"><Box size={24}/></div>
                    <div>
                        <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Total Units</span>
                        <span className="text-xl font-black text-slate-900">{filteredInventory.length}</span>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-5">
                    <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl"><Layers size={24}/></div>
                    <div>
                        <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Active SKUs</span>
                        <span className="text-xl font-black text-slate-900">{Object.keys(groupedInventory).length}</span>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-5">
                    <div className="p-4 bg-green-50 text-green-600 rounded-2xl"><Wallet size={24}/></div>
                    <div>
                        <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Inventory Value (NLC)</span>
                        <span className="text-xl font-black text-slate-900">₹{totalInventoryValue.toLocaleString('en-IN')}</span>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-[11px] table-fixed border-collapse">
                    <thead className="bg-slate-900 text-white font-black uppercase tracking-widest border-b border-slate-800">
                        <tr className="divide-x divide-slate-800">
                            <th className="px-3 py-4 w-10 text-center"></th>
                            <th className="px-4 py-4 w-28 cursor-pointer hover:bg-slate-800 transition" onClick={() => handleSort('brand')}>Brand {renderSortIcon('brand')}</th>
                            <th className="px-4 py-4 w-auto cursor-pointer hover:bg-slate-800 transition" onClick={() => handleSort('model')}>Model {renderSortIcon('model')}</th>
                            <th className="px-4 py-4 w-40">Store Node</th>
                            <th className="px-4 py-4 text-center w-16 cursor-pointer hover:bg-slate-800 transition" onClick={() => handleSort('quantity')}>Qty {renderSortIcon('quantity')}</th>
                            <th className="px-4 py-4 text-center w-24 bg-slate-950">Status</th>
                            <th className="px-4 py-4 text-right w-28 cursor-pointer hover:bg-slate-800 transition" onClick={() => handleSort('unitNLC')}>Unit NLC {renderSortIcon('unitNLC')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-bold">
                        {sortedGroups.map((group: any) => {
                            const isExpanded = expandedGroupKey === group.key;
                            return (
                                <React.Fragment key={group.key}>
                                    <tr className="hover:bg-blue-50/30 cursor-pointer group transition-colors" onClick={() => setExpandedGroupKey(isExpanded ? null : group.key)}>
                                        <td className="px-3 py-4 text-center text-slate-300 group-hover:text-blue-500">{isExpanded ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}</td>
                                        <td className="px-4 py-4 font-black text-slate-700 uppercase tracking-tighter">{group.brand}</td>
                                        <td className="px-4 py-4 font-black text-blue-600 truncate">{group.model}</td>
                                        <td className="px-4 py-4 font-black text-slate-500 uppercase text-[9px]">{getLocationName(group.retailerId)}</td>
                                        <td className="px-4 py-4 text-center font-black text-slate-900">{group.quantity}</td>
                                        <td className="px-4 py-4 text-center">
                                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-green-50 text-green-600">IN STOCK</span>
                                        </td>
                                        <td className="px-4 py-4 text-right font-black text-slate-400">₹{group.unitNLC.toFixed(0)}</td>
                                    </tr>
                                    {isExpanded && (
                                        <tr className="bg-slate-50/50 shadow-inner animate-fade-in border-b border-slate-100">
                                            <td colSpan={7} className="px-10 py-6">
                                                <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
                                                    <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
                                                        <h5 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                                            <ExternalLink size={14} className="text-blue-400"/> Detailed Item Audit
                                                        </h5>
                                                    </div>
                                                    <table className="w-full text-[10px] border-collapse">
                                                        <thead className="bg-slate-50 text-slate-500 font-black uppercase border-b">
                                                            <tr>
                                                                <th className="px-6 py-3">Serial Identity</th>
                                                                <th className="px-6 py-3">Procurement PO</th>
                                                                <th className="px-6 py-3">Brand Invoice</th>
                                                                <th className="px-6 py-3 text-center">Inward Date</th>
                                                                <th className="px-6 py-3 text-right">Age (Days)</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100">
                                                            {group.items.map((it: InventoryItem) => {
                                                                const age = Math.floor((new Date().getTime() - new Date(it.dateReceived).getTime()) / (1000 * 60 * 60 * 24));
                                                                return (
                                                                    <tr key={it.id} className="hover:bg-slate-50 transition-colors">
                                                                        <td className="px-6 py-3 font-mono font-black text-blue-600">{it.serialNumber}</td>
                                                                        <td className="px-6 py-3 font-mono font-bold text-slate-500">{it.retailerPOId || '-'}</td>
                                                                        <td className="px-6 py-3 font-mono font-bold text-slate-500">{it.brandInvoiceId || '-'}</td>
                                                                        <td className="px-6 py-3 text-center font-bold text-slate-400">{new Date(it.dateReceived).toLocaleDateString()}</td>
                                                                        <td className="px-6 py-3 text-right">
                                                                            <span className={`font-black ${age > 45 ? 'text-orange-600' : 'text-slate-400'}`}>{age}d</span>
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
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
        </div>
    );
  };

  const renderInwardTab = () => {
    const pendingInward = orders.filter(o => {
        if (userRole === 'RETAILER') return o.retailerId === activeRetailerId;
        return retailerFilter === 'ALL' || o.retailerId === retailerFilter;
    }).filter(o => o.status === 'SHIPPED' || o.status === 'CONSOLIDATED' || o.status === 'MASTER_ORDERED');

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-fade-in">
            {pendingInward.map(order => (
                <div key={order.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 flex flex-col gap-4 group hover:border-blue-400 transition-all">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 group-hover:bg-blue-600 group-hover:text-white transition-colors"><Timer size={20}/></div>
                            <div>
                                <h4 className="font-black text-xs text-slate-800 uppercase tracking-widest">{order.manufacturer} Dispatch</h4>
                                <p className="text-[9px] font-mono font-black text-slate-400 uppercase tracking-tight">REQ: {order.id}</p>
                            </div>
                        </div>
                    </div>
                    <div className="py-2 border-y border-slate-50">
                        <span className="text-[8px] font-black text-slate-400 uppercase block mb-1">Destination</span>
                        <p className="text-[10px] font-bold text-slate-700 truncate flex items-center gap-1.5"><MapPin size={10} className="text-red-400"/> {getLocationName(order.retailerId)}</p>
                    </div>
                    <button onClick={() => setMappingOrder(order)} className="mt-2 bg-slate-900 text-white py-3 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all flex items-center justify-center gap-2">
                        <ClipboardList size={14}/> Execute Mapping Desk
                    </button>
                </div>
            ))}
            {pendingInward.length === 0 && (
                <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-300">
                    <Truck size={48} className="mb-4 opacity-20"/>
                    <p className="font-black uppercase tracking-[0.2em] text-xs">No Pending Inwards</p>
                </div>
            )}
        </div>
    );
  };

  const renderReconciliationLog = () => {
    const effectiveRetailerFilter = userRole === 'RETAILER' ? activeRetailerId : retailerFilter;
    
    const reconGroups: Record<string, {
        date: string,
        brand: string,
        masterPOId: string,
        retailerReqIds: Set<string>,
        brandInvoice: string,
        items: InventoryItem[],
        poValue: number, 
        invoiceValue: number, 
        mappingPercent: number
    }> = {};

    inventory.filter(i => {
        const matchesRetailer = userRole === 'RETAILER' ? i.retailerId === activeRetailerId : (effectiveRetailerFilter === 'ALL' || i.retailerId === effectiveRetailerFilter);
        return matchesRetailer;
    }).forEach(item => {
        const key = item.brandInvoiceId || item.retailerPOId || 'UNTAGGED';
        if (!reconGroups[key]) {
            const nlc = nlcItems.find(n => n.id === item.nlcItemId);
            reconGroups[key] = {
                date: item.dateReceived,
                brand: nlc?.manufacturer || 'Unknown',
                masterPOId: item.consolidatedPOId || '-',
                retailerReqIds: new Set(),
                brandInvoice: item.brandInvoiceId || '-',
                items: [],
                poValue: 0,
                invoiceValue: 0,
                mappingPercent: 0
            };
        }
        if (item.retailerPOId) reconGroups[key].retailerReqIds.add(item.retailerPOId);
        reconGroups[key].items.push(item);
    });

    Object.keys(reconGroups).forEach(key => {
        const group = reconGroups[key];
        const relatedOrders = orders.filter(o => 
            (group.masterPOId !== '-' && o.masterPOId === group.masterPOId) || 
            group.retailerReqIds.has(o.id)
        );

        let totalOrderedUnits = 0;
        let totalOrderedValue = 0;

        relatedOrders.forEach(o => {
            o.items.forEach(oi => {
                const nlc = nlcItems.find(n => n.id === oi.nlcItemId);
                totalOrderedUnits += oi.quantity;
                totalOrderedValue += (getFinalNLC(nlc) * oi.quantity);
            });
        });

        const receivedUnits = group.items.length;
        const actualInvoiceValue = group.items.reduce((sum, it) => {
            const nlc = nlcItems.find(n => n.id === it.nlcItemId);
            return sum + getFinalNLC(nlc);
        }, 0);

        group.poValue = totalOrderedValue;
        group.invoiceValue = actualInvoiceValue;
        group.mappingPercent = totalOrderedUnits > 0 ? (receivedUnits / totalOrderedUnits) * 100 : 0;
    });

    const sortedGroups = Object.values(reconGroups).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
        <div className="space-y-4 animate-fade-in">
            <div className="bg-slate-900 text-white p-7 rounded-[3rem] border-b-4 border-indigo-600 shadow-2xl flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative overflow-hidden">
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-600 opacity-10 blur-3xl"></div>
                <div>
                    <h3 className="text-xl font-black uppercase tracking-[0.2em] flex items-center gap-4">
                        <History size={28} className="text-indigo-400"/> Financial Reconciliation Ledger
                    </h3>
                    <p className="text-[11px] font-bold text-slate-400 uppercase mt-1.5 flex items-center gap-2">
                        <Info size={14} className="text-blue-400"/> Full-cycle traceability from Brand Procurement to Customer Exit Invoice.
                    </p>
                </div>
                <div className="flex gap-4 w-full lg:w-auto">
                    <div className="flex-1 lg:flex-none bg-slate-800/50 backdrop-blur px-6 py-4 rounded-3xl border border-white/5 text-center min-w-[140px]">
                        <span className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Audit Score</span>
                        <span className="text-xl font-black text-green-400">98.2%</span>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden">
                <table className="w-full text-left text-[11px] border-collapse table-fixed">
                    <thead className="bg-slate-100 text-slate-500 font-black uppercase tracking-[0.1em] border-b">
                        <tr className="divide-x divide-slate-200">
                            <th className="px-5 py-5 w-28">Inward Date</th>
                            <th className="px-5 py-5 w-24">Brand</th>
                            <th className="px-5 py-5 w-36">Master PO Ref</th>
                            <th className="px-5 py-5 w-32">Retailer Reqs</th>
                            <th className="px-5 py-5 w-32">Brand Invoice</th>
                            <th className="px-5 py-5 text-right w-32 bg-slate-50">PO Value (Est)</th>
                            <th className="px-5 py-5 text-right w-32 bg-indigo-50/30 text-indigo-900">Invoice Value</th>
                            <th className="px-5 py-5 text-center w-28">Mapping %</th>
                            <th className="px-5 py-5 text-center w-10"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-bold">
                        {sortedGroups.map((group, gIdx) => {
                            const isExpanded = expandedReconKey === group.brandInvoice;
                            return (
                                <React.Fragment key={gIdx}>
                                    <tr onClick={() => setExpandedReconKey(isExpanded ? null : group.brandInvoice)} className={`transition-all cursor-pointer group hover:bg-indigo-50/50 ${isExpanded ? 'bg-indigo-50/30' : ''}`}>
                                        <td className="px-5 py-4 font-bold text-slate-500">{new Date(group.date).toLocaleDateString()}</td>
                                        <td className="px-5 py-4 font-black text-slate-800 uppercase tracking-tighter">{group.brand}</td>
                                        <td className="px-5 py-4 font-mono font-black text-indigo-600 tracking-tighter">{group.masterPOId}</td>
                                        <td className="px-5 py-4">
                                            <div className="flex flex-wrap gap-1">
                                                {Array.from(group.retailerReqIds).map(id => (
                                                    <span key={id} className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[8px] font-black border border-blue-100 shadow-sm">{id}</span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 font-mono font-bold text-slate-600 truncate">{group.brandInvoice}</td>
                                        <td className="px-5 py-4 text-right font-black text-slate-400">₹{group.poValue.toFixed(0)}</td>
                                        <td className="px-5 py-4 text-right font-black text-indigo-900 bg-indigo-50/20">₹{group.invoiceValue.toFixed(0)}</td>
                                        <td className="px-5 py-4 text-center">
                                            <div className="flex flex-col items-center gap-1">
                                                <span className={`text-[10px] font-black ${group.mappingPercent >= 100 ? 'text-green-600' : 'text-orange-600'}`}>{group.mappingPercent.toFixed(1)}%</span>
                                                <div className="w-16 h-1 bg-slate-100 rounded-full overflow-hidden">
                                                    <div className={`h-full transition-all duration-700 ${group.mappingPercent >= 100 ? 'bg-green-500' : 'bg-orange-500'}`} style={{ width: `${Math.min(group.mappingPercent, 100)}%` }}></div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-slate-300 group-hover:text-blue-500 transition-transform">
                                            {isExpanded ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
                                        </td>
                                    </tr>
                                    {isExpanded && (
                                        <tr className="bg-slate-50/50">
                                            <td colSpan={10} className="px-10 py-8">
                                                <div className="bg-white rounded-[2rem] border border-slate-200 shadow-2xl overflow-hidden animate-slide-down">
                                                    <div className="p-5 bg-slate-900 text-white flex justify-between items-center">
                                                        <div className="flex items-center gap-4">
                                                            <div className="p-2 bg-indigo-600 rounded-lg shadow-lg"><Hash size={16}/></div>
                                                            <h4 className="text-xs font-black uppercase tracking-widest">Inward Traceability Ledger</h4>
                                                        </div>
                                                    </div>
                                                    <table className="w-full text-[10px] border-collapse">
                                                        <thead className="bg-slate-50 text-slate-500 font-black uppercase tracking-widest border-b">
                                                            <tr className="divide-x divide-slate-100">
                                                                <th className="px-6 py-4">Unique Serial ID</th>
                                                                <th className="px-6 py-4">Model Description</th>
                                                                <th className="px-6 py-4 text-center bg-indigo-50/50">NLC Rate</th>
                                                                <th className="px-6 py-4 text-center">NLC Date</th>
                                                                <th className="px-6 py-4 w-48">Request ID & Destination</th>
                                                                <th className="px-6 py-4 text-center">Sales Exit Status</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100">
                                                            {group.items.map(it => {
                                                                const nlc = nlcItems.find(n => n.id === it.nlcItemId);
                                                                return (
                                                                    <tr key={it.id} className="hover:bg-blue-50/40 transition-colors odd:bg-slate-50/30 divide-x divide-slate-100/50">
                                                                        <td className="px-6 py-4 font-mono font-black text-slate-800">
                                                                            <div className="flex items-center gap-2.5">
                                                                                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div> {it.serialNumber}
                                                                            </div>
                                                                        </td>
                                                                        <td className="px-6 py-4 font-bold text-slate-600 uppercase tracking-tighter truncate max-w-[140px]">{nlc?.model}</td>
                                                                        <td className="px-6 py-4 text-center font-black text-indigo-900 bg-indigo-50/20">₹{getFinalNLC(nlc).toFixed(0)}</td>
                                                                        <td className="px-6 py-4 text-center font-black text-slate-500">
                                                                            <div className="flex items-center justify-center gap-1.5">
                                                                                <CalendarDays size={12} className="text-indigo-400"/>
                                                                                {nlc ? new Date(nlc.batchDate).toLocaleString('default', { month: 'short', year: '2-digit' }) : '-'}
                                                                            </div>
                                                                        </td>
                                                                        <td className="px-6 py-4 space-y-1">
                                                                            <div className="flex items-center gap-2">
                                                                                <span className="px-2 py-0.5 bg-blue-600 text-white rounded-[4px] font-black text-[8px] uppercase tracking-tighter">{it.retailerPOId}</span>
                                                                            </div>
                                                                            <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400 leading-tight">
                                                                                <MapPin size={10} className="text-red-400 shrink-0"/>
                                                                                <span className="truncate">{getFullAddress(it.retailerId)}</span>
                                                                            </div>
                                                                        </td>
                                                                        <td className="px-6 py-4 text-center">
                                                                            {it.customerInvoiceNumber ? (
                                                                                <div className="flex items-center justify-center gap-2 text-green-600 font-black bg-green-50 px-3 py-1.5 rounded-xl border border-green-100">
                                                                                    <BadgeCheck size={14}/> {it.customerInvoiceNumber}
                                                                                </div>
                                                                            ) : (
                                                                                <span className="text-slate-400 font-bold uppercase tracking-widest text-[8px] opacity-40">Active Stock</span>
                                                                            )}
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
  };

  const handleAiMapping = async () => {
    if (!mappingOrder) return;
    setIsAiProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    const newData: Record<string, { received: number, serials: string }> = { ...mappingData };
    mappingOrder.items.forEach(item => {
        const prefix = nlcItems.find(n => n.id === item.nlcItemId)?.manufacturer.substring(0,2).toUpperCase() || 'SN';
        const serials = Array(item.quantity).fill(0).map(() => `${prefix}-${Math.floor(100000 + Math.random()*900000)}`).join('\n');
        newData[item.nlcItemId] = { received: item.quantity, serials };
    });
    setMappingData(newData);
    setIsAiProcessing(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight flex items-center">
                <Package className="mr-3 text-blue-600" /> Supply Control Tower
            </h2>
            <div className="mt-4 flex bg-slate-200 p-1 rounded-2xl w-fit border border-slate-300 shadow-inner">
                <button onClick={() => setActiveTab('STOCK')} className={`px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'STOCK' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>Current Assets</button>
                <button onClick={() => setActiveTab('INWARD')} className={`px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'INWARD' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>
                    Mapping Hub
                </button>
                <button onClick={() => setActiveTab('RECON_LOG')} className={`px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'RECON_LOG' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>
                    Reconciliation
                </button>
            </div>
        </div>
        <div className="flex flex-wrap bg-white p-2.5 rounded-[1.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 items-center gap-3">
            <div className="flex items-center gap-2 border-r border-slate-100 pr-3">
                <Search size={14} className="text-slate-400"/>
                <input type="text" placeholder="Global Ledger Search..." className="text-xs font-black uppercase outline-none bg-transparent w-44 text-slate-800 placeholder-slate-300" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
            {userRole === 'ADMIN' && (
              <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Context Node:</span>
                  <select className="text-[10px] font-black uppercase outline-none bg-slate-900 text-white rounded-lg px-3 py-2 shadow-lg shadow-blue-900/10" value={retailerFilter} onChange={e => setRetailerFilter(e.target.value)}>
                    <option value="ALL">All Regions</option>
                    {retailers.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
              </div>
            )}
        </div>
      </div>
      
      {activeTab === 'STOCK' ? renderStockTab() : activeTab === 'INWARD' ? renderInwardTab() : renderReconciliationLog()}

      {mappingOrder && (
          <div className="fixed inset-0 bg-slate-950/90 z-[100] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in overflow-hidden">
              <div className="bg-white w-full max-w-5xl h-auto max-h-[85vh] rounded-[3rem] shadow-2xl flex flex-col border border-white/20 animate-scale-up overflow-hidden">
                  <div className="p-6 border-b bg-slate-900 text-white flex justify-between items-center shrink-0">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/20"><Truck size={24} /></div>
                        <div><h3 className="text-lg font-black uppercase tracking-widest leading-none">Inward Fulfillment Desk</h3></div>
                      </div>
                      <button onClick={() => setMappingOrder(null)} className="bg-slate-800 p-2 rounded-xl text-slate-400 hover:text-white transition-all"><X size={20}/></button>
                  </div>
                  <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-3">
                      <div className="lg:col-span-2 border-r border-slate-100 flex flex-col overflow-hidden">
                          <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
                              <h4 className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em]">Verification Queue</h4>
                              <button onClick={handleAiMapping} disabled={isAiProcessing} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-700 shadow-sm disabled:opacity-50">
                                  {isAiProcessing ? <Loader2 className="animate-spin" size={12}/> : <Bot size={12} className="inline mr-2"/>}
                                  AI Map Serials
                              </button>
                          </div>
                          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30 scrollbar-hide">
                              {mappingOrder.items.map(item => {
                                  const nlc = nlcItems.find(n => n.id === item.nlcItemId);
                                  const data = mappingData[item.nlcItemId] || { received: 0, serials: '' };
                                  return (
                                      <div key={item.nlcItemId} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                                          <div className="flex justify-between items-start gap-6">
                                              <div className="flex-1">
                                                  <div className="flex items-center gap-2 mb-2">
                                                      <span className="px-2 py-0.5 bg-slate-100 rounded text-[8px] font-black uppercase text-slate-500">{nlc?.manufacturer}</span>
                                                      <h5 className="font-black text-xs text-slate-800">{nlc?.model}</h5>
                                                  </div>
                                                  <div className="flex gap-3">
                                                      <div className="px-2.5 py-1.5 bg-slate-100 rounded-lg border border-slate-200"><span className="text-[8px] font-black uppercase text-slate-400 block mb-0.5 tracking-tighter">Required</span><span className="text-xs font-black text-slate-700">{item.quantity} U</span></div>
                                                      <div className="px-2.5 py-1.5 bg-green-50 rounded-lg border border-green-200"><span className="text-[8px] font-black uppercase text-green-400 block mb-0.5 tracking-tighter">Captured</span><span className="text-xs font-black text-green-700">{data.received} U</span></div>
                                                  </div>
                                              </div>
                                              <div className="w-48">
                                                  <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Serial Data Feed</label>
                                                  <textarea className="w-full h-24 p-2 border border-slate-200 rounded-xl text-[10px] font-mono bg-slate-50 focus:bg-white outline-none resize-none shadow-inner" placeholder="Paste serials here..." value={data.serials} onChange={e => {
                                                      const lines = e.target.value.split('\n').filter(l => l.trim() !== '').length;
                                                      setMappingData({...mappingData, [item.nlcItemId]: { received: lines, serials: e.target.value }});
                                                  }} />
                                              </div>
                                          </div>
                                      </div>
                                  )
                              })}
                          </div>
                      </div>
                      <div className="bg-slate-100/40 p-8 flex flex-col gap-6 overflow-y-auto">
                          <div className="space-y-4">
                              <h4 className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em]">Compliance Check</h4>
                              <div className="space-y-2">
                                  <label className="text-[8px] font-black text-slate-500 uppercase block ml-1">Brand Invoice #</label>
                                  <input className="w-full p-4 border border-slate-200 rounded-2xl text-xs font-black shadow-sm outline-none focus:border-indigo-500 bg-white" placeholder="INV-B-XXXXX" value={invoiceRef} onChange={e => setInvoiceRef(e.target.value)} />
                              </div>
                              <div className="p-6 bg-white rounded-3xl border border-slate-200 space-y-3 shadow-sm">
                                  <div className="flex items-center gap-3 text-indigo-600">
                                      <FileCheck size={16}/>
                                      <span className="text-[9px] font-black uppercase tracking-widest">Node Inward Sync</span>
                                  </div>
                                  <p className="text-[10px] text-slate-400 leading-relaxed font-bold italic">By finalizing, you verify dispatch accuracy and authorize live inventory entry for this node.</p>
                              </div>
                          </div>
                          <button onClick={finalizeInward} disabled={!invoiceRef} className="w-full mt-auto py-5 bg-blue-600 text-white rounded-[2rem] font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 shadow-2xl shadow-blue-600/30 disabled:opacity-50 transition-all active:scale-95">Commit Stock Entry</button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default InventoryManager;
