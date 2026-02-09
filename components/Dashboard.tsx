
import React, { useState, useEffect } from 'react';
import { NLCItem, Sale, InventoryItem, UserRole, RetailerProfile } from '../types';
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, BarChart } from 'recharts';
import { IndianRupee, Package, TrendingUp, AlertCircle, Users, Building, Calendar } from 'lucide-react';

interface DashboardProps {
  nlcItems: NLCItem[];
  inventory: InventoryItem[];
  sales: Sale[];
  userRole: UserRole;
  retailers: RetailerProfile[];
  allInventory: InventoryItem[]; // For admin aggregation
  allSales: Sale[]; // For admin aggregation
}

// Helper to reconstruct Final NLC locally to ensure accuracy in tables
const getFinalNLC = (nlcItem: NLCItem | undefined) => {
    if (!nlcItem) return 0;
    const upfront = nlcItem.discountSchemes.filter(d => !d.isBackend).reduce((sum, d) => sum + d.amount, 0);
    const backend = nlcItem.discountSchemes.filter(d => d.isBackend).reduce((sum, d) => sum + d.amount, 0);
    const netBasic = nlcItem.basicPrice - upfront;
    const gst = netBasic * (nlcItem.gstRate / 100);
    const invoiceAmt = netBasic + gst;
    return invoiceAmt - backend;
};

