// ==================== Định dạng ngày giờ ====================

/** dd/mm/yyyy hh:mm (kiểu Việt Nam) */
export const formatDateTime = (d?: string | null): string => {
  if (!d) return '-';
  return new Date(d).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

/** Mmm d, yyyy, hh:mm (kiểu en-US) */
export const formatDateUS = (d?: string | null): string => {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

/** Định dạng thời lượng: "3m 25s" */
export const formatTime = (s?: number | null): string => {
  if (!s && s !== 0) return '-';
  const m = Math.floor(s / 60);
  return `${m}m ${s % 60}s`;
};

// ==================== Badge trạng thái / kỹ năng ====================

export const statusLabel = (status?: string): string => {
  const map: Record<string, string> = {
    unassigned: 'Chưa gán', assigned: 'Đã gán', graded: 'Đã chấm',
  };
  return map[status || 'unassigned'];
};

export const statusBadge = (status?: string) => {
  const map: Record<string, string> = {
    unassigned: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
    assigned: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
    graded: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${map[status || 'unassigned']}`}>
      {statusLabel(status)}
    </span>
  );
};

export const skillBadge = (skill?: string) => {
  const map: Record<string, string> = {
    reading: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    listening: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
    writing: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
    speaking: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300',
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${map[skill || 'reading']}`}>
      {skill || '-'}
    </span>
  );
};

/** Màu theo thang điểm VSTEP: ≥6.5 xanh, ≥5.0 vàng, còn lại đỏ */
export const getVstepColor = (score: number): string => {
  if (score >= 6.5) return 'text-green-600';
  if (score >= 5.0) return 'text-yellow-600';
  return 'text-red-600';
};
