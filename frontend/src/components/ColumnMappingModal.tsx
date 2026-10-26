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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/20 text-blue-400 rounded-lg">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Map Columns & Preview Import</h3>
              <p className="text-xs text-slate-400">File: {documentName} ({previewData?.total_rows || 0} rows detected)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
          {error && (
            <div className="flex items-center gap-2 p-3 text-xs bg-rose-950/60 border border-rose-800 text-rose-300 rounded-lg">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Mapping Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Date Column <span className="text-rose-400">*</span>
              </label>
              <select
                value={dateCol}
                onChange={(e) => setDateCol(e.target.value)}
                className="w-full text-xs bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-blue-500"
              >
                {previewData?.columns?.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Amount Column <span className="text-rose-400">*</span>
              </label>
              <select
                value={amountCol}
                onChange={(e) => setAmountCol(e.target.value)}
                className="w-full text-xs bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-blue-500"
              >
                {previewData?.columns?.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Category Column <span className="text-rose-400">*</span>
              </label>
              <select
                value={categoryCol}
                onChange={(e) => setCategoryCol(e.target.value)}
                className="w-full text-xs bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-blue-500"
              >
                {previewData?.columns?.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Flow / Kind Column (Revenue vs Expense)
              </label>
              <select
                value={kindCol}
                onChange={(e) => setKindCol(e.target.value)}
                className="w-full text-xs bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="">-- None (Use default below) --</option>
                {previewData?.columns?.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {!kindCol && (
            <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Default transaction classification if not in file:
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="radio"
                    name="defaultKind"
                    checked={defaultKind === 'expense'}
                    onChange={() => setDefaultKind('expense')}
                    className="text-blue-600 focus:ring-0 bg-slate-900 border-slate-700"
                  />
                  Operating Expense
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="radio"
                    name="defaultKind"
                    checked={defaultKind === 'revenue'}
                    onChange={() => setDefaultKind('revenue')}
                    className="text-blue-600 focus:ring-0 bg-slate-900 border-slate-700"
                  />
                  Revenue Inflow
                </label>
              </div>
            </div>
          )}

          {/* Sample Rows Table */}
          <div>
            <h4 className="text-xs font-semibold text-slate-300 mb-2">Raw File Preview (First {previewData?.preview_rows?.length || 0} rows)</h4>
            <div className="overflow-x-auto border border-slate-800 rounded-lg">
              <table className="w-full text-left text-[11px] text-slate-300">
                <thead className="bg-slate-950/80 text-slate-400 uppercase text-[9px] border-b border-slate-800">
                  <tr>
                    {previewData?.columns?.map((c) => (
                      <th key={c} className="p-2 whitespace-nowrap">{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {previewData?.preview_rows?.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/30">
                      {previewData.columns.map((c) => (
                        <td key={c} className="p-2 whitespace-nowrap">{String(row[c] ?? '')}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer Action */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition disabled:opacity-50"
            >
              {isSubmitting ? (
                <>Importing...</>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Confirm & Ingest Data
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
