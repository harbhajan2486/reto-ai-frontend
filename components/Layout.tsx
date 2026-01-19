
import React from 'react';
import { AppView, UserRole, RetailerProfile, User, RetailerRole } from '../types';
import { LayoutDashboard, FileSpreadsheet, ShoppingBag, Truck, Cpu, UserCircle, Building2, Users, Shield, LogOut, Lock, Settings, Package, PieChart } from 'lucide-react';

interface LayoutProps {
  currentView: AppView;
  onChangeView: (view: AppView) => void;
  children: React.ReactNode;
  currentUser: User | null;
  onLogout: () => void;
  retailers: RetailerProfile[];
  activeRetailerId: string;
  setActiveRetailerId: (id: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ 
  currentView, 
  onChangeView, 
  children,
  currentUser,
  onLogout,
  retailers,
  activeRetailerId,
  setActiveRetailerId
}) => {
  if (!currentUser) {
      return <>{children}</>;
  }

  const userRole = currentUser?.role || 'RETAILER';
  const retailerRole = currentUser?.retailerRole || 'OWNER';

  const hasAccess = (requiredRoles: RetailerRole[]) => {
      if (userRole === 'ADMIN') return true;
      if (retailerRole === 'OWNER' || retailerRole === 'FLOOR_MANAGER') return true;
      return requiredRoles.includes(retailerRole);
  };

  const navItems = [
    { 
        id: AppView.DASHBOARD, 
        label: 'Dashboard', 
        icon: LayoutDashboard,
        visible: true 
    },
    { 
        id: AppView.INVENTORY, 
        label: 'Inventory Status', 
        icon: Package,
        visible: true 
    },
    { 
        id: AppView.NLC_UPLOAD, 
        label: 'Manage NLC', 
        icon: FileSpreadsheet,
        visible: true 
    },
    { 
        id: AppView.PURCHASE_ORDERS, 
        label: userRole === 'ADMIN' ? 'Purchase Orders' : 'My Orders', 
        icon: Truck,
        visible: userRole === 'ADMIN' || hasAccess(['ACCOUNTANT', 'OWNER'])
    },
    { 
        id: AppView.SALES, 
        label: 'Sales & Invoice', 
        icon: ShoppingBag,
        visible: userRole === 'RETAILER' && hasAccess(['ACCOUNTANT', 'SALES_REP', 'OWNER'])
    },
    { 
        id: AppView.MANAGE_RETAILERS, 
        label: 'Retailer Performance', 
        icon: PieChart,
        visible: userRole === 'ADMIN' || retailerRole === 'OWNER'
    },
    { 
        id: AppView.USER_MANAGEMENT, 
        label: 'User Access (UAM)', 
        icon: Shield,
        visible: userRole === 'ADMIN'
    },
    {
        id: AppView.RETAILER_UAM, 
        label: 'Store Team',
        icon: Lock,
        visible: userRole === 'RETAILER' && retailerRole === 'OWNER'
    },
    { 
        id: AppView.AI_INSIGHTS, 
        label: 'Reto AI Assistant', 
        icon: Cpu,
        visible: true 
    },
    {
        id: AppView.SETTINGS,
        label: 'Doc Settings',
        icon: Settings,
        visible: userRole === 'ADMIN' || (userRole === 'RETAILER' && hasAccess(['ACCOUNTANT', 'OWNER']))
    }
  ];

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <aside className="w-64 bg-slate-900 text-slate-300 hidden md:flex flex-col transition-all">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-bold text-white flex items-center">
            <span className="w-8 h-8 bg-blue-600 rounded-lg mr-2 flex items-center justify-center shadow-lg shadow-blue-500/20">R</span>
            RETO AI
          </h1>
          <div className="mt-2 text-xs font-mono bg-slate-800 p-1.5 rounded text-center text-blue-200 uppercase tracking-tighter">
            {userRole === 'ADMIN' ? 'CENTRAL ADMIN' : `RETAILER • ${retailerRole.replace('_', ' ')}`}
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto scrollbar-hide">
          {navItems.filter(i => i.visible).map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onChangeView(item.id)}
                className={`w-full flex items-center px-4 py-2.5 rounded-lg transition-all ${
                  isActive 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 translate-x-1' 
                    : 'hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon size={18} className="mr-3" />
                <span className="font-medium text-sm">{item.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="p-4 border-t border-slate-800">
           <button 
             onClick={onLogout}
             className="w-full flex items-center px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-slate-800 rounded transition-colors"
           >
             <LogOut size={16} className="mr-2"/> Sign Out
           </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center px-6 justify-between shadow-sm z-10">
          <div className="md:hidden font-bold text-slate-800">RETO</div>
          
          <div className="flex-1"></div>

          <div className="flex items-center space-x-4">
            {userRole === 'RETAILER' && !currentUser?.retailerId && retailers.length > 0 && (
              <div className="flex items-center mr-4">
                <span className="text-xs font-bold text-gray-400 uppercase mr-2">Context:</span>
                <select 
                  className="bg-slate-50 border border-slate-200 text-sm rounded-md p-1 outline-none font-bold"
                  value={activeRetailerId}
                  onChange={(e) => setActiveRetailerId(e.target.value)}
                >
                  {retailers.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center space-x-2 border-l pl-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-slate-800">
                  {currentUser?.name}
                </p>
                <p className="text-[10px] font-bold text-slate-500 uppercase">{userRole === 'ADMIN' ? 'Administrator' : retailerRole.replace('_', ' ')}</p>
              </div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${userRole === 'ADMIN' ? 'bg-indigo-600' : 'bg-green-600'}`}>
                {userRole === 'ADMIN' ? <Building2 size={16}/> : <UserCircle size={16}/>}
              </div>
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-6 bg-slate-50/50">
            {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
