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
      <div className="bg-white border-[3px] border-black rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-[8px_8px_0px_0px_#000]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b-[2.5px] border-black bg-[#BAE6FD]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white text-black border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_#000]">
              <FileSpreadsheet className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-base font-black text-black">Map Ledger Columns & Preview</h3>
              <p className="text-xs text-black font-bold">File: {documentName} ({previewData?.total_rows || 0} rows detected in ₹ INR)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-black hover:bg-black/10 border-2 border-black transition bg-white"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 bg-[#FFFDF8]">
          {error && (
            <div className="flex items-center gap-2 p-3 text-xs bg-[#FDA4AF] border-2 border-black text-black font-bold rounded-lg shadow-[2px_2px_0px_0px_#000]">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Mapping Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-black mb-1.5">
                Date Column <span className="text-rose-600">*</span>
              </label>
              <select
                value={dateCol}
                onChange={(e) => setDateCol(e.target.value)}
                className="w-full text-xs bg-white border-2 border-black rounded-lg p-2.5 text-black font-bold focus:outline-none focus:bg-yellow-50 shadow-[2px_2px_0px_0px_#000]"
              >
                {previewData?.columns?.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-black text-black mb-1.5">
                Amount (₹ INR) Column <span className="text-rose-600">*</span>
              </label>
              <select
                value={amountCol}
                onChange={(e) => setAmountCol(e.target.value)}
                className="w-full text-xs bg-white border-2 border-black rounded-lg p-2.5 text-black font-bold focus:outline-none focus:bg-yellow-50 shadow-[2px_2px_0px_0px_#000]"
              >
                {previewData?.columns?.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-black text-black mb-1.5">
                Category Column <span className="text-rose-600">*</span>
              </label>
              <select
                value={categoryCol}
                onChange={(e) => setCategoryCol(e.target.value)}
                className="w-full text-xs bg-white border-2 border-black rounded-lg p-2.5 text-black font-bold focus:outline-none focus:bg-yellow-50 shadow-[2px_2px_0px_0px_#000]"
              >
                {previewData?.columns?.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-black text-black mb-1.5">
                Cash Flow Kind (Revenue vs Expense)
              </label>
              <select
                value={kindCol}
                onChange={(e) => setKindCol(e.target.value)}
                className="w-full text-xs bg-white border-2 border-black rounded-lg p-2.5 text-black font-bold focus:outline-none focus:bg-yellow-50 shadow-[2px_2px_0px_0px_#000]"
              >
                <option value="">-- None (Use default below) --</option>
                {previewData?.columns?.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {!kindCol && (
            <div className="bg-white p-3.5 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_#000]">
              <label className="block text-xs font-black text-black mb-1.5">
                Default transaction classification if not in file:
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-xs font-bold text-black cursor-pointer">
                  <input
                    type="radio"
                    name="defaultKind"
                    checked={defaultKind === 'expense'}
                    onChange={() => setDefaultKind('expense')}
                    className="accent-black w-4 h-4 cursor-pointer"
                  />
                  Operating Expense
                </label>
                <label className="flex items-center gap-2 text-xs font-bold text-black cursor-pointer">
                  <input
                    type="radio"
                    name="defaultKind"
                    checked={defaultKind === 'revenue'}
                    onChange={() => setDefaultKind('revenue')}
                    className="accent-black w-4 h-4 cursor-pointer"
                  />
                  Revenue Inflow
                </label>
              </div>
            </div>
          )}

          {/* Sample Rows Table */}
          <div>
            <h4 className="text-xs font-black text-black mb-2">Raw File Preview (First {previewData?.preview_rows?.length || 0} rows)</h4>
            <div className="overflow-x-auto border-2 border-black rounded-xl bg-white shadow-[3px_3px_0px_0px_#000]">
              <table className="w-full text-left text-[11px] text-black">
                <thead className="bg-[#FFE600] text-black uppercase text-[10px] font-black border-b-2 border-black">
                  <tr>
                    {previewData?.columns?.map((c) => (
                      <th key={c} className="p-2.5 whitespace-nowrap">{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y border-black font-medium">
                  {previewData?.preview_rows?.map((row, idx) => (
                    <tr key={idx} className="hover:bg-yellow-50">
                      {previewData.columns.map((c) => (
                        <td key={c} className="p-2.5 whitespace-nowrap">{String(row[c] ?? '')}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer Action */}
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
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-black bg-[#FFE600] hover:bg-[#FACC15] text-black border-2 border-black shadow-[3px_3px_0px_0px_#000] hover:-translate-y-0.5 transition disabled:opacity-50"
            >
              {isSubmitting ? (
                <>Importing...</>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  Confirm & Ingest Ledger (₹ INR)
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
