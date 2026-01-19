
import React, { useState } from 'react';
import { AllowedUser, RetailerRole } from '../types';
import { Users, Plus, Trash2, Mail, Shield } from 'lucide-react';

interface RetailerUAMProps {
  allowedUsers: AllowedUser[];
  onAddUser: (user: AllowedUser) => void;
  onRemoveUser: (email: string) => void;
  currentUserEmail: string;
  retailerId: string;
}

const RetailerUAM: React.FC<RetailerUAMProps> = ({ allowedUsers, onAddUser, onRemoveUser, currentUserEmail, retailerId }) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<RetailerRole>('SALES_REP');

  // Filter users belonging to this retailer only
  const myUsers = allowedUsers.filter(u => u.retailerId === retailerId && u.role === 'RETAILER');

  const handleAdd = () => {
    if (!email) return;
    if (allowedUsers.find(u => u.email.toLowerCase() === email.toLowerCase())) {
        alert('User already exists');
        return;
    }

    const newUser: AllowedUser = {
        email,
        role: 'RETAILER',
        retailerId,
        retailerRole: role,
        addedOn: new Date().toISOString()
    };
    onAddUser(newUser);
    setEmail('');
    alert(`Added ${role} access for ${email}`);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center space-x-3 mb-6">
            <div className="p-3 bg-blue-100 rounded-full text-blue-600">
                <Users size={24}/>
            </div>
            <div>
                <h2 className="text-2xl font-bold text-gray-800">Store Team Management</h2>
                <p className="text-gray-500 text-sm">Manage access for your Floor Managers, Accountants, and Sales Reps.</p>
            </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <h3 className="font-bold text-gray-700 mb-4 flex items-center"><Plus size={16} className="mr-2"/> Add New Team Member</h3>
            <div className="flex flex-col md:flex-row gap-4 items-end bg-slate-50 p-4 rounded-lg">
                <div className="flex-1 w-full">
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Email Address</label>
                    <input 
                        type="email" 
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="w-full p-2 border border-gray-600 rounded text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-gray-700 text-white placeholder-gray-400"
                        placeholder="employee@store.com"
                    />
                </div>
                <div className="w-full md:w-64">
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Role</label>
                    <select 
                        value={role}
                        onChange={e => setRole(e.target.value as RetailerRole)}
                        className="w-full p-2 border border-gray-600 rounded text-sm outline-none bg-gray-700 text-white"
                    >
                        <option value="FLOOR_MANAGER">Floor Manager (Full Access)</option>
                        <option value="ACCOUNTANT">Accountant (PO & Invoice)</option>
                        <option value="SALES_REP">Sales Rep (Inventory & Sales)</option>
                    </select>
                </div>
                <button 
                    onClick={handleAdd}
                    className="w-full md:w-auto px-6 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700 transition"
                >
                    Add User
                </button>
            </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full text-left text-sm">
                <thead className="bg-gray-100 text-gray-500 uppercase text-xs">
                    <tr>
                        <th className="px-6 py-3">Email</th>
                        <th className="px-6 py-3">Role</th>
                        <th className="px-6 py-3">Permissions</th>
                        <th className="px-6 py-3 text-right">Action</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {myUsers.map((u, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                            <td className="px-6 py-4 font-medium text-gray-800">
                                {u.email}
                                {u.email === currentUserEmail && <span className="ml-2 text-[10px] bg-gray-200 px-2 py-0.5 rounded text-gray-600">YOU</span>}
                            </td>
                            <td className="px-6 py-4">
                                <span className={`text-xs px-2 py-1 rounded font-bold 
                                    ${u.retailerRole === 'OWNER' ? 'bg-purple-100 text-purple-700' : 
                                      u.retailerRole === 'FLOOR_MANAGER' ? 'bg-blue-100 text-blue-700' :
                                      u.retailerRole === 'ACCOUNTANT' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                    {u.retailerRole?.replace('_', ' ')}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-xs text-gray-500">
                                {u.retailerRole === 'OWNER' || u.retailerRole === 'FLOOR_MANAGER' ? 'Full Access' :
                                 u.retailerRole === 'ACCOUNTANT' ? 'Create POs, Invoices, View Reports' :
                                 'View Inventory, Create Invoice Drafts, Incentives'}
                            </td>
                            <td className="px-6 py-4 text-right">
                                {u.retailerRole !== 'OWNER' && u.email !== currentUserEmail && (
                                    <button 
                                        onClick={() => onRemoveUser(u.email)}
                                        className="text-red-400 hover:text-red-600"
                                    >
                                        <Trash2 size={16}/>
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
  );
};

export default RetailerUAM;
