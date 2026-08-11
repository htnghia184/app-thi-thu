import React, { useEffect, useState, useCallback } from 'react';
import {
  Loader2, RefreshCw, ArrowLeft, Trash2, Database, Table2,
  AlertTriangle, Search, X, Info,
} from 'lucide-react';
import {
  ADMIN_DB_TABLES, fetchAdminTableCounts, fetchAdminTableRows,
  deleteAdminTableRow, clearAdminTable,
} from '../lib/supabaseService';

export const AdminDatabase: React.FC = () => {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const loadCounts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const c = await fetchAdminTableCounts();
      setCounts(c);
    } catch (err: any) {
      console.error('Failed to load table counts:', err);
      setError('Không thể tải thống kê bảng. Kiểm tra kết nối Supabase.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  if (selected) {
    return (
      <TableView
        tableName={selected}
        onBack={() => setSelected(null)}
        onCountChange={(delta) => setCounts(prev => ({ ...prev, [selected]: Math.max(0, (prev[selected] || 0) + delta) }))}
        clearConfirm={confirmClear}
        setClearConfirm={setConfirmClear}
      />
    );
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-indigo-900 dark:text-gray-100 flex items-center gap-2">
            <Database size={24} className="text-indigo-500" />
            Database
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Quản lý dữ liệu Supabase trực quan — xem, xóa dòng, dọn dẹp bảng.
          </p>
        </div>
        <button
          onClick={loadCounts}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-all text-sm"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-4 mb-4 rounded-lg text-sm font-medium bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
          {error}
        </div>
      )}

      {loading ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 flex justify-center">
          <Loader2 size={28} className="animate-spin text-indigo-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {ADMIN_DB_TABLES.map(t => (
            <button
              key={t.name}
              onClick={() => setSelected(t.name)}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/30 p-5 text-left hover:shadow-xl hover:-translate-y-0.5 transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="inline-flex p-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                  <Table2 size={18} />
                </div>
                {t.deletable ? (
                  <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400">
                    có thể xóa
                  </span>
                ) : (
                  <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                    chỉ xem
                  </span>
                )}
              </div>
              <div className="text-xl font-bold text-gray-900 dark:text-gray-100">{counts[t.name] ?? 0}</div>
              <div className="text-xs md:text-sm font-medium text-gray-600 dark:text-gray-400 mt-0.5">{t.label}</div>
              <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 font-mono">{t.name}</div>
              {t.note && (
                <div className="mt-2 flex items-start gap-1 text-[11px] text-amber-600 dark:text-amber-400">
                  <Info size={11} className="flex-shrink-0 mt-0.5" />
                  {t.note}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ==================== Table view ====================

interface TableViewProps {
  tableName: string;
  onBack: () => void;
  onCountChange: (delta: number) => void;
  clearConfirm: boolean;
  setClearConfirm: (v: boolean) => void;
}

const TableView: React.FC<TableViewProps> = ({ tableName, onBack, onCountChange, clearConfirm, setClearConfirm }) => {
  const info = ADMIN_DB_TABLES.find(t => t.name === tableName);
  const [rows, setRows] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchAdminTableRows(tableName, 200);
      setRows(data);
      const cols: string[] = [];
      for (const row of data) {
        for (const key of Object.keys(row)) {
          if (!cols.includes(key)) cols.push(key);
        }
      }
      setColumns(cols);
    } catch (err: any) {
      console.error('Failed to load table rows:', err);
      setError('Không thể tải dữ liệu bảng ' + tableName + '.');
    } finally {
      setLoading(false);
    }
  }, [tableName]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = search
    ? rows.filter(r => JSON.stringify(r).toLowerCase().includes(search.toLowerCase()))
    : rows;

  const handleDeleteRow = async (rowId: string) => {
    if (!window.confirm(`Xóa dòng ${rowId} khỏi bảng ${tableName}?`)) return;
    setBusy(true);
    try {
      await deleteAdminTableRow(tableName, rowId);
      setRows(prev => prev.filter(r => r.id !== rowId));
      onCountChange(-1);
    } catch (err: any) {
      alert('Không thể xóa dòng: ' + (err?.message || err));
    } finally {
      setBusy(false);
    }
  };

  const handleClear = async () => {
    if (!clearConfirm) {
      setClearConfirm(true);
      return;
    }
    setBusy(true);
    try {
      await clearAdminTable(tableName);
      setRows([]);
      onCountChange(-rows.length);
      setClearConfirm(false);
    } catch (err: any) {
      alert('Không thể xóa toàn bộ: ' + (err?.message || err));
    } finally {
      setBusy(false);
    }
  };

  const formatCell = (value: any) => {
    if (value === null || value === undefined) return <span className="text-gray-400">NULL</span>;
    if (typeof value === 'object') {
      let str = '';
      try { str = JSON.stringify(value); } catch { str = String(value); }
      return <span className="text-purple-600 dark:text-purple-300">{truncate(str, 60)}</span>;
    }
    if (typeof value === 'boolean') return <span>{value ? 'true' : 'false'}</span>;
    return <span>{truncate(String(value), 80)}</span>;
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
        <div>
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline mb-2"
          >
            <ArrowLeft size={16} /> Quay lại danh sách bảng
          </button>
          <h2 className="text-2xl font-bold text-indigo-900 dark:text-gray-100 flex items-center gap-2">
            <Table2 size={22} className="text-indigo-500" />
            {info?.label || tableName}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {rows.length} dòng{rows.length === 200 ? ' (tối đa 200 dòng hiển thị)' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={load}
            disabled={loading || busy}
            className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-all text-sm"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          {info?.deletable && (
            <button
              onClick={handleClear}
              disabled={busy || rows.length === 0}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg font-semibold transition-all text-sm ${
                clearConfirm
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30'
              } disabled:opacity-40`}
            >
              <Trash2 size={15} />
              {clearConfirm ? 'Chắc chắn xóa hết?' : 'Xóa toàn bộ'}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 mb-4 rounded-lg text-sm font-medium bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
          {error}
        </div>
      )}

      <div className="relative max-w-md mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Tìm trong bảng (JSON)..."
          className="w-full pl-9 pr-9 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-300 dark:bg-gray-700 dark:text-gray-200 outline-none transition-all text-sm"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X size={15} />
          </button>
        )}
      </div>

      {loading ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 flex justify-center">
          <Loader2 size={28} className="animate-spin text-indigo-600" />
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center">
          <Database size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Bảng trống — không có dữ liệu.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center">
          <AlertTriangle size={36} className="mx-auto text-amber-400 mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Không có dòng nào khớp từ khóa "{search}".</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px]">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                  <th className="text-left py-3 px-4 text-indigo-900 dark:text-gray-100 font-semibold text-sm">#</th>
                  {columns.map(col => (
                    <th key={col} className="text-left py-3 px-4 text-indigo-900 dark:text-gray-100 font-semibold text-sm font-mono">
                      {col}
                    </th>
                  ))}
                  {info?.deletable && (
                    <th className="text-right py-3 px-4 text-indigo-900 dark:text-gray-100 font-semibold text-sm">Xóa</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, index) => (
                  <tr key={row.id || index} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="py-2.5 px-4 text-gray-500 dark:text-gray-400 text-sm whitespace-nowrap">{index + 1}</td>
                    {columns.map(col => (
                      <td key={col} className="py-2.5 px-4 text-sm text-gray-700 dark:text-gray-300 max-w-[240px]">
                        <div className="truncate">{formatCell(row[col])}</div>
                      </td>
                    ))}
                    {info?.deletable && (
                      <td className="py-2.5 px-4 text-right">
                        <button
                          onClick={() => handleDeleteRow(row.id)}
                          disabled={busy}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors disabled:opacity-40"
                          title="Xóa dòng"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

const truncate = (str: string, max: number) => {
  if (str.length <= max) return str;
  return str.slice(0, max) + '…';
};
