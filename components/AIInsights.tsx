
import React, { useState, useEffect } from 'react';
import { InventoryItem, NLCItem, Sale, UserRole, RetailerProfile } from '../types';
import { generateBusinessInsights } from '../services/geminiService';
import { Bot, Sparkles, AlertCircle, TrendingUp, AlertTriangle, PackageSearch, CreditCard, Calendar, CheckCircle, XCircle, History, ChevronRight, FileText, Layout, Info, Lightbulb, Search, Shield, ArrowUpRight } from 'lucide-react';

interface AIReportHistory {
    id: string;
    timestamp: string;
    content: string;
    meta: {
        stockCount: number;
        revenue: number;
    }
}

interface AIInsightsProps {
  nlcItems: NLCItem[];
  inventory: InventoryItem[];
  sales: Sale[];
  userRole: UserRole;
  retailerProfile?: RetailerProfile;
}

const AIInsights: React.FC<AIInsightsProps> = ({ nlcItems, inventory, sales, userRole, retailerProfile }) => {
  const [reportHistory, setReportHistory] = useState<AIReportHistory[]>([]);
  const [activeReportId, setActiveReportId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('reto_ai_history_v3');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            setReportHistory(parsed);
            if (parsed.length > 0) setActiveReportId(parsed[0].id);
        } catch(e) { console.error("History parse failed", e); }
    }
  }, []);

  const handleGenerate = async () => {
    setLoading(true);
    const result = await generateBusinessInsights(nlcItems, sales, inventory, retailerProfile);
    
    if (!result.startsWith('Error')) {
        const newReport: AIReportHistory = {
            id: `REP-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
            timestamp: new Date().toISOString(),
            content: result,
            meta: {
                stockCount: inventory.length,
                revenue: sales.reduce((s, x) => s + x.totalAmount, 0)
            }
        };
        const updatedHistory = [newReport, ...reportHistory].slice(0, 15);
        setReportHistory(updatedHistory);
        setActiveReportId(newReport.id);
        localStorage.setItem('reto_ai_history_v3', JSON.stringify(updatedHistory));
    } else {
        alert(result);
    }
    setLoading(false);
  };

  const activeReport = reportHistory.find(r => r.id === activeReportId);
  
  const renderReportContent = (text: string) => {
      const lines = text.split('\n');
      return lines.map((line, i) => {
          const trimmed = line.trim();
          if (!trimmed) return <div key={i} className="h-4" />;

          // Heading
          if (trimmed.startsWith('###')) {
              return (
                  <div key={i} className="flex items-center gap-4 mt-10 mb-6 border-b border-slate-100 pb-4 first:mt-0">
                      <div className="w-1.5 h-6 bg-blue-600 rounded-full"></div>
                      <h3 className="text-sm font-black text-slate-800 uppercase tracking-[0.2em]">{trimmed.replace(/###/g, '').trim()}</h3>
                  </div>
              );
          }

          // Lists & Decision Cards
          if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
              const content = trimmed.substring(1).trim();
              const isPositive = content.toUpperCase().includes('BUY') && !content.toUpperCase().includes("DON'T");
              const isNegative = content.toUpperCase().includes("DON'T BUY") || content.toLowerCase().includes('risk');
              
              return (
                  <div key={i} className={`flex items-start gap-4 p-5 rounded-2xl border bg-white mb-4 shadow-sm hover:shadow-md transition-shadow ${isPositive ? 'border-green-100' : isNegative ? 'border-red-100' : 'border-slate-100'}`}>
                      <div className={`p-2.5 rounded-xl shrink-0 ${isPositive ? 'bg-green-50 text-green-600' : isNegative ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                          {isPositive ? <CheckCircle size={18}/> : isNegative ? <XCircle size={18}/> : <ArrowUpRight size={18}/>}
                      </div>
                      <div className="flex flex-col gap-1 overflow-hidden">
                          <p className="font-black text-slate-800 text-sm tracking-tight leading-snug break-words">{content}</p>
                      </div>
                  </div>
              );
          }

          // Reasoning Lines (Special Styling) - STAND OUT MORE
          if (trimmed.toLowerCase().startsWith('reasoning:')) {
              return (
                  <div key={i} className="mb-8 px-6 py-5 bg-indigo-50 border-l-4 border-indigo-600 rounded-r-3xl -mt-2 shadow-sm">
                      <div className="flex items-center gap-2 mb-2">
                          <Lightbulb size={14} className="text-indigo-600"/>
                          <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em]">Neural Rationale</span>
                      </div>
                      <p className="text-xs font-black text-slate-700 leading-relaxed break-words">
                          {trimmed.replace(/reasoning:/i, '').trim()}
                      </p>
                  </div>
              );
          }

          // Tables (with overflow fix)
          if (trimmed.includes('|')) {
              const cells = trimmed.split('|').filter(c => c.trim().length > 0);
              if (trimmed.includes('---')) return null;
              
              const isHeader = i < 50 && (cells.some(c => c.toLowerCase().includes('sku') || c.toLowerCase().includes('age') || c.toLowerCase().includes('nlc')));
              
              return (
                  <div key={i} className="overflow-x-auto border border-slate-100 rounded-2xl mb-6 shadow-sm">
                      <div className={`flex min-w-[900px] divide-x divide-slate-100 ${isHeader ? 'bg-slate-900 text-white font-black uppercase tracking-widest text-[9px]' : 'bg-white text-[11px] font-bold text-slate-600'}`}>
                          {cells.map((cell, idx) => (
                              <div key={idx} className="flex-1 p-3.5 truncate">
                                  {cell.trim()}
                              </div>
                          ))}
                      </div>
                  </div>
              );
          }

          // Normal Paragraphs
          return (
              <p key={i} className="mb-5 text-slate-500 font-bold text-sm leading-relaxed px-2 break-words">
                  {trimmed}
              </p>
          );
      });
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 max-w-[1700px] mx-auto min-h-[calc(100vh-140px)] animate-fade-in">
      
      {/* Sidebar: History */}
      <div className="lg:w-80 flex flex-col gap-6">
        <div className="bg-slate-950 p-7 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden border border-white/5">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600 opacity-20 blur-3xl"></div>
            <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 bg-blue-600 rounded-xl"><Sparkles size={20}/></div>
                    <h2 className="font-black uppercase tracking-widest text-sm">RETO Brain</h2>
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase leading-relaxed mb-6">
                    Real-time market context & supply chain reasoning.
                </p>
                <button 
                    onClick={handleGenerate} 
                    disabled={loading} 
                    className="w-full bg-white text-slate-950 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:scale-[1.02] transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {loading ? <Bot className="animate-bounce" size={16}/> : <Sparkles size={16}/>}
                    {loading ? 'Thinking...' : 'Run New Strategy'}
                </button>
            </div>
        </div>

        <div className="bg-white rounded-[2.5rem] border border-slate-200 p-6 flex-1 flex flex-col shadow-sm overflow-hidden">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2 text-slate-400">
                    <History size={16}/>
                    <h3 className="text-[10px] font-black uppercase tracking-widest">Saved Logs</h3>
                </div>
                <span className="text-[9px] font-black text-slate-300 uppercase">{reportHistory.length} Saved</span>
            </div>
            <div className="overflow-y-auto pr-1 space-y-3 scrollbar-hide flex-1">
                {reportHistory.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300 italic text-[11px] text-center gap-4 py-12">
                        <Search size={24} className="opacity-10"/>
                        <p>No historical<br/>analysis found.</p>
                    </div>
                ) : reportHistory.map(report => (
                    <button 
                        key={report.id}
                        onClick={() => setActiveReportId(report.id)}
                        className={`w-full text-left p-4 rounded-2xl border transition-all flex flex-col gap-1.5 ${activeReportId === report.id ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-100 hover:border-slate-300'}`}
                    >
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black text-slate-800">{report.id}</span>
                            <ChevronRight size={14} className={activeReportId === report.id ? 'text-blue-600' : 'text-slate-300'}/>
                        </div>
                        <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400">
                             <Calendar size={10}/>
                             <span>{new Date(report.timestamp).toLocaleDateString()} &bull; {new Date(report.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                    </button>
                ))}
            </div>
        </div>
      </div>

      {/* Main Report Viewer */}
      <div className="flex-1 bg-white rounded-[3rem] border border-slate-200 shadow-2xl shadow-slate-200/40 overflow-hidden flex flex-col">
          {!activeReport ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-20 opacity-50">
                  <div className="w-24 h-24 bg-blue-50 rounded-[2.5rem] flex items-center justify-center mb-6">
                      <Layout size={48} className="text-blue-200"/>
                  </div>
                  <h3 className="text-xl font-black text-slate-800 uppercase tracking-widest">Select Strategy</h3>
                  <p className="text-slate-400 text-sm mt-3 max-w-xs font-medium">Trigger the AI or pick a historical log to view procurement reasoning.</p>
              </div>
          ) : (
              <div className="flex flex-col h-full">
                  <div className="bg-slate-50/80 p-8 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                      <div className="flex items-center gap-5">
                          <div className="p-4 bg-white rounded-2xl shadow-sm border border-slate-100 text-blue-600">
                              <FileText size={28}/>
                          </div>
                          <div>
                              <div className="flex items-center gap-3">
                                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Strategy Log</h2>
                                <span className="text-[10px] font-black bg-blue-600 text-white px-2.5 py-0.5 rounded-full">{activeReport.id}</span>
                              </div>
                              <p className="text-xs font-bold text-slate-400 flex items-center gap-2 mt-1">
                                  <Calendar size={12}/> Window: {new Date(activeReport.timestamp).toLocaleString()}
                              </p>
                          </div>
                      </div>
                      <div className="flex gap-3">
                          <div className="px-5 py-2.5 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
                              <span className="text-[8px] font-black text-slate-400 uppercase block mb-0.5 tracking-widest">Audited Nodes</span>
                              <span className="text-xs font-black text-slate-800">{activeReport.meta.stockCount} SKUs</span>
                          </div>
                      </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-10 bg-white scrollbar-hide">
                      <div className="max-w-4xl mx-auto">
                          {renderReportContent(activeReport.content)}
                      </div>
                      
                      <div className="mt-20 pt-10 border-t border-slate-100 text-center max-w-xl mx-auto opacity-40">
                          <div className="inline-flex items-center gap-2 bg-slate-50 px-4 py-1.5 rounded-full mb-4 border">
                              <Shield size={12} className="text-slate-400"/>
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Reto Certified Analysis</p>
                          </div>
                          <p className="text-[10px] font-bold text-slate-300 leading-relaxed uppercase">
                              This report uses probabilistic models for electronics lifecycle management. Decisions must be cross-verified with physical audit logs.
                          </p>
                      </div>
                  </div>
              </div>
          )}
      </div>
    </div>
  );
};

export default AIInsights;
