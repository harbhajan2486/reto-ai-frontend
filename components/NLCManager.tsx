
import React, { useState, useRef } from 'react';
import { NLCItem, UserRole } from '../types';
import { parseNLCData } from '../services/geminiService';
import { Upload, Loader2, FileSpreadsheet, Search, Filter, Download, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

interface NLCManagerProps {
  nlcItems: NLCItem[];
  setNlcItems: React.Dispatch<React.SetStateAction<NLCItem[]>>;
  userRole: UserRole;
}

const NLCManager: React.FC<NLCManagerProps> = ({ nlcItems, setNlcItems, userRole }) => {
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'list'>('list');
  const [brandFilter, setBrandFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'batchDate', direction: 'desc' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const renderSortIcon = (key: string) => {
    if (sortConfig.key !== key) return <ArrowUpDown size={10} className="ml-1 opacity-20 text-white" />;
    return sortConfig.direction === 'asc' ? <ArrowUp size={10} className="ml-1 text-white" /> : <ArrowDown size={10} className="ml-1 text-white" />;
  };

  const processText = async (text: string) => {
      setIsProcessing(true);
      try {
        const extractedData = await parseNLCData(text);
        const newItems: NLCItem[] = extractedData.map((item) => ({
          id: Math.random().toString(36).substr(2, 9),
          manufacturer: item.manufacturer || 'Unknown',
          model: item.model || 'Unknown',
          category: item.category || 'General',
          mrp: item.mrp || 0,
          basicPrice: item.basicPrice || 0,
          gstRate: item.gstRate || 18,
          discountSchemes: item.discountSchemes || [],
          netLandingCost: item.netLandingCost || 0,
          effectiveCost: item.effectiveCost || 0,
          minGrossMarginPercent: item.minGrossMarginPercent || 10,
          msp: item.msp || 0, 
          batchDate: new Date().toISOString(),
        }));
        setNlcItems(prev => [...prev, ...newItems]);
        setInputText('');
        setActiveTab('list');
      } catch (e) {
        alert("Failed to process data.");
      } finally {
        setIsProcessing(false);
      }
  };

  const handleMarginChange = (id: string, newMargin: number) => {
      setNlcItems(prev => prev.map(item => {
          if (item.id !== id) return item;
          return { ...item, minGrossMarginPercent: newMargin };
      }));
  };

  const filteredItems = nlcItems.filter(item => {
      const matchesBrand = brandFilter === 'ALL' || item.manufacturer === brandFilter;
      const q = searchQuery.toLowerCase();
      return matchesBrand && (item.model.toLowerCase().includes(q) || item.manufacturer.toLowerCase().includes(q));
  });

  const sortedItems = [...filteredItems].sort((a, b) => {
      const { key, direction } = sortConfig;
      let valA = a[key as keyof NLCItem];
      let valB = b[key as keyof NLCItem];
      if (typeof valA === 'string') return direction === 'asc' ? (valA as string).localeCompare(valB as string) : (valB as string).localeCompare(valA as string);
      if (typeof valA === 'number') return direction === 'asc' ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
      return 0;
  });

  const brands = ['ALL', ...Array.from(new Set(nlcItems.map(i => i.manufacturer)))];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Supply Chain NLC Repository</h2>
        {userRole === 'ADMIN' && (
            <div className="flex bg-slate-200 p-1 rounded-xl border border-slate-300">
                <button onClick={() => setActiveTab('list')} className={`px-4 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === 'list' ? 'bg-white text-blue-600 shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}>Price Deck</button>
                <button onClick={() => setActiveTab('upload')} className={`px-4 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === 'upload' ? 'bg-white text-blue-600 shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}>Add NLC Data</button>
            </div>
        )}
      </div>

      {activeTab === 'upload' && userRole === 'ADMIN' ? (
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 animate-fade-in">
           <div className="flex flex-col md:flex-row items-center space-y-6 md:space-y-0 md:space-x-6 mb-8">
             <div className="w-full md:flex-1 border-4 border-dashed border-slate-100 rounded-3xl p-10 text-center hover:border-blue-200 hover:bg-blue-50/50 transition-all cursor-pointer group" onClick={() => fileInputRef.current?.click()}>
                 <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center text-green-600 mx-auto mb-4 group-hover:scale-110 transition-transform"><FileSpreadsheet size={32} /></div>
                 <p className="font-black text-slate-800 uppercase tracking-widest text-sm">Scan NLC CSV</p>
                 <input type="file" ref={fileInputRef} className="hidden" accept=".csv,.txt" onChange={(e) => {
                     const file = e.target.files?.[0];
                     if (file) {
                         const reader = new FileReader();
                         reader.onload = (ev) => processText(ev.target?.result as string);
                         reader.readAsText(file);
                     }
                 }}/>
             </div>
             <div className="text-slate-300 font-black italic">OR</div>
             <div className="w-full md:flex-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Manual Data Extract</p>
                <textarea className="w-full h-40 p-4 border-2 border-slate-100 rounded-2xl font-mono text-xs focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50/50 text-slate-800 placeholder-slate-300 resize-none" placeholder="E.g. Sony Bravia - MRP 105000, Basic 85000, GST 18%, Trade Disc 2000..." value={inputText} onChange={(e) => setInputText(e.target.value)}/>
             </div>
          </div>
          <div className="flex justify-end">
            <button onClick={() => processText(inputText)} disabled={isProcessing || !inputText} className="flex items-center px-10 py-4 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 disabled:opacity-50 transition-all font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-blue-500/20 active:scale-95">
              {isProcessing ? <Loader2 className="animate-spin mr-3" size={18} /> : <Upload className="mr-3" size={18} />}
              {isProcessing ? 'Intelligent Mapping...' : 'Finalize NLC Upload'}
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 flex flex-col h-[calc(100vh-180px)] overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-4 items-center bg-slate-50/50">
             <div className="flex items-center bg-white border border-slate-200 rounded-xl px-4 py-2.5 w-full md:w-80 shadow-sm">
                <Search size={16} className="text-slate-400 mr-2"/>
                <input type="text" placeholder="Search Models..." className="w-full text-xs font-bold outline-none text-slate-800 placeholder-slate-400 bg-transparent" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}/>
             </div>
             <div className="flex items-center space-x-3 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
                <Filter size={14} className="text-slate-400"/>
                <select className="text-xs font-black text-slate-800 outline-none min-w-[100px] bg-transparent" value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)}>{brands.map(b => <option key={b} value={b}>{b}</option>)}</select>
             </div>
             <div className="flex-1"></div>
             <button className="flex items-center px-6 py-2.5 text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 rounded-xl border border-slate-200 bg-white transition-all shadow-sm"><Download size={16} className="mr-2"/> Bulk Export</button>
          </div>
          <div className="flex-1 overflow-auto scrollbar-hide">
            <table className="w-full text-left text-[9px] whitespace-nowrap table-fixed border-collapse">
                <thead className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-20 font-black uppercase tracking-widest">
                <tr className="divide-x divide-slate-800">
                    <th className="px-3 py-4 w-24 cursor-pointer hover:bg-slate-800 transition" onClick={() => handleSort('batchDate')}>DATE {renderSortIcon('batchDate')}</th>
                    <th className="px-3 py-4 w-24 cursor-pointer hover:bg-slate-800 transition" onClick={() => handleSort('manufacturer')}>BRAND {renderSortIcon('manufacturer')}</th>
                    <th className="px-3 py-4 w-24">SEGMENT</th>
                    <th className="px-3 py-4 w-40 cursor-pointer hover:bg-slate-800 transition" onClick={() => handleSort('model')}>MODEL {renderSortIcon('model')}</th>
                    <th className="px-3 py-4 w-24 text-right bg-slate-800">MRP</th>
                    <th className="px-3 py-4 w-24 text-right bg-blue-900">DP (Basic)</th>
                    <th className="px-2 py-4 w-20 text-right bg-slate-800">DISC 1</th>
                    <th className="px-2 py-4 w-20 text-right bg-slate-800">DISC 2</th>
                    <th className="px-2 py-4 w-20 text-right bg-slate-800">DISC 3</th>
                    <th className="px-2 py-4 w-20 text-right bg-slate-800">DISC 4</th>
                    <th className="px-3 py-4 w-24 text-right font-black bg-blue-950">Net Basic</th>
                    <th className="px-2 py-4 w-16 text-center">GST %</th>
                    <th className="px-3 py-4 w-32 text-right font-black bg-indigo-900">Invoice Amt (Incl GST)</th>
                    <th className="px-2 py-4 w-20 text-right bg-slate-800">BE DISC 1</th>
                    <th className="px-2 py-4 w-20 text-right bg-slate-800">BE DISC 2</th>
                    <th className="px-2 py-4 w-20 text-right bg-slate-800">BE DISC 3</th>
                    <th className="px-2 py-4 w-20 text-right bg-slate-800">BE DISC 4</th>
                    <th className="px-3 py-4 w-32 text-right font-black bg-green-600">Final NLC (Incl GST)</th>
                    <th className="px-2 py-4 w-16 text-center bg-orange-950">MIN GM %</th>
                    <th className="px-3 py-4 w-32 text-right font-black bg-orange-600 text-white sticky right-0 z-10">MANDATORY MSP</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-bold">
                {sortedItems.map((item) => {
                    const upfrontDiscs = item.discountSchemes.filter(d => !d.isBackend);
                    const backendDiscs = item.discountSchemes.filter(d => d.isBackend);
                    
                    const upfrontTotal = upfrontDiscs.reduce((s, d) => s + d.amount, 0);
                    const netBasic = item.basicPrice - upfrontTotal;
                    const invoiceAmt = netBasic * (1 + (item.gstRate / 100));
                    const backendTotal = backendDiscs.reduce((s, d) => s + d.amount, 0);
                    const finalNlc = invoiceAmt - backendTotal;
                    const margin = item.minGrossMarginPercent || 10;
                    const msp = finalNlc / (1 - (margin / 100));

                    return (
                        <tr key={item.id} className="hover:bg-slate-50 transition-colors border-b">
                            <td className="px-3 py-3 text-slate-400">{new Date(item.batchDate).toLocaleDateString()}</td>
                            <td className="px-3 py-3 text-slate-800 uppercase">{item.manufacturer}</td>
                            <td className="px-3 py-3 text-slate-500 uppercase">{item.category}</td>
                            <td className="px-3 py-3 text-blue-600 truncate">{item.model}</td>
                            <td className="px-3 py-3 text-right bg-slate-50 text-slate-400">₹{item.mrp.toFixed(0)}</td>
                            <td className="px-3 py-3 text-right bg-blue-50/30 text-blue-700">₹{item.basicPrice.toFixed(0)}</td>
                            <td className="px-2 py-3 text-right text-red-400">₹{upfrontDiscs[0]?.amount || 0}</td>
                            <td className="px-2 py-3 text-right text-red-400">₹{upfrontDiscs[1]?.amount || 0}</td>
                            <td className="px-2 py-3 text-right text-red-400">₹{upfrontDiscs[2]?.amount || 0}</td>
                            <td className="px-2 py-3 text-right text-red-400">₹{upfrontDiscs[3]?.amount || 0}</td>
                            <td className="px-3 py-3 text-right font-black bg-blue-50/50">₹{netBasic.toFixed(0)}</td>
                            <td className="px-2 py-3 text-center">{item.gstRate}%</td>
                            <td className="px-3 py-3 text-right font-black bg-indigo-50 text-indigo-700">₹{invoiceAmt.toFixed(0)}</td>
                            <td className="px-2 py-3 text-right text-green-400">₹{backendDiscs[0]?.amount || 0}</td>
                            <td className="px-2 py-3 text-right text-green-400">₹{backendDiscs[1]?.amount || 0}</td>
                            <td className="px-2 py-3 text-right text-green-400">₹{backendDiscs[2]?.amount || 0}</td>
                            <td className="px-2 py-3 text-right text-green-400">₹{backendDiscs[3]?.amount || 0}</td>
                            <td className="px-3 py-3 text-right font-black text-white bg-green-600">₹{finalNlc.toFixed(0)}</td>
                            <td className="px-2 py-3 text-center bg-orange-50/30 font-black">
                                {userRole === 'ADMIN' ? (
                                    <input type="number" value={item.minGrossMarginPercent} onChange={(e) => handleMarginChange(item.id, parseFloat(e.target.value))} className="w-12 p-1 text-center border rounded bg-white text-[9px] outline-none"/>
                                ) : (
                                    <span>{margin}%</span>
                                )}
                            </td>
                            <td className="px-3 py-3 text-right font-black bg-orange-100 text-orange-900 sticky right-0 z-10 border-l border-orange-200">₹{msp.toFixed(0)}</td>
                        </tr>
                    );
                })}
                </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default NLCManager;
