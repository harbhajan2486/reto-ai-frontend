
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import NLCManager from './components/NLCManager';
import PurchaseOrders from './components/PurchaseOrders';
import SalesEntry from './components/SalesEntry';
import AIInsights from './components/AIInsights';
import RetailerManager from './components/RetailerManager';
import UserManagement from './components/UserManagement';
import RetailerUAM from './components/RetailerUAM';
import DocumentSettings from './components/DocumentSettings';
import InventoryManager from './components/InventoryManager';
import Auth from './components/Auth';
import { AppView, NLCItem, InventoryItem, PurchaseOrder, Sale, UserRole, RetailerProfile, User, AllowedUser, InvoiceSettings } from './types';

const MOCK_RETAILERS: RetailerProfile[] = [
  { id: 'r1', name: 'Ravi Corporation', city: 'Bangalore', area: 'Indiranagar', pincode: '560038', showroomAddress: 'No. 45, 100ft Road, Indiranagar, Bangalore', godownAddress: 'Plot 22, Whitefield Industrial Area, Bangalore', creditLimit: 15000000, usedCredit: 8500000, partnerSharePercent: 75 },
  { id: 'r2', name: 'Sales Corner', city: 'New Delhi', area: 'Lajpat Nagar', pincode: '110024', showroomAddress: 'Plot 12, Main Market, Lajpat Nagar, Delhi', godownAddress: 'Shed 5, Okhla Phase III, Delhi', creditLimit: 12000000, usedCredit: 7200000, partnerSharePercent: 80 },
  { id: 'r3', name: 'Electronics World', city: 'Mumbai', area: 'Andheri West', pincode: '400053', showroomAddress: 'G-12, Crystal Plaza, Andheri West, Mumbai', godownAddress: 'Warehouse B, MIDC Marol, Mumbai', creditLimit: 18000000, usedCredit: 9100000, partnerSharePercent: 75 },
  { id: 'r4', name: 'Kolkata Digitech', city: 'Kolkata', area: 'Salt Lake', pincode: '700091', showroomAddress: 'Block CF-1, Salt Lake Sector 1, Kolkata', godownAddress: 'Rajarhat Main Road, New Town, Kolkata', creditLimit: 10000000, usedCredit: 4500000, partnerSharePercent: 70 },
  { id: 'admin_central', name: 'RETO Central Hub', city: 'Bangalore', area: 'Indiranagar', pincode: '560038', showroomAddress: 'RETO HQ, Tech Park, Bangalore', godownAddress: 'RETO Central Godown, Hosur Road, Bangalore', creditLimit: 999999999, usedCredit: 0, partnerSharePercent: 100 }
];

const MOCK_ALLOWED_USERS: AllowedUser[] = [
    { email: 'admin@reto.ai', role: 'ADMIN', addedOn: new Date().toISOString() },
    { email: 'ravi@ravi.com', role: 'RETAILER', retailerId: 'r1', retailerRole: 'OWNER', addedOn: new Date().toISOString() }
];

const MOCK_INITIAL_USERS: User[] = [
    { id: 'u1', email: 'admin@reto.ai', name: 'Admin User', role: 'ADMIN' },
    { id: 'u2', email: 'ravi@ravi.com', name: 'Ravi (Owner)', role: 'RETAILER', retailerId: 'r1', retailerRole: 'OWNER' }
];

const getRecentDate = (daysAgo: number) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString();
};

