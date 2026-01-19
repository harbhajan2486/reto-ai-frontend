
import React, { useState, useEffect } from 'react';
import { InventoryItem, NLCItem, Sale, UserRole, PaymentMode, RetailerRole, InvoiceSettings } from '../types';
import { ShoppingCart, Plus, Trash2, Save, AlertTriangle, MonitorCheck, CreditCard, Banknote, Smartphone, Printer, Download, Mail, CheckCircle, Eye, Tag, X, Search } from 'lucide-react';

interface SalesEntryProps {
  inventory: InventoryItem[];
  nlcItems: NLCItem[];
  onCreateSale: (sale: Sale) => void;
  activeRetailerId: string;
  userRole: UserRole;
  retailerRole?: RetailerRole;
  invoiceSettings: InvoiceSettings;
}

const SalesEntry: React.FC<SalesEntryProps> = ({ inventory, nlcItems, onCreateSale, activeRetailerId, userRole, retailerRole, invoiceSettings }) => {
  const [customer, setCustomer] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('POS_TERMINAL');
  const [posConnected, setPosConnected] = useState(false);
  const [cart, setCart] = useState<{ invItem: InventoryItem; nlcItem: NLCItem; price: number; discount: number }[]>([]);
  
  // UI States
  const [showPreview, setShowPreview] = useState(false);
  const [lastSale, setLastSale] = useState<Sale | null>(null);

  // Simulate POS Connection
  useEffect(() => {
    const timer = setTimeout(() => setPosConnected(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  // Filter only items in stock for this retailer
  const availableStock = inventory.filter(i => i.status === 'IN_STOCK' && i.retailerId === activeRetailerId);

  const filteredStock = availableStock.filter(item => {
      const nlc = nlcItems.find(n => n.id === item.nlcItemId);
      if (!nlc) return false;
      const query = searchQuery.toLowerCase();
      return nlc.model.toLowerCase().includes(query) || 
             nlc.manufacturer.toLowerCase().includes(query) || 
             item.serialNumber.toLowerCase().includes(query);
  });

  const addToCart = (invId: string) => {
    const invItem = availableStock.find(i => i.id === invId);
    if (!invItem) return;
    const nlcItem = nlcItems.find(n => n.id === invItem.nlcItemId);
    if (!nlcItem) return;

    if (cart.find(c => c.invItem.id === invId)) return;

    setCart([...cart, { invItem, nlcItem, price: nlcItem.msp || nlcItem.basicPrice, discount: 0 }]);
  };

  const removeFromCart = (index: number) => {
    const newCart = [...cart];
    newCart.splice(index, 1);
    setCart(newCart);
  };

  const updateCartItem = (index: number, field: 'price' | 'discount', value: number) => {
    const newCart = [...cart];
    newCart[index] = { ...newCart[index], [field]: value };
    setCart(newCart);
  };

  const handlePreview = () => {
      if (!customer || cart.length === 0) return;
      setShowPreview(true);
  };

  const handleFinalize = () => {
    const total = cart.reduce((sum, item) => sum + (item.price - item.discount), 0);
    const invNum = `INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`;

    const newSale: Sale = {
      id: Math.random().toString(36).substr(2, 9),
      invoiceNumber: invNum,
      date: new Date().toISOString(),
      customerName: customer,
      retailerId: activeRetailerId,
      paymentMode: paymentMode,
      items: cart.map(c => ({
        inventoryId: c.invItem.id,
        sellingPrice: c.price,
        additionalDiscount: c.discount
      })),
      totalAmount: total
    };

    onCreateSale(newSale);
    setLastSale(newSale); // Show success screen
    setShowPreview(false);
    setCustomer('');
    setCart([]);
  };

  const resetEntry = () => {
      setLastSale(null);
  };

  if (lastSale) {
      return (
          <div className="flex flex-col items-center justify-center h-[calc(100vh-140px)] bg-white rounded-xl shadow-sm border border-slate-100 p-10 text-center animate-fade-in">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                  <CheckCircle size={48} className="text-green-600"/>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Invoice Generated Successfully!</h2>
              <p className="text-gray-500 mb-8">Invoice #{lastSale.invoiceNumber} for {lastSale.customerName}</p>
              
              <div className="flex gap-4 mb-8">
                  <button onClick={() => alert('Sending to printer...')} className="flex items-center px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition">
                      <Printer size={20} className="mr-2"/> Print
                  </button>
                  <button onClick={() => alert('Downloading PDF...')} className="flex items-center px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition">
                      <Download size={20} className="mr-2"/> Download
                  </button>
                  <button onClick={() => alert('Email sent!')} className="flex items-center px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition">
                      <Mail size={20} className="mr-2"/> Email
                  </button>
              </div>

              <button onClick={resetEntry} className="text-blue-600 font-bold hover:underline">
                  Start New Sale
              </button>
          </div>
      );
  }

  const subTotal = cart.reduce((sum, item) => sum + item.price, 0);
  const totalDiscount = cart.reduce((sum, item) => sum + item.discount, 0);
  const grandTotal = subTotal - totalDiscount;

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-140px)]">
      <div className="lg:w-2/3 flex flex-col gap-6">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
           <div className="flex items-center gap-2">
               <div className={`w-3 h-3 rounded-full ${posConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
               <span className="text-sm font-medium text-gray-600">{posConnected ? 'POS Connected' : 'Connecting POS...'}</span>
           </div>
           {retailerRole === 'SALES_REP' && (
               <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-bold flex items-center">
                   <Tag size={12} className="mr-1"/> Daily Incentive Active
               </div>
           )}
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex-1 flex flex-col overflow-hidden">
            <h3 className="font-bold text-gray-700 mb-4">Select Items from Store Inventory</h3>
            <div className="relative mb-4">
                <input 
                    type="text" 
                    placeholder="Scan Serial or Type Model Number..." 
                    className="w-full p-3 pl-10 border border-gray-600 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:bg-gray-600 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                />
                <Search className="absolute left-3 top-3.5 text-gray-400" size={20}/>
            </div>
            
            <div className="overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 pr-2 scrollbar-hide">
                {filteredStock.map(item => {
                    const nlc = nlcItems.find(n => n.id === item.nlcItemId);
                    if (!nlc) return null;
                    return (
                        <div key={item.id} className="border rounded-lg p-3 hover:border-blue-400 cursor-pointer transition flex justify-between group bg-white shadow-sm" onClick={() => addToCart(item.id)}>
                            <div>
                                <p className="font-bold text-sm text-gray-800">{nlc.model}</p>
                                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black">{nlc.manufacturer} &bull; {item.serialNumber}</p>
                            </div>
                            <div className="text-right">
                                <p className="font-bold text-blue-600">₹{(nlc.msp || nlc.basicPrice).toFixed(1)}</p>
                                <button className="opacity-0 group-hover:opacity-100 bg-blue-100 text-blue-600 p-1 rounded mt-1">
                                    <Plus size={16}/>
                                </button>
                            </div>
                        </div>
                    );
                })}
                {filteredStock.length === 0 && (
                    <div className="col-span-full py-10 text-center text-gray-400">
                        No in-stock items match your search.
                    </div>
                )}
            </div>
        </div>
      </div>

      <div className="lg:w-1/3 bg-white rounded-xl shadow-xl border border-slate-100 flex flex-col">
          <div className="p-4 border-b bg-gray-50">
              <h3 className="font-bold text-gray-800 flex items-center"><ShoppingCart className="mr-2"/> Current Sale</h3>
          </div>
          
          <div className="p-4 border-b space-y-3">
              <input 
                  type="text" 
                  placeholder="Customer Name / Mobile" 
                  className="w-full p-2 border border-gray-600 rounded text-sm outline-none focus:border-blue-500 bg-gray-700 text-white placeholder-gray-400"
                  value={customer}
                  onChange={e => setCustomer(e.target.value)}
              />
              <div className="grid grid-cols-3 gap-2">
                  <button onClick={() => setPaymentMode('POS_TERMINAL')} className={`p-2 rounded border text-xs flex flex-col items-center justify-center ${paymentMode === 'POS_TERMINAL' ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold' : 'text-gray-500'}`}><CreditCard size={16} className="mb-1"/> Card</button>
                  <button onClick={() => setPaymentMode('UPI')} className={`p-2 rounded border text-xs flex flex-col items-center justify-center ${paymentMode === 'UPI' ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold' : 'text-gray-500'}`}><Smartphone size={16} className="mb-1"/> UPI</button>
                  <button onClick={() => setPaymentMode('CASH')} className={`p-2 rounded border text-xs flex flex-col items-center justify-center ${paymentMode === 'CASH' ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold' : 'text-gray-500'}`}><Banknote size={16} className="mb-1"/> Cash</button>
              </div>
          </div>

          <div className="flex-1 overflow-auto p-4 space-y-3">
              {cart.length === 0 ? (
                  <div className="text-center text-gray-400 py-10">Cart is empty</div>
              ) : (
                  cart.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-start border-b pb-3 last:border-0">
                          <div className="flex-1">
                              <p className="text-sm font-bold text-gray-800">{item.nlcItem.model}</p>
                              <p className="text-[10px] text-gray-500">{item.invItem.serialNumber}</p>
                              <div className="mt-1 flex items-center gap-2">
                                  <label className="text-[10px] font-bold text-gray-400">Price:</label>
                                  <input 
                                    type="number" 
                                    className="w-20 p-1 border border-gray-600 rounded text-xs bg-gray-700 text-white" 
                                    value={item.price}
                                    onChange={e => updateCartItem(idx, 'price', parseFloat(e.target.value))}
                                  />
                              </div>
                              <div className="mt-1 flex items-center gap-2">
                                  <label className="text-[10px] font-bold text-gray-400">Disc:</label>
                                  <input 
                                    type="number" 
                                    className="w-20 p-1 border border-gray-600 rounded text-xs bg-gray-700 text-red-300" 
                                    value={item.discount}
                                    onChange={e => updateCartItem(idx, 'discount', parseFloat(e.target.value))}
                                  />
                              </div>
                          </div>
                          <div className="text-right pl-2">
                              <p className="font-bold text-gray-800">₹{(item.price - item.discount).toFixed(1)}</p>
                              <button onClick={() => removeFromCart(idx)} className="text-red-400 hover:text-red-600 mt-2">
                                  <Trash2 size={16}/>
                              </button>
                          </div>
                      </div>
                  ))
              )}
          </div>

          <div className="p-4 bg-gray-50 border-t">
              <div className="flex justify-between mb-2 text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="font-medium">₹{subTotal.toFixed(1)}</span>
              </div>
              <div className="flex justify-between mb-4 text-sm">
                  <span className="text-gray-500">Total Discount</span>
                  <span className="font-medium text-red-500">-₹{totalDiscount.toFixed(1)}</span>
              </div>
              <div className="flex justify-between mb-6 text-xl font-bold text-gray-800">
                  <span>Grand Total</span>
                  <span>₹{grandTotal.toFixed(1)}</span>
              </div>
              <button 
                onClick={handlePreview}
                disabled={cart.length === 0 || !customer}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center"
              >
                  <Eye size={20} className="mr-2"/> Preview Invoice
              </button>
          </div>
      </div>

      {showPreview && (
          <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-2 sm:p-4 overflow-hidden">
              <div className="bg-white w-full max-w-2xl max-h-[95vh] shadow-2xl rounded-sm flex flex-col relative overflow-hidden">
                  <button onClick={() => setShowPreview(false)} className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 z-10 bg-white/80 p-1 rounded-full shadow-sm">
                      <X size={24} />
                  </button>

                  <div className="flex-1 overflow-y-auto p-4 sm:p-12 text-gray-800 scrollbar-hide">
                      <div className="min-w-[400px]">
                          <div className="flex justify-between items-start border-b-2 border-gray-800 pb-6 mb-6">
                              <div>
                                  {invoiceSettings.logoUrl ? (
                                      <img src={invoiceSettings.logoUrl} alt="Logo" className="h-12 object-contain mb-2" />
                                  ) : (
                                      <h1 className="text-2xl font-bold text-blue-700 uppercase tracking-wide">{invoiceSettings.companyName || 'RETO Electronics'}</h1>
                                  )}
                                  <p className="text-xs text-gray-600 max-w-[250px] whitespace-pre-wrap">{invoiceSettings.addressLine1}</p>
                                  <p className="text-xs text-gray-600 max-w-[250px] whitespace-pre-wrap">{invoiceSettings.addressLine2}</p>
                                  <p className="text-xs text-gray-600">{invoiceSettings.cityStateZip}</p>
                                  <p className="text-xs font-bold mt-1">GSTIN: {invoiceSettings.gstin}</p>
                              </div>
                              <div className="text-right">
                                  <h2 className="text-2xl sm:text-3xl font-light text-gray-300">TAX INVOICE</h2>
                                  <p className="font-bold text-lg mt-2">#{`INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`}</p>
                                  <p className="text-sm text-gray-500">Date: {new Date().toLocaleDateString()}</p>
                              </div>
                          </div>

                          <div className="mb-8">
                              <h3 className="text-xs font-bold text-gray-400 uppercase mb-1">Bill To</h3>
                              <p className="font-bold text-lg">{customer}</p>
                              <p className="text-sm text-gray-500">Payment Mode: {paymentMode}</p>
                          </div>

                          <table className="w-full text-left mb-8">
                              <thead>
                                  <tr className="border-b-2 border-gray-800">
                                      <th className="py-2 text-sm font-bold uppercase text-gray-600">Description</th>
                                      <th className="py-2 text-sm font-bold uppercase text-gray-600 text-center">HSN/SAC</th>
                                      <th className="py-2 text-sm font-bold uppercase text-gray-600 text-right">Rate</th>
                                      <th className="py-2 text-sm font-bold uppercase text-gray-600 text-right">Disc</th>
                                      <th className="py-2 text-sm font-bold uppercase text-gray-600 text-right">Amount</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y">
                                  {cart.map((item, i) => (
                                      <tr key={i}>
                                          <td className="py-3 text-sm">
                                              <p className="font-bold">{item.nlcItem.manufacturer} {item.nlcItem.model}</p>
                                              <p className="text-xs text-gray-500">SN: {item.invItem.serialNumber}</p>
                                          </td>
                                          <td className="py-3 text-sm text-center text-gray-500">8528</td>
                                          <td className="py-3 text-sm text-right">₹{item.price.toFixed(1)}</td>
                                          <td className="py-3 text-sm text-right text-red-500">{item.discount > 0 ? `-₹${item.discount.toFixed(1)}` : '-'}</td>
                                          <td className="py-3 text-sm text-right font-bold">₹{(item.price - item.discount).toFixed(1)}</td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>

                          <div className="flex justify-end mb-8">
                              <div className="w-64 space-y-2">
                                  <div className="flex justify-between text-sm">
                                      <span className="text-gray-500">Sub Total</span>
                                      <span className="font-medium">₹{subTotal.toFixed(1)}</span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                      <span className="text-gray-500">Total Tax (Included)</span>
                                      <span className="font-medium">₹{(grandTotal * 0.18).toFixed(1)}</span>
                                  </div>
                                  <div className="flex justify-between text-xl font-bold border-t border-gray-800 pt-2">
                                      <span>Total</span>
                                      <span>₹{grandTotal.toFixed(1)}</span>
                                  </div>
                              </div>
                          </div>

                          <div className="grid grid-cols-2 gap-8 border-t pt-6 text-xs text-gray-500">
                              <div>
                                  <h4 className="font-bold text-gray-700 mb-1">Terms & Conditions</h4>
                                  <p className="whitespace-pre-wrap">{invoiceSettings.termsAndConditions}</p>
                                  
                                  <h4 className="font-bold text-gray-700 mt-4 mb-1">Bank Details</h4>
                                  <p className="whitespace-pre-wrap">{invoiceSettings.bankDetails}</p>
                              </div>
                              <div className="text-right flex flex-col justify-end">
                                  <p className="mb-8 font-bold text-gray-800">{invoiceSettings.companyName}</p>
                                  <div className="border-t border-gray-300 w-32 ml-auto"></div>
                                  <p className="mt-1">Authorized Signatory</p>
                              </div>
                          </div>
                      </div>
                  </div>

                  <div className="bg-gray-100 p-4 flex justify-end gap-3 border-t">
                      <button onClick={() => setShowPreview(false)} className="px-6 py-2 bg-white border border-gray-300 rounded font-medium hover:bg-gray-50 text-sm">Edit</button>
                      <button onClick={handleFinalize} className="px-6 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 flex items-center text-sm shadow-md">
                          <Printer size={18} className="mr-2"/> Finalize & Print
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default SalesEntry;
