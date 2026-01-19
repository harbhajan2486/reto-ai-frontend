
import React from 'react';
import { InvoiceSettings } from '../types';
import { Save, Building, FileText, Image as ImageIcon } from 'lucide-react';

interface DocumentSettingsProps {
  settings: InvoiceSettings;
  onSave: (settings: InvoiceSettings) => void;
}

const DocumentSettings: React.FC<DocumentSettingsProps> = ({ settings, onSave }) => {
  const [formData, setFormData] = React.useState<InvoiceSettings>(settings);

  const handleChange = (field: keyof InvoiceSettings, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    onSave(formData);
    alert('Document settings saved successfully!');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center space-x-3 mb-2">
        <div className="p-3 bg-blue-100 rounded-full text-blue-600">
          <FileText size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Document Settings</h2>
          <p className="text-gray-500 text-sm">Configure the header, footer, and branding for your Invoices and Purchase Orders.</p>
        </div>
      </div>

      <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-100">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
          {/* Left Column: Branding & Identity */}
          <div className="space-y-4">
            <h3 className="font-bold text-gray-700 border-b pb-2 flex items-center"><Building size={16} className="mr-2"/> Company Details</h3>
            
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Company / Store Name</label>
              <input 
                type="text" 
                value={formData.companyName}
                onChange={e => handleChange('companyName', e.target.value)}
                className="w-full p-2 border border-gray-600 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-gray-700 text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">GSTIN</label>
              <input 
                type="text" 
                value={formData.gstin}
                onChange={e => handleChange('gstin', e.target.value)}
                className="w-full p-2 border border-gray-600 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-gray-700 text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Address Line 1</label>
              <input 
                type="text" 
                value={formData.addressLine1}
                onChange={e => handleChange('addressLine1', e.target.value)}
                className="w-full p-2 border border-gray-600 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-gray-700 text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Address Line 2</label>
              <input 
                type="text" 
                value={formData.addressLine2}
                onChange={e => handleChange('addressLine2', e.target.value)}
                className="w-full p-2 border border-gray-600 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-gray-700 text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">City, State, Zip</label>
              <input 
                type="text" 
                value={formData.cityStateZip}
                onChange={e => handleChange('cityStateZip', e.target.value)}
                className="w-full p-2 border border-gray-600 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-gray-700 text-white"
              />
            </div>

            <div>
               <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Bank Details</label>
               <textarea 
                  value={formData.bankDetails}
                  onChange={e => handleChange('bankDetails', e.target.value)}
                  className="w-full p-2 border border-gray-600 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none h-20 bg-gray-700 text-white"
                  placeholder="Bank Name, A/C No, IFSC..."
               />
            </div>
          </div>

          {/* Right Column: Logo & Terms */}
          <div className="space-y-4">
            <h3 className="font-bold text-gray-700 border-b pb-2 flex items-center"><ImageIcon size={16} className="mr-2"/> Branding & Terms</h3>
            
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Logo URL</label>
              <input 
                type="text" 
                value={formData.logoUrl}
                onChange={e => handleChange('logoUrl', e.target.value)}
                className="w-full p-2 border border-gray-600 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-gray-700 text-white"
                placeholder="https://example.com/logo.png"
              />
              <div className="mt-2 h-16 w-full bg-gray-50 border border-dashed rounded flex items-center justify-center text-gray-400 overflow-hidden">
                 {formData.logoUrl ? <img src={formData.logoUrl} alt="Logo Preview" className="h-full object-contain"/> : 'Logo Preview'}
              </div>
            </div>

            <div>
               <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Terms & Conditions</label>
               <textarea 
                  value={formData.termsAndConditions}
                  onChange={e => handleChange('termsAndConditions', e.target.value)}
                  className="w-full p-2 border border-gray-600 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none h-32 bg-gray-700 text-white"
               />
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t flex justify-end">
            <button 
                onClick={handleSave}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-bold flex items-center shadow-lg transition-transform active:scale-95"
            >
                <Save size={20} className="mr-2"/> Save Settings
            </button>
        </div>
      </div>
    </div>
  );
};

export default DocumentSettings;
