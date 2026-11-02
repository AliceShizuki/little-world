import { useEffect, useRef } from 'react';

/**
 * 自主行为循环：使用 setTimeout 串行调度（而不是 setInterval），
 * 组件卸载 / 页面隐藏 / 被禁用时立即清理，避免定时器堆积。
 *
 * @param interval 毫秒区间 [min, max]
 * @param action 每次触发的行为
 */
export function useBehaviour(
  interval: [number, number],
  action: () => void,
  enabled = true,
): void {
  const actionRef = useRef(action);
  actionRef.current = action;
  const rangeRef = useRef(interval);
  rangeRef.current = interval;

  useEffect(() => {
    if (!enabled) return;
    let timer = 0;
    let cancelled = false;

    const schedule = () => {
      const [min, max] = rangeRef.current;
      const delay = min + Math.random() * Math.max(0, max - min);
      timer = window.setTimeout(() => {
        if (cancelled) return;
        if (!document.hidden) actionRef.current();
        schedule();
      }, delay);
    };
    schedule();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [enabled]);
}

/** 页面重新可见时触发一次回调，用于恢复被暂停的表现 */
export function useOnVisible(cb: () => void): void {
  const ref = useRef(cb);
  ref.current = cb;
  useEffect(() => {
    const onVisible = () => {
      if (!document.hidden) ref.current();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);
}
