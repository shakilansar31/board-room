import React, { useState } from 'react';
import { X, Building2, Check } from 'lucide-react';
import { Business } from '../lib/types';

interface NewWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (businessData: Partial<Business>) => Promise<void>;
  initialData?: Business | null;
}

export const NewWorkspaceModal: React.FC<NewWorkspaceModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData
}) => {
  const [name, setName] = useState(initialData?.name || '');
  const [industry, setIndustry] = useState(initialData?.industry || '');
  const [location, setLocation] = useState(initialData?.location || '');
  const [currency, setCurrency] = useState(initialData?.currency || 'INR');
  const [description, setDescription] = useState(initialData?.description || '');
  const [goals, setGoals] = useState(initialData?.goals || '');
  const [constraints, setConstraints] = useState(initialData?.constraints || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !industry.trim() || !description.trim()) {
      setError('Name, industry, and business description are required.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSave({
        name: name.trim(),
        industry: industry.trim(),
        location: location.trim(),
        currency: currency.trim().toUpperCase() || 'INR',
        description: description.trim(),
        goals: goals.trim(),
        constraints: constraints.trim()
      });
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save business workspace.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-white border-[3px] border-black rounded-2xl w-full max-w-lg overflow-hidden shadow-[8px_8px_0px_0px_#000] flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b-[2.5px] border-black bg-[#FFE600]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white text-black border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_#000]">
              <Building2 className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-base font-black text-black">
                {initialData ? 'Edit Workspace' : 'Create Business Workspace'}
              </h3>
              <p className="text-xs text-black font-bold">Configure parameters for virtual boardroom advisory</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-black hover:bg-black/10 border-2 border-black transition bg-white"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto bg-[#FFFDF8]">
          {error && (
            <div className="p-3 text-xs bg-[#FDA4AF] border-2 border-black text-black font-bold rounded-lg shadow-[2px_2px_0px_0px_#000]">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-black text-black mb-1">
              Company Name <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Apex Hardware Retail Pvt Ltd"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full text-xs bg-white border-2 border-black rounded-lg p-2.5 text-black font-bold focus:outline-none focus:bg-yellow-50 shadow-[2px_2px_0px_0px_#000]"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-black text-black mb-1">
                Industry <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. D2C E-Commerce, B2B SaaS, Retail"
                value={industry}
                onChange={e => setIndustry(e.target.value)}
                className="w-full text-xs bg-white border-2 border-black rounded-lg p-2.5 text-black font-bold focus:outline-none focus:bg-yellow-50 shadow-[2px_2px_0px_0px_#000]"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-black text-black mb-1">
                Currency
              </label>
              <input
                type="text"
                placeholder="INR"
                value={currency}
                onChange={e => setCurrency(e.target.value)}
                maxLength={5}
                className="w-full text-xs bg-white border-2 border-black rounded-lg p-2.5 text-black font-black uppercase focus:outline-none focus:bg-yellow-50 shadow-[2px_2px_0px_0px_#000]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-black mb-1">
              Location / City
            </label>
            <input
              type="text"
              placeholder="e.g. Bengaluru, Karnataka (Optional)"
              value={location}
              onChange={e => setLocation(e.target.value)}
              className="w-full text-xs bg-white border-2 border-black rounded-lg p-2.5 text-black font-bold focus:outline-none focus:bg-yellow-50 shadow-[2px_2px_0px_0px_#000]"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-black mb-1">
              Business Description & Model <span className="text-rose-600">*</span>
            </label>
            <textarea
              placeholder="Describe what your business sells, customer profiles, and pricing structure..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className="w-full text-xs bg-white border-2 border-black rounded-lg p-2.5 text-black font-medium leading-relaxed focus:outline-none focus:bg-yellow-50 shadow-[2px_2px_0px_0px_#000]"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-black text-black mb-1">
              Strategic Goals
            </label>
            <textarea
              placeholder="e.g. Reach ₹50 Lakhs monthly GMV, reduce CAC below ₹400..."
              value={goals}
              onChange={e => setGoals(e.target.value)}
              rows={2}
              className="w-full text-xs bg-white border-2 border-black rounded-lg p-2.5 text-black font-medium leading-relaxed focus:outline-none focus:bg-yellow-50 shadow-[2px_2px_0px_0px_#000]"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-black mb-1">
              Operating Constraints & Guardrails
            </label>
            <textarea
              placeholder="e.g. Monthly ad spend ceiling ₹2 Lakhs, maximum 6-month payback..."
              value={constraints}
              onChange={e => setConstraints(e.target.value)}
              rows={2}
              className="w-full text-xs bg-white border-2 border-black rounded-lg p-2.5 text-black font-medium leading-relaxed focus:outline-none focus:bg-yellow-50 shadow-[2px_2px_0px_0px_#000]"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t-2 border-black">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-bold text-black hover:underline"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-xs font-black bg-[#FFE600] hover:bg-[#FACC15] text-black border-2 border-black shadow-[3px_3px_0px_0px_#000] hover:-translate-y-0.5 transition disabled:opacity-50"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              {isSubmitting ? 'Saving...' : 'Save Workspace'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