const MOCK_NLC: NLCItem[] = [
  { id: 'n1-mar', manufacturer: 'LG', model: '650L Side-by-Side Ref', category: 'Refrigerator', mrp: 95000, basicPrice: 82000, discountSchemes: [{name: 'Trade', amount: 5000, isBackend: false}, {name: 'Target', amount: 3000, isBackend: true}], netLandingCost: 71000, effectiveCost: 68000, msp: 80680, batchDate: '2024-03-01T00:00:00.000Z', gstRate: 18 },
  { id: 'n2-mar', manufacturer: 'Samsung', model: '1.5 Ton 5-Star AC', category: 'Air Conditioner', mrp: 55000, basicPrice: 48000, discountSchemes: [{name: 'Summer', amount: 4000, isBackend: false}, {name: 'Early Bird', amount: 1500, isBackend: true}], netLandingCost: 41000, effectiveCost: 39500, msp: 47120, batchDate: '2024-03-01T00:00:00.000Z', gstRate: 28 },
  { id: 'n1-feb', manufacturer: 'LG', model: '650L Side-by-Side Ref', category: 'Refrigerator', mrp: 93000, basicPrice: 80000, discountSchemes: [{name: 'Trade', amount: 4000, isBackend: false}], netLandingCost: 73000, effectiveCost: 71000, msp: 82000, batchDate: '2024-02-01T00:00:00.000Z', gstRate: 18 },
  { id: 'n2-feb', manufacturer: 'Samsung', model: '1.5 Ton 5-Star AC', category: 'Air Conditioner', mrp: 52000, basicPrice: 45000, discountSchemes: [{name: 'Winter Clear', amount: 5000, isBackend: false}], netLandingCost: 38000, effectiveCost: 37000, msp: 44000, batchDate: '2024-02-01T00:00:00.000Z', gstRate: 28 },
  { id: 'n3', manufacturer: 'Sony', model: 'Bravia 55" 4K OLED', category: 'Television', mrp: 125000, basicPrice: 110000, discountSchemes: [{name: 'Festival', amount: 10000, isBackend: false}, {name: 'Volume', amount: 5000, isBackend: true}], netLandingCost: 92000, effectiveCost: 88000, msp: 103370, batchDate: '2024-01-01T00:00:00.000Z', gstRate: 18 },
  { id: 'n4', manufacturer: 'Whirlpool', model: '8kg Front Load WM', category: 'Washing Machine', mrp: 38000, basicPrice: 32000, discountSchemes: [{name: 'Promo', amount: 2000, isBackend: false}], netLandingCost: 28000, effectiveCost: 27000, msp: 32550, batchDate: '2024-01-01T00:00:00.000Z', gstRate: 18 },
  { id: 'n5', manufacturer: 'Daikin', model: 'FTKF 1.5 Ton AC', category: 'Air Conditioner', mrp: 62000, basicPrice: 54000, discountSchemes: [{name: 'Standard', amount: 3000, isBackend: false}], netLandingCost: 48000, effectiveCost: 46000, msp: 53330, batchDate: '2024-01-01T00:00:00.000Z', gstRate: 28 }
];

const DEFAULT_INVOICE_SETTINGS: InvoiceSettings = {
  companyName: 'RETO Electronics',
  addressLine1: '123, Tech Park',
  addressLine2: 'Indiranagar Phase 1',
  cityStateZip: 'Bangalore, 560038',
  gstin: '29ABCDE1234F1Z5',
  logoUrl: '',
  termsAndConditions: '1. Goods once sold will not be taken back.\n2. Warranty as per manufacturer policy.\n3. All disputes subject to Bangalore jurisdiction.',
  bankDetails: 'HDFC Bank, A/C: 50200012345678, IFSC: HDFC0001234'
};

const getFinalNLC = (nlcItem: NLCItem | undefined): number => {
    if (!nlcItem) return 0;
    const upfront = nlcItem.discountSchemes.filter(d => !d.isBackend).reduce((sum, d) => sum + d.amount, 0);
    const backend = nlcItem.discountSchemes.filter(d => d.isBackend).reduce((sum, d) => sum + d.amount, 0);
    const netBasic = nlcItem.basicPrice - upfront;
    const gst = netBasic * (nlcItem.gstRate / 100);
    const invoiceAmt = netBasic + gst;
    return invoiceAmt - backend;
};