const Dashboard: React.FC<DashboardProps> = ({ 
  nlcItems, inventory, sales, userRole, retailers, allInventory, allSales 
}) => {
  // --- Filter States ---
  const [dateFilter, setDateFilter] = useState<'DAY' | 'WEEK' | 'MONTH' | 'CUSTOM'>('MONTH');
  const [customRange, setCustomRange] = useState({ start: '', end: '' });
  const [cityFilter, setCityFilter] = useState('ALL');
  const [areaFilter, setAreaFilter] = useState('ALL');



  
  // Recent Sales Table Filters
  const [salesFilters, setSalesFilters] = useState({
      date: '',
      retailer: '',
      model: '',
      minGM: '',
  });

useEffect(() => {
  const apiBase =
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.NEXT_PUBLIC_API_BASE_URL ||
    "";

  if (!apiBase) {
    console.error("❌ API base URL not defined");
    return;
  }

  console.log("API BASE URL:", apiBase);

  fetch(apiBase + "/")
    .then(res => res.text())
    .then(data => {
      console.log("✅ Backend response:", data);
    })
    .catch(err => {
      console.error("❌ Backend error:", err);
    });
}, []);


  // --- Filtering Logic for Sales ---
  const filterSalesByDate = (saleList: Sale[]) => {
      const now = new Date();
      return saleList.filter(s => {
          const sDate = new Date(s.date);
          if (dateFilter === 'DAY') {
              return sDate.toDateString() === now.toDateString();
          } else if (dateFilter === 'WEEK') {
              const weekAgo = new Date(now);
              weekAgo.setDate(now.getDate() - 7);
              weekAgo.setHours(0,0,0,0);
              return sDate >= weekAgo;
          } else if (dateFilter === 'MONTH') {
              return sDate.getMonth() === now.getMonth() && sDate.getFullYear() === now.getFullYear();
          } else if (dateFilter === 'CUSTOM' && customRange.start && customRange.end) {
              const start = new Date(customRange.start);
              start.setHours(0,0,0,0);
              const end = new Date(customRange.end);
              end.setHours(23,59,59,999);
              return sDate.getTime() >= start.getTime() && sDate.getTime() <= end.getTime();
          }
          return true;
      });
  };

  const filteredSales = filterSalesByDate(sales); // Current view sales
  const filteredAllSales = filterSalesByDate(allSales); // Admin all sales

  // Apply column filters for Recent Sales Table
  const filteredRecentSales = filteredSales.filter(sale => {
      const saleItem = sale.items[0];
      const inv = (userRole === 'ADMIN' ? allInventory : inventory).find(i => i.id === saleItem.inventoryId);
      const nlc = nlcItems.find(n => n.id === inv?.nlcItemId);
      const retailerName = retailers.find(r => r.id === sale.retailerId)?.name || 'Unknown';
      const saleDate = new Date(sale.date).toLocaleDateString();

      const matchesDate = saleDate.includes(salesFilters.date);
      const matchesRetailer = retailerName.toLowerCase().includes(salesFilters.retailer.toLowerCase());
      const matchesModel = (nlc?.model || '').toLowerCase().includes(salesFilters.model.toLowerCase());
      
      return matchesDate && matchesRetailer && matchesModel;
  });

  // --- KPI Metrics ---
  const calculateMetrics = (saleList: Sale[], invList: InventoryItem[]) => {
    let revenue = 0;
    let cost = 0;

    saleList.forEach(sale => {
      revenue += sale.totalAmount;
      sale.items.forEach(saleItem => {
        const invItem = invList.find(i => i.id === saleItem.inventoryId);
        if (invItem) {
          const nlc = nlcItems.find(n => n.id === invItem.nlcItemId);
          cost += getFinalNLC(nlc);
        }
      });
    });

    const grossMargin = revenue - cost;
    const marginPercent = revenue > 0 ? (grossMargin / revenue) * 100 : 0;
    
    return { revenue, cost, grossMargin, marginPercent };
  };

  const { revenue: totalRevenue, grossMargin: totalGrossProfit, marginPercent: globalMarginPercent } = calculateMetrics(filteredSales, inventory);
  const totalStockCount = inventory.filter(i => i.status === 'IN_STOCK').length;
  const stockValue = inventory
    .filter(i => i.status === 'IN_STOCK')
    .reduce((acc, item) => {
      const nlc = nlcItems.find(n => n.id === item.nlcItemId);
      return acc + getFinalNLC(nlc);
    }, 0);

  // --- Sales Analytics Data Prep ---
  const processAnalyticsData = () => {
    const dateMap: Record<string, { date: string, revenue: number, gm: number }> = {};
    const relevantSales = userRole === 'ADMIN' ? filteredAllSales : filteredSales;

    relevantSales.forEach(sale => {
      const dateKey = new Date(sale.date).toLocaleDateString();
      if (!dateMap[dateKey]) dateMap[dateKey] = { date: dateKey, revenue: 0, gm: 0 };

      sale.items.forEach(item => {
        const inv = (userRole === 'ADMIN' ? allInventory : inventory).find(i => i.id === item.inventoryId);
        const nlc = nlcItems.find(n => n.id === inv?.nlcItemId);
        if (!nlc) return;

        const cost = getFinalNLC(nlc);
        const revenue = item.sellingPrice - item.additionalDiscount;
        const gm = revenue - cost;

        dateMap[dateKey].revenue += revenue;
        dateMap[dateKey].gm += gm;
      });
    });

    const dateData = Object.values(dateMap).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const brandMap: Record<string, { name: string, revenue: number, gm: number }> = {};
    relevantSales.forEach(sale => {
       sale.items.forEach(item => {
           const inv = (userRole === 'ADMIN' ? allInventory : inventory).find(i => i.id === item.inventoryId);
           const nlc = nlcItems.find(n => n.id === inv?.nlcItemId);
           if (!nlc) return;
           const brand = nlc.manufacturer;
           const revenue = item.sellingPrice - item.additionalDiscount;
           const cost = getFinalNLC(nlc);
           if (!brandMap[brand]) brandMap[brand] = { name: brand, revenue: 0, gm: 0 };
           brandMap[brand].revenue += revenue;
           brandMap[brand].gm += (revenue - cost);
       });
    });
    const brandData = Object.values(brandMap).sort((a,b) => b.revenue - a.revenue);

    return { dateData, brandData };
  };

  const { dateData, brandData } = processAnalyticsData();

  const uniqueCities = ['ALL', ...Array.from(new Set(retailers.map(r => r.city)))];
  const uniqueAreas = ['ALL', ...Array.from(new Set(retailers.map(r => r.area)))];

  const retailerPerformance = retailers.filter(r => {
      const matchCity = cityFilter === 'ALL' || r.city === cityFilter;
      const matchArea = areaFilter === 'ALL' || r.area === areaFilter;
      return matchCity && matchArea;
  }).map(r => {
    const rSales = filteredAllSales.filter(s => s.retailerId === r.id);
    const metrics = calculateMetrics(rSales, allInventory);
    const rStock = allInventory.filter(i => i.retailerId === r.id && i.status === 'IN_STOCK').length;
    
    return { 
        ...r, 
        revenue: metrics.revenue, 
        stockCount: rStock,
        gmPercent: metrics.marginPercent 
    };
  });

  const getPeriodLabel = () => {
    switch(dateFilter) {
        case 'DAY': return 'Today';
        case 'WEEK': return 'Last 7 Days';
        case 'MONTH': return 'This Month';
        case 'CUSTOM': return 'Custom Range';
        default: return 'Period';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Bar with Date Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
        <h2 className="text-xl font-bold text-gray-800">
            {userRole === 'ADMIN' ? 'Reto Central Hub' : 'Dashboard'}
        </h2>
        
        <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-gray-500 flex items-center"><Calendar size={16} className="mr-1"/> Filter all data:</span>
            <div className="flex bg-slate-100 rounded-lg p-1">
                {(['DAY', 'WEEK', 'MONTH'] as const).map(t => (
                    <button
                        key={t}
                        onClick={() => setDateFilter(t)}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition ${dateFilter === t ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        {t === 'DAY' ? 'Today' : t === 'WEEK' ? 'Week' : 'Month'}
                    </button>
                ))}
                <button
                    onClick={() => setDateFilter('CUSTOM')}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition ${dateFilter === 'CUSTOM' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Custom
                </button>
            </div>
            {dateFilter === 'CUSTOM' && (
                <div className="flex items-center gap-2">
                    <input type="date" className="text-xs border border-gray-600 rounded p-1 bg-gray-700 text-white" onChange={e => setCustomRange(p => ({...p, start: e.target.value}))}/>
                    <span className="text-gray-400">-</span>
                    <input type="date" className="text-xs border border-gray-600 rounded p-1 bg-gray-700 text-white" onChange={e => setCustomRange(p => ({...p, end: e.target.value}))}/>
                </div>
            )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="p-3 bg-blue-100 rounded-full text-blue-600">
            <IndianRupee size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Revenue</p>
            <p className="text-xl font-bold">₹{totalRevenue.toLocaleString('en-IN')}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="p-3 bg-green-100 rounded-full text-green-600">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Gross Margin</p>
            <div className="flex items-baseline space-x-2">
                <p className="text-xl font-bold">
                {totalGrossProfit > 0 ? `₹${totalGrossProfit.toLocaleString('en-IN')}` : '₹0'}
                </p>
                <span className={`text-xs font-medium px-2 py-0.5 rounded ${globalMarginPercent >= 10 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {globalMarginPercent.toFixed(1)}%
                </span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="p-3 bg-purple-100 rounded-full text-purple-600">
            <Package size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Stock Count</p>
            <p className="text-xl font-bold">{totalStockCount} <span className="text-xs font-normal text-gray-400">units</span></p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="p-3 bg-orange-100 rounded-full text-orange-600">
            {userRole === 'ADMIN' ? <Building size={24} /> : <AlertCircle size={24} />}
          </div>
          <div>
            <p className="text-sm text-gray-500">{userRole === 'ADMIN' ? 'Active Retailers' : 'Stock Value'}</p>
            <p className="text-xl font-bold">
                {userRole === 'ADMIN' ? retailers.length : `₹${stockValue.toLocaleString('en-IN')}`}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
             <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-800">Sales & Margin Trend</h3>
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded uppercase">{getPeriodLabel()}</span>
             </div>
             <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={dateData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis yAxisId="left" fontSize={12} tickFormatter={(v) => `₹${v/1000}k`} axisLine={false} tickLine={false}/>
                        <YAxis yAxisId="right" orientation="right" fontSize={12} tickFormatter={(v) => `₹${v/1000}k`} axisLine={false} tickLine={false}/>
                        <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'}} />
                        <Legend />
                        <Bar yAxisId="left" dataKey="revenue" name="Revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
                        <Line yAxisId="right" type="monotone" dataKey="gm" name="Gross Margin" stroke="#10b981" strokeWidth={3} dot={{r: 4}} />
                    </ComposedChart>
                </ResponsiveContainer>
             </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-800">Brand Performance</h3>
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded uppercase">{getPeriodLabel()}</span>
             </div>
            <div className="flex-1 overflow-auto max-h-64">
                 <table className="w-full text-sm text-left">
                     <thead className="bg-gray-50 text-gray-500 uppercase text-xs sticky top-0">
                         <tr>
                             <th className="px-3 py-2">Brand</th>
                             <th className="px-3 py-2 text-right">Revenue</th>
                             <th className="px-3 py-2 text-right">Margin</th>
                             <th className="px-3 py-2 text-right">%</th>
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-100">
                         {brandData.map((b, idx) => (
                             <tr key={idx} className="hover:bg-slate-50">
                                 <td className="px-3 py-2 font-medium">{b.name}</td>
                                 <td className="px-3 py-2 text-right">₹{b.revenue.toLocaleString()}</td>
                                 <td className="px-3 py-2 text-right text-green-600">₹{b.gm.toLocaleString()}</td>
                                 <td className="px-3 py-2 text-right font-bold text-gray-700">
                                     {b.revenue > 0 ? ((b.gm / b.revenue) * 100).toFixed(1) : 0}%
                                 </td>
                             </tr>
                         ))}
                     </tbody>
                 </table>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col">
          <h3 className="text-lg font-semibold mb-4">Recent Sales Activity</h3>
          <div className="overflow-auto max-h-96 scrollbar-hide flex-1">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="text-xs uppercase text-gray-500 bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2">
                    Date
                    <input type="text" placeholder="Filter" className="block w-full mt-1 text-[10px] p-1 border border-gray-600 rounded font-normal bg-gray-700 text-white placeholder-gray-400"
                        value={salesFilters.date} onChange={e => setSalesFilters({...salesFilters, date: e.target.value})} />
                  </th>
                  <th className="px-3 py-2">
                    Retailer
                    <input type="text" placeholder="Filter" className="block w-full mt-1 text-[10px] p-1 border border-gray-600 rounded font-normal bg-gray-700 text-white placeholder-gray-400"
                        value={salesFilters.retailer} onChange={e => setSalesFilters({...salesFilters, retailer: e.target.value})} />
                  </th>
                  <th className="px-3 py-2">
                    Model
                    <input type="text" placeholder="Filter" className="block w-full mt-1 text-[10px] p-1 border border-gray-600 rounded font-normal bg-gray-700 text-white placeholder-gray-400"
                        value={salesFilters.model} onChange={e => setSalesFilters({...salesFilters, model: e.target.value})} />
                  </th>
                  <th className="px-3 py-2 text-right">Final NLC</th>
                  <th className="px-3 py-2 text-right">Sell Price</th>
                  <th className="px-3 py-2 text-right">GM</th>
                  <th className="px-3 py-2 text-right">GM %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRecentSales.slice().reverse().slice(0, 30).map(sale => {
                   const saleItem = sale.items[0];
                   const inv = (userRole === 'ADMIN' ? allInventory : inventory).find(i => i.id === saleItem.inventoryId);
                   const nlc = nlcItems.find(n => n.id === inv?.nlcItemId);
                   const finalNLC = getFinalNLC(nlc);
                   const sp = saleItem.sellingPrice - saleItem.additionalDiscount;
                   const gm = sp - finalNLC;
                   const gmPercent = sp > 0 ? (gm / sp) * 100 : 0;
                   const retailerName = retailers.find(r => r.id === sale.retailerId)?.name || 'Unknown';

                   let rowClass = 'hover:bg-slate-50';
                   let percentColor = 'text-gray-600';
                   
                   // Enforce 10-15% margin color logic
                   if (gmPercent < 10) {
                       rowClass = 'bg-red-50 hover:bg-red-100';
                       percentColor = 'text-red-600 font-bold';
                   } else if (gmPercent >= 10 && gmPercent < 12) {
                       rowClass = 'bg-yellow-50 hover:bg-yellow-100';
                       percentColor = 'text-yellow-600 font-bold';
                   } else {
                       rowClass = 'bg-green-50 hover:bg-green-100';
                       percentColor = 'text-green-600 font-bold';
                   }

                   return (
                    <tr key={sale.id} className={`${rowClass} transition-colors border-b border-gray-100`}>
                        <td className="px-3 py-2 text-gray-500">{new Date(sale.date).toLocaleDateString()}</td>
                        <td className="px-3 py-2 font-medium text-gray-700 truncate max-w-[100px]" title={retailerName}>{retailerName}</td>
                        <td className="px-3 py-2 text-gray-600 truncate max-w-[120px]" title={nlc?.model}>{nlc?.model}</td>
                        <td className="px-3 py-2 text-right text-gray-500">₹{finalNLC.toLocaleString()}</td>
                        <td className="px-3 py-2 text-right font-medium">₹{sp.toLocaleString()}</td>
                        <td className={`px-3 py-2 text-right font-bold ${gm > 0 ? 'text-gray-800' : 'text-red-600'}`}>₹{gm.toLocaleString()}</td>
                        <td className={`px-3 py-2 text-right ${percentColor}`}>{gmPercent.toFixed(1)}%</td>
                    </tr>
                   );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {userRole === 'ADMIN' && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
                    <h3 className="text-lg font-semibold flex items-center"><Users className="mr-2" size={20}/> Retailer Performance</h3>
                    <div className="flex gap-2 p-2 rounded-lg bg-gray-50 border border-gray-200">
                         <div className="flex flex-col">
                            <label className="text-[10px] font-bold text-gray-400 uppercase">City</label>
                            <select className="text-xs border border-gray-600 rounded p-1 outline-none font-medium bg-gray-700 text-white" value={cityFilter} onChange={e => setCityFilter(e.target.value)}>
                                <option value="ALL">All Cities</option>
                                {uniqueCities.filter(c => c !== 'ALL').map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                         </div>
                         <div className="flex flex-col">
                            <label className="text-[10px] font-bold text-gray-400 uppercase">Area</label>
                            <select className="text-xs border border-gray-600 rounded p-1 outline-none font-medium bg-gray-700 text-white" value={areaFilter} onChange={e => setAreaFilter(e.target.value)}>
                                <option value="ALL">All Areas</option>
                                {uniqueAreas.filter(a => a !== 'ALL').map(a => <option key={a} value={a}>{a}</option>)}
                            </select>
                         </div>
                    </div>
                </div>
                <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left text-xs whitespace-nowrap">
                        <thead className="bg-slate-50 text-slate-500 uppercase">
                            <tr>
                                <th className="px-3 py-3">Retailer Name</th>
                                <th className="px-3 py-3">City</th>
                                <th className="px-3 py-3">Area</th>
                                <th className="px-3 py-3 text-right">Revenue</th>
                                <th className="px-3 py-3 text-right">GM %</th>
                                <th className="px-3 py-3 text-center">Stock</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {retailerPerformance.map(r => (
                                <tr key={r.id} className="hover:bg-slate-50">
                                    <td className="px-3 py-2 font-medium">{r.name}</td>
                                    <td className="px-3 py-2 text-gray-500">{r.city}</td>
                                    <td className="px-3 py-2 text-gray-500">{r.area}</td>
                                    <td className="px-3 py-2 text-right font-bold text-gray-800">₹{r.revenue.toLocaleString('en-IN')}</td>
                                    <td className="px-3 py-2 text-right font-medium">
                                        <span className={`${r.gmPercent >= 10 ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'} px-2 py-1 rounded`}>
                                            {r.gmPercent.toFixed(1)}%
                                        </span>
                                    </td>
                                    <td className="px-3 py-2 text-center">{r.stockCount}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
