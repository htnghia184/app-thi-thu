import { useCallback, useEffect, useRef, useState } from 'react';

/** Số lần vi phạm tối đa trước khi tự động nộp bài kỹ năng đang thi */
export const STRICT_MAX_VIOLATIONS = 3;

/**
 * Chế độ thi nghiêm ngặt (anti-cheat) cho bundle.
 * - Bắt buộc toàn màn hình (requestFullscreen); nếu thoát fullscreen → đếm vi phạm + tự bật lại
 * - Chặn mở tab / cửa sổ mới (window.open) và phát hiện đổi tab / mất focus (visibilitychange / blur)
 * - Chặn sao chép (Ctrl+C/V/X), in (Ctrl+P), xem mã nguồn (Ctrl+U), lưu trang (Ctrl+S), chuột phải
 * - Cảnh báo trước khi rời trang (beforeunload)
 * - Sau STRICT_MAX_VIOLATIONS lần vi phạm → gọi onLimitReached() để tự nộp bài
 *
 * Lưu ý: trình duyệt không thể chặn 100% (Ctrl+T, chuột giữa...) — chỉ phát hiện & ghi nhận được.
 */
export function useStrictMode(onLimitReached: () => void) {
  const [active, setActive] = useState(false);
  const [violations, setViolations] = useState(0);
  const [warning, setWarning] = useState<string | null>(null);

  const activeRef = useRef(false);
  const violationsRef = useRef(0);
  const onLimitReachedRef = useRef(onLimitReached);
  onLimitReachedRef.current = onLimitReached;

  // Lưu các timer retry fullscreen để dọn khi stop/unmount
  const timersRef = useRef<number[]>([]);
  const clearTimers = () => {
    timersRef.current.forEach(t => window.clearTimeout(t));
    timersRef.current = [];
  };

  /**
   * Bắt buộc toàn màn hình, retry nhiều lần vì một số trình duyệt từ chối
   * requestFullscreen ngay sau khi user vừa thoát (Esc).
   */
  const forceFullscreen = useCallback((attempts = 5, intervalMs = 400) => {
    if (!activeRef.current) return;
    const tryOnce = (remaining: number) => {
      if (!activeRef.current) return;
      try {
        const el = document.documentElement as any;
        if (!document.fullscreenElement && typeof el.requestFullscreen === 'function') {
          const p = el.requestFullscreen();
          if (p && p.catch) p.catch(() => {});
        }
      } catch {
        // iOS Safari / trình duyệt không hỗ trợ fullscreen element → bỏ qua, vẫn phát hiện đổi tab
      }
      if (remaining > 1 && !document.fullscreenElement) {
        timersRef.current.push(window.setTimeout(() => tryOnce(remaining - 1), intervalMs));
      }
    };
    tryOnce(attempts);
  }, []);

  const exitFullscreen = useCallback(() => {
    try {
      if (document.fullscreenElement && typeof document.exitFullscreen === 'function') {
        const p = document.exitFullscreen();
        if (p && p.catch) p.catch(() => {});
      }
    } catch {
      // noop
    }
  }, []);

  const reportViolation = useCallback((reason: string) => {
    if (!activeRef.current) return;
    violationsRef.current += 1;
    setViolations(violationsRef.current);
    setWarning(reason);
    // Tự bật lại toàn màn hình ngay (kèm retry)
    forceFullscreen();
    if (violationsRef.current >= STRICT_MAX_VIOLATIONS) {
      activeRef.current = false;
      setActive(false);
      onLimitReachedRef.current();
    }
  }, [forceFullscreen]);

  useEffect(() => {
    if (!active) return;

    const onFullscreenChange = () => {
      if (!document.fullscreenElement) {
        reportViolation('Bạn đã thoát chế độ toàn màn hình');
      }
    };
    const onVisibilityChange = () => {
      if (document.hidden) {
        reportViolation('Bạn đã chuyển sang tab / ứng dụng khác');
      }
    };
    const onWindowBlur = () => {
      reportViolation('Cửa sổ làm bài không được giữ trạng thái ưu tiên (đổi tab / mở cửa sổ mới / mất focus)');
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && ['c', 'v', 'x', 'p', 'u', 's'].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
    };
    const onContextMenu = (e: MouseEvent) => e.preventDefault();
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (activeRef.current) e.preventDefault();
    };
    const origOpen = window.open;
    window.open = ((..._args: any[]) => {
      reportViolation('Bạn đã cố mở tab / cửa sổ mới');
      return null;
    }) as typeof window.open;

    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('visibilitychange', onVisibilityChange);
    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('contextmenu', onContextMenu);
    window.addEventListener('blur', onWindowBlur);
    window.addEventListener('beforeunload', onBeforeUnload);

    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('contextmenu', onContextMenu);
      window.removeEventListener('blur', onWindowBlur);
      window.removeEventListener('beforeunload', onBeforeUnload);
      window.open = origOpen;
    };
  }, [active, reportViolation]);

  const start = useCallback(() => {
    activeRef.current = true;
    violationsRef.current = 0;
    setViolations(0);
    setWarning(null);
    setActive(true);
    forceFullscreen();
  }, [forceFullscreen]);

  const stop = useCallback(() => {
    activeRef.current = false;
    clearTimers();
    setActive(false);
    setWarning(null);
    exitFullscreen();
  }, [exitFullscreen]);

  // Dọn timer nếu component unmount giữa chừng
  useEffect(() => () => clearTimers(), []);

  return { active, violations, warning, setWarning, start, stop, maxViolations: STRICT_MAX_VIOLATIONS };
}
