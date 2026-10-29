import React, { useState } from 'react';
import { X, Check, FileSpreadsheet, AlertTriangle } from 'lucide-react';

interface ColumnMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
  documentName: string;
  previewData: {
    columns: string[];
    total_rows: number;
    preview_rows: Record<string, unknown>[];
    suggested_mapping: {
      date_col: string;
      amount_col: string;
      category_col: string;
      kind_col?: string | null;
      default_kind?: string;
    };
  };
  onConfirmImport: (mapping: Record<string, unknown>) => Promise<void>;
}

export const ColumnMappingModal: React.FC<ColumnMappingModalProps> = ({
  isOpen,
  onClose,
  documentName,
  previewData,
  onConfirmImport
}) => {
  const [dateCol, setDateCol] = useState(previewData?.suggested_mapping?.date_col || previewData?.columns?.[0] || '');
  const [amountCol, setAmountCol] = useState(previewData?.suggested_mapping?.amount_col || previewData?.columns?.[1] || '');
  const [categoryCol, setCategoryCol] = useState(previewData?.suggested_mapping?.category_col || previewData?.columns?.[2] || '');
  const [kindCol, setKindCol] = useState(previewData?.suggested_mapping?.kind_col || '');
  const [defaultKind, setDefaultKind] = useState<'revenue' | 'expense'>(
    (previewData?.suggested_mapping?.default_kind as 'revenue' | 'expense') || 'expense'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!dateCol || !amountCol || !categoryCol) {
      setError('Date, Amount, and Category columns must be mapped.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onConfirmImport({
        date_col: dateCol,
        amount_col: amountCol,
        category_col: categoryCol,
        kind_col: kindCol || null,
        default_kind: defaultKind
      });
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Import failed.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Map Ledger Columns & Preview</h3>
              <p className="text-xs text-slate-500">File: {documentName} ({previewData?.total_rows || 0} records detected)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Mapping Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Date Column <span className="text-rose-500">*</span>
              </label>
              <select
                value={dateCol}
                onChange={(e) => setDateCol(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 font-medium focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500 transition"
              >
                {previewData?.columns?.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Amount (₹ INR) Column <span className="text-rose-500">*</span>
              </label>
              <select
                value={amountCol}
                onChange={(e) => setAmountCol(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 font-medium focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500 transition"
              >
                {previewData?.columns?.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Category Column <span className="text-rose-500">*</span>
              </label>
              <select
                value={categoryCol}
                onChange={(e) => setCategoryCol(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 font-medium focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500 transition"
              >
                {previewData?.columns?.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Transaction Type Column (Optional)
              </label>
              <select
                value={kindCol}
                onChange={(e) => setKindCol(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 font-medium focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500 transition"
              >
                <option value="">-- No Type Column in CSV --</option>
                {previewData?.columns?.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {!kindCol && (
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
              <label className="block font-medium text-slate-700 mb-1.5">
                Default Type for Ingested Transactions:
              </label>
              <div className="flex items-center gap-4 text-xs font-medium text-slate-800">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="defaultKind"
                    checked={defaultKind === 'expense'}
                    onChange={() => setDefaultKind('expense')}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Expense (Operating Outflow)</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="defaultKind"
                    checked={defaultKind === 'revenue'}
                    onChange={() => setDefaultKind('revenue')}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Revenue (Cash Inflow)</span>
                </label>
              </div>
            </div>
          )}

          {/* Raw CSV Preview Table */}
          <div>
            <h4 className="text-xs font-semibold text-slate-800 mb-2">First 3 Rows Preview:</h4>
            <div className="overflow-x-auto border border-slate-200 rounded-lg max-h-40">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-700 text-[10px] uppercase font-semibold border-b border-slate-200">
                  <tr>
                    {previewData?.columns?.map((c) => (
                      <th key={c} className="p-2 whitespace-nowrap">{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y border-slate-100">
                  {previewData?.preview_rows?.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      {previewData.columns.map((c) => (
                        <td key={c} className="p-2 whitespace-nowrap text-slate-600">{String(row[c] ?? '-')}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Importing...' : 'Validate & Import'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