const generateFullHistory = () => {
    const inv: InventoryItem[] = [];
    const sales: Sale[] = [];
    const orders: PurchaseOrder[] = [];
    const allRetailers = MOCK_RETAILERS;
    const nlcItems = MOCK_NLC;

    allRetailers.forEach(retailer => {
        const isHub = retailer.id === 'admin_central';
        const brands = ['LG', 'Samsung', 'Sony', 'Daikin'];
        brands.forEach((brand, idx) => {
            const date = getRecentDate(30 + idx * 5);
            const modelNlc = nlcItems.find(n => n.manufacturer === brand && n.id.includes('feb')) || nlcItems.find(n => n.manufacturer === brand)!;
            const poId = `REQ-${brand.substring(0,2).toUpperCase()}-${retailer.id.toUpperCase()}-${1000+idx}`;
            const mPoId = `M-PO-${brand.toUpperCase()}-MAR-${idx}`; // Added Master PO Ref
            const invRef = `B-INV-${8000 + idx}`;
            
            const po: PurchaseOrder = {
                id: poId,
                manufacturer: brand,
                date: date,
                status: 'RECEIVED',
                retailerId: retailer.id,
                masterPOId: mPoId, // Added Master PO Ref
                brandInvoiceNumber: invRef,
                items: [{ nlcItemId: modelNlc.id, quantity: 5 }],
                mappingData: [{
                    nlcItemId: modelNlc.id,
                    orderedQty: 5,
                    receivedQty: 5,
                    serialNumbers: Array(5).fill(0).map((_, i) => `${brand}-SN-${retailer.id}-${100+idx}-${i}`)
                }]
            };
            orders.push(po);

            po.mappingData![0].serialNumbers.forEach((sn, sIdx) => {
                const isSold = sIdx < 3 && !isHub;
                const invId = `INV-${sn}`;
                const saleDate = getRecentDate(10 + sIdx);
                const custInv = `C-INV-${retailer.city.substring(0,3).toUpperCase()}-${2000 + idx + sIdx}`;

                const item: InventoryItem = {
                    id: invId,
                    serialNumber: sn,
                    nlcItemId: modelNlc.id,
                    status: isSold ? 'SOLD' : 'IN_STOCK',
                    dateReceived: date,
                    retailerId: retailer.id,
                    retailerPOId: poId,
                    consolidatedPOId: mPoId, // Fixed: Added consolidatedPOId to mock items
                    brandInvoiceId: invRef,
                    customerInvoiceNumber: isSold ? custInv : undefined,
                    saleDate: isSold ? saleDate : undefined
                };
                inv.push(item);

                if (isSold) {
                    const cost = getFinalNLC(modelNlc);
                    const sellingPrice = Math.round(cost * 1.12);
                    sales.push({
                        id: `SALE-${invId}`,
                        invoiceNumber: custInv,
                        date: saleDate,
                        customerName: `Customer ${sIdx + 1}`,
                        retailerId: retailer.id,
                        paymentMode: 'CASH',
                        items: [{ inventoryId: invId, sellingPrice, additionalDiscount: 0 }],
                        totalAmount: sellingPrice
                    });
                }
            });
        });

        if (!isHub) {
            orders.push({
                id: `REQ-NEW-SAM-${retailer.id.toUpperCase()}`,
                manufacturer: 'Samsung',
                date: getRecentDate(2),
                status: 'SHIPPED',
                retailerId: retailer.id,
                masterPOId: `M-PO-SAM-APR-22`, // Added Master PO Ref
                brandInvoiceNumber: 'B-INV-LOG-999',
                items: [{ nlcItemId: 'n2-mar', quantity: 10 }]
            });
            orders.push({
                id: `REQ-PENDING-LG-${retailer.id.toUpperCase()}`,
                manufacturer: 'LG',
                date: getRecentDate(1),
                status: 'APPROVED',
                retailerId: retailer.id,
                items: [{ nlcItemId: 'n1-mar', quantity: 8 }]
            });
        }
    });

    return { inv, sales, orders };
};

const { inv: INITIAL_INV, sales: INITIAL_SALES, orders: INITIAL_ORDERS } = generateFullHistory();

