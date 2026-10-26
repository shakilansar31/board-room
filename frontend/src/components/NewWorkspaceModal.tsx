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
  const [currency, setCurrency] = useState(initialData?.currency || 'USD');
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
        currency: currency.trim().toUpperCase() || 'USD',
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
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/20 text-blue-400 rounded-lg">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">
                {initialData ? 'Edit Business Workspace' : 'Create New Business Workspace'}
              </h3>
              <p className="text-xs text-slate-400">Configure parameters for virtual executive advisory</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 text-xs bg-rose-950/60 border border-rose-800 text-rose-300 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Company Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Lumina Digital Inc."
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full text-xs bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Industry <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. B2B SaaS, E-Commerce, Retail"
                value={industry}
                onChange={e => setIndustry(e.target.value)}
                className="w-full text-xs bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Currency
              </label>
              <input
                type="text"
                placeholder="USD"
                value={currency}
                onChange={e => setCurrency(e.target.value)}
                maxLength={5}
                className="w-full text-xs bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-blue-500 uppercase"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Headquarters / Location
            </label>
            <input
              type="text"
              placeholder="e.g. Austin, TX (Optional)"
              value={location}
              onChange={e => setLocation(e.target.value)}
              className="w-full text-xs bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Business Description & Model <span className="text-rose-400">*</span>
            </label>
            <textarea
              placeholder="Describe what your business sells, target customers, and revenue model..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className="w-full text-xs bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-blue-500 leading-relaxed"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Strategic Goals
            </label>
            <textarea
              placeholder="e.g. Reach $100k MRR, launch new enterprise tier, cut churn below 2%..."
              value={goals}
              onChange={e => setGoals(e.target.value)}
              rows={2}
              className="w-full text-xs bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-blue-500 leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Operating Constraints & Guardrails
            </label>
            <textarea
              placeholder="e.g. Max $25k capital expenditure, team capped at 5 people, zero debt..."
              value={constraints}
              onChange={e => setConstraints(e.target.value)}
              rows={2}
              className="w-full text-xs bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-blue-500 leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              {isSubmitting ? 'Saving...' : 'Save Workspace'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
