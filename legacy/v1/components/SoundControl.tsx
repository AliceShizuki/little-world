import { useEffect, useRef, useState } from 'react';
import { useWorld } from '../state/WorldContext';

/**
 * 右上角的小型声音控制：点击图标开关声音，悬停 / 轻点后展开音量条。
 */
export function SoundControl() {
  const { state, setSoundOn, setVolume, sfx } = useWorld();
  const [open, setOpen] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const toggle = () => {
    const next = !state.soundOn;
    setSoundOn(next);
    setOpen(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOpen(false), 4200);
    if (next) sfx('pop');
  };

  return (
    <div className={`sound-control ${open ? 'open' : ''} ${state.soundOn ? '' : 'muted'}`}>
      <div className="sound-slider">
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(state.volume * 100)}
          onChange={(e) => setVolume(Number(e.target.value) / 100)}
          aria-label="音量"
        />
      </div>
      <button className="sound-btn" onClick={toggle} aria-label={state.soundOn ? '关闭声音' : '打开声音'}>
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
          <path
            d="M4 9.5h3.2L12 5.6v12.8L7.2 14.5H4z"
            fill="currentColor"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
          {state.soundOn ? (
            <>
              <path d="M15.4 9.2a4 4 0 0 1 0 5.6" stroke="currentColor" strokeWidth="1.7" fill="none" strokeLinecap="round" />
              <path d="M17.9 6.8a7.4 7.4 0 0 1 0 10.4" stroke="currentColor" strokeWidth="1.7" fill="none" strokeLinecap="round" />
            </>
          ) : (
            <path d="M16 9.5l4.6 5M20.6 9.5L16 14.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" fill="none" />
          )}
        </svg>
      </button>
    </div>
  );
}