function App() {
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [nlcItems, setNlcItems] = useState<NLCItem[]>(MOCK_NLC);
  const [inventory, setInventory] = useState<InventoryItem[]>(INITIAL_INV);
  const [orders, setOrders] = useState<PurchaseOrder[]>(INITIAL_ORDERS);
  const [sales, setSales] = useState<Sale[]>(INITIAL_SALES);
  const [retailers, setRetailers] = useState<RetailerProfile[]>(MOCK_RETAILERS);
  const [invoiceSettings, setInvoiceSettings] = useState<InvoiceSettings>(DEFAULT_INVOICE_SETTINGS);
  const [activeRetailerId, setActiveRetailerId] = useState<string>('r1');
  const [users, setUsers] = useState<User[]>(MOCK_INITIAL_USERS);
  const [allowedUsers, setAllowedUsers] = useState<AllowedUser[]>(MOCK_ALLOWED_USERS);

  const userRole = currentUser?.role || 'RETAILER';
  const retailerRole = currentUser?.retailerRole || 'OWNER';

  useEffect(() => {
    if (currentUser?.role === 'RETAILER' && currentUser.retailerId) {
        setActiveRetailerId(currentUser.retailerId);
    }
  }, [currentUser]);

  const handleCreateSale = (newSale: Sale) => {
    setSales([newSale, ...sales]);
    const soldIds = newSale.items.map(i => i.inventoryId);
    setInventory(prev => prev.map(item => 
        soldIds.includes(item.id) 
            ? { ...item, status: 'SOLD', customerInvoiceNumber: newSale.invoiceNumber, saleDate: newSale.date } 
            : item
    ));
  };

  const handleAddAllowedUser = (newUser: AllowedUser) => { setAllowedUsers([...allowedUsers, newUser]); };
  const handleRemoveAllowedUser = (email: string) => { setAllowedUsers(allowedUsers.filter(u => u.email !== email)); };
  const handleSignup = (newUser: User) => { setUsers([...users, newUser]); setCurrentUser(newUser); };

  const currentRetailer = retailers.find(r => r.id === activeRetailerId);

  return (
    <Layout currentView={currentView} onChangeView={setCurrentView} currentUser={currentUser} onLogout={() => setCurrentUser(null)} retailers={retailers} activeRetailerId={activeRetailerId} setActiveRetailerId={setActiveRetailerId}>
      {!currentUser ? (
          <Auth view={AppView.LOGIN} setView={() => {}} onLogin={setCurrentUser} users={users} allowedUsers={allowedUsers} onSignup={handleSignup} />
      ) : (
        <>
            {currentView === AppView.DASHBOARD && <Dashboard nlcItems={nlcItems} inventory={inventory} sales={sales} userRole={userRole} retailers={retailers} allInventory={inventory} allSales={sales} />}
            {currentView === AppView.INVENTORY && <InventoryManager inventory={inventory} nlcItems={nlcItems} retailers={retailers} userRole={userRole} activeRetailerId={activeRetailerId} orders={orders} setOrders={setOrders} setInventory={setInventory} />}
            {currentView === AppView.NLC_UPLOAD && <NLCManager nlcItems={nlcItems} setNlcItems={setNlcItems} userRole={userRole} />}
            {currentView === AppView.PURCHASE_ORDERS && <PurchaseOrders nlcItems={nlcItems} orders={orders} setOrders={setOrders} setInventory={setInventory} userRole={userRole} activeRetailerId={activeRetailerId} retailers={retailers} allOrders={orders} invoiceSettings={invoiceSettings} />}
            {currentView === AppView.SALES && <SalesEntry inventory={inventory} nlcItems={nlcItems} onCreateSale={handleCreateSale} activeRetailerId={activeRetailerId} userRole={userRole} retailerRole={retailerRole} invoiceSettings={invoiceSettings} />}
            {currentView === AppView.MANAGE_RETAILERS && <RetailerManager retailers={retailers} setRetailers={setRetailers} sales={sales} inventory={inventory} nlcItems={nlcItems} currentUserRole={userRole} activeRetailerId={activeRetailerId} />}
            {currentView === AppView.AI_INSIGHTS && <AIInsights nlcItems={nlcItems} inventory={inventory} sales={sales} userRole={userRole} retailerProfile={currentRetailer} />}
            {currentView === AppView.SETTINGS && <DocumentSettings settings={invoiceSettings} onSave={setInvoiceSettings} />}
            {currentView === AppView.USER_MANAGEMENT && <UserManagement allowedUsers={allowedUsers} onAddUser={handleAddAllowedUser} onRemoveUser={handleRemoveAllowedUser} retailers={retailers} />}
            {currentView === AppView.RETAILER_UAM && <RetailerUAM allowedUsers={allowedUsers} onAddUser={handleAddAllowedUser} onRemoveUser={handleRemoveAllowedUser} currentUserEmail={currentUser.email} retailerId={activeRetailerId} />}
        </>
      )}
    </Layout>
  );
}

export default App;
