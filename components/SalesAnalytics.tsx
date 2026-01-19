
import React, { useState } from 'react';
import { Sale, NLCItem, InventoryItem, RetailerProfile } from '../types';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart } from 'recharts';
import { Calendar, Filter, TrendingUp, IndianRupee } from 'lucide-react';

interface SalesAnalyticsProps {
  sales: Sale[];
  inventory: InventoryItem[];
  nlcItems: NLCItem[];
  activeRetailerId: string;
}

const SalesAnalytics: React.FC<SalesAnalyticsProps> = ({ sales, inventory, nlcItems, activeRetailerId }) => {
  const [timeRange, setTimeRange] = useState<'WEEK' | 'MONTH' | 'QUARTER'>('MONTH');
  
  // Helpers
  const getFinalNLC = (nlcItem: NLCItem | undefined) => {
    if (!nlcItem) return 0;
    const upfront = nlcItem.discountSchemes.filter(d => !d.isBackend).reduce((sum, d) => sum + d.amount, 0);
    const backend = nlcItem.discountSchemes.filter(d => d.isBackend).reduce((sum, d) => sum + d.amount, 0);
    const netBasic = nlcItem.basicPrice - upfront;
    const gst = netBasic * (nlcItem.gstRate / 100);
    return (netBasic + gst) - backend;
  };

  const processData = () => {
    // Filter sales by range
    const now = new Date();
    const startDate = new Date();
    if (timeRange === 'WEEK') startDate.setDate(now.getDate() - 7);
    if (timeRange === 'MONTH') startDate.setMonth(now.getMonth() - 1);
    if (timeRange === 'QUARTER') startDate.setMonth(now.getMonth() - 3);

    const relevantSales = sales.filter(s => new Date(s.date) >= startDate && s.retailerId === activeRetailerId);

    // Group by Date
    const dateMap: Record<string, { date: string, revenue: number, gm: number }> = {};
    
    // Group by Brand
    const brandMap: Record<string, { name: string, revenue: number, gm: number }> = {};

    relevantSales.forEach(sale => {
      const dateKey = new Date(sale.date).toLocaleDateString();
      if (!dateMap[dateKey]) dateMap[dateKey] = { date: dateKey, revenue: 0, gm: 0 };

      sale.items.forEach(item => {
        const inv = inventory.find(i => i.id === item.inventoryId);
        const nlc = nlcItems.find(n => n.id === inv?.nlcItemId);
        if (!nlc) return;

        const cost = getFinalNLC(nlc);
        const revenue = item.sellingPrice - item.additionalDiscount;
        const gm = revenue - cost;

        dateMap[dateKey].revenue += revenue;
        dateMap[dateKey].gm += gm;

        const brand = nlc.manufacturer;
        if (!brandMap[brand]) brandMap[brand] = { name: brand, revenue: 0, gm: 0 };
        brandMap[brand].revenue += revenue;
        brandMap[brand].gm += gm;
      });
    });

    const dateData = Object.values(dateMap).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const brandData = Object.values(brandMap).sort((a,b) => b.revenue - a.revenue);

    return { dateData, brandData };
  };

  const { dateData, brandData } = processData();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-100">
        <h2 className="text-xl font-bold text-gray-800 flex items-center">
            <TrendingUp className="mr-2 text-blue-600"/> Sales Analytics
        </h2>
        <div className="flex bg-slate-100 rounded-lg p-1">
            {(['WEEK', 'MONTH', 'QUARTER'] as const).map(t => (
                <button
                    key={t}
                    onClick={() => setTimeRange(t)}
                    className={`px-4 py-1.5 text-xs font-bold rounded-md transition ${timeRange === t ? 'bg-white shadow text-blue-700' : 'text-gray-500'}`}
                >
                    {t}
                </button>
            ))}
        </div>
      </div>

      {/* Date Wise Trend */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <h3 className="font-semibold text-gray-700 mb-4">Daily Sales & Margin Trend</h3>
        <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={dateData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
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

      {/* Brand Wise Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <h3 className="font-semibold text-gray-700 mb-4">Performance by Brand</h3>
            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={brandData} layout="vertical" margin={{left: 20}}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" width={80} fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '8px'}} />
                        <Bar dataKey="revenue" name="Revenue" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
             <h3 className="font-semibold text-gray-700 mb-4">Margin Contribution by Brand</h3>
             <div className="overflow-auto max-h-64">
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
    </div>
  );
};

export default SalesAnalytics;
