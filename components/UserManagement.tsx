
import React, { useState } from 'react';
import { AllowedUser, RetailerProfile, UserRole } from '../types';
import { ShieldCheck, Plus, Trash2, Mail, Users, Building2 } from 'lucide-react';

interface UserManagementProps {
  allowedUsers: AllowedUser[];
  onAddUser: (user: AllowedUser) => void;
  onRemoveUser: (email: string) => void;
  retailers: RetailerProfile[];
}

const UserManagement: React.FC<UserManagementProps> = ({ allowedUsers, onAddUser, onRemoveUser, retailers }) => {
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('RETAILER');
  const [selectedRetailerId, setSelectedRetailerId] = useState('');
  const [error, setError] = useState('');

  const handleAdd = () => {
    setError('');
    if (!newEmail) {
      setError('Email is required');
      return;
    }
    if (newRole === 'RETAILER' && !selectedRetailerId) {
      setError('Please select a Retailer ID to link this user to.');
      return;
    }
    if (allowedUsers.find(u => u.email.toLowerCase() === newEmail.toLowerCase())) {
        setError('User already in Allowed List.');
        return;
    }

    const newUser: AllowedUser = {
      email: newEmail,
      role: newRole,
      retailerId: newRole === 'RETAILER' ? selectedRetailerId : undefined,
      addedOn: new Date().toISOString()
    };

    onAddUser(newUser);
    setNewEmail('');
    setSelectedRetailerId('');
    alert(`Access granted to ${newEmail}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">User Access Management (UAM)</h2>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <h3 className="text-lg font-semibold mb-4 text-gray-700 flex items-center">
            <ShieldCheck className="mr-2 text-green-600"/> Grant Access
        </h3>
        <p className="text-sm text-gray-500 mb-6">
            Authorize new users to sign up. Link Retailer emails to specific Retailer Profiles.
        </p>

        <div className="flex flex-col md:flex-row gap-4 items-start md:items-end bg-slate-50 p-4 rounded-lg border border-slate-200">
             <div className="w-full md:flex-1">
                 <label className="block text-xs font-bold text-gray-500 uppercase mb-1">User Email</label>
                 <div className="relative">
                    <Mail className="absolute left-3 top-2.5 text-gray-400" size={16}/>
                    <input 
                        type="email" 
                        placeholder="e.g. storemanager@example.com"
                        className="w-full pl-9 p-2 border border-gray-600 rounded outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-gray-700 text-white placeholder-gray-400"
                        value={newEmail}
                        onChange={e => setNewEmail(e.target.value)}
                    />
                 </div>
             </div>

             <div className="w-full md:w-40">
                 <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Role</label>
                 <select 
                    className="w-full p-2 border border-gray-600 rounded outline-none text-sm bg-gray-700 text-white"
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as UserRole)}
                 >
                     <option value="RETAILER">Retailer</option>
                     <option value="ADMIN">Central Admin</option>
                 </select>
             </div>

             {newRole === 'RETAILER' && (
                 <div className="w-full md:flex-1">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Link to Retailer Profile</label>
                    <select 
                        className="w-full p-2 border border-gray-600 rounded outline-none text-sm bg-gray-700 text-white"
                        value={selectedRetailerId}
                        onChange={(e) => setSelectedRetailerId(e.target.value)}
                    >
                        <option value="">-- Select Retailer --</option>
                        {retailers.map(r => (
                            <option key={r.id} value={r.id}>{r.name} ({r.city})</option>
                        ))}
                    </select>
                 </div>
             )}

             <button 
                onClick={handleAdd}
                className="w-full md:w-auto px-6 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700 transition flex items-center justify-center"
             >
                 <Plus size={18} className="mr-2"/> Grant
             </button>
        </div>
        {error && <div className="mt-2 text-red-500 text-xs font-medium">{error}</div>}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
              <h3 className="font-semibold text-gray-700">Authorized Users</h3>
              <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">{allowedUsers.length} Users</span>
          </div>
          <table className="w-full text-left text-sm">
              <thead className="bg-gray-100 text-gray-500 uppercase text-xs">
                  <tr>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3">Linked Entity</th>
                      <th className="px-4 py-3">Added On</th>
                      <th className="px-4 py-3 text-right">Action</th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                  {allowedUsers.map((u, idx) => {
                      const linkedRetailer = retailers.find(r => r.id === u.retailerId);
                      return (
                          <tr key={idx} className="hover:bg-slate-50">
                              <td className="px-4 py-3 font-medium text-gray-800">{u.email}</td>
                              <td className="px-4 py-3">
                                  <span className={`text-xs px-2 py-1 rounded font-bold ${u.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
                                      {u.role}
                                  </span>
                              </td>
                              <td className="px-4 py-3 text-gray-600">
                                  {u.role === 'ADMIN' ? (
                                      <span className="flex items-center"><Building2 size={14} className="mr-1"/> Headquarters</span>
                                  ) : (
                                      linkedRetailer ? (
                                        <span className="flex items-center" title={linkedRetailer.name}><Users size={14} className="mr-1"/> {linkedRetailer.name}</span>
                                      ) : <span className="text-red-400">Not Linked</span>
                                  )}
                              </td>
                              <td className="px-4 py-3 text-gray-500 text-xs">{new Date(u.addedOn).toLocaleDateString()}</td>
                              <td className="px-4 py-3 text-right">
                                  <button 
                                    onClick={() => onRemoveUser(u.email)}
                                    className="text-red-400 hover:text-red-600 transition"
                                    title="Revoke Access"
                                  >
                                      <Trash2 size={16}/>
                                  </button>
                              </td>
                          </tr>
                      );
                  })}
              </tbody>
          </table>
      </div>
    </div>
  );
};

export default UserManagement;
