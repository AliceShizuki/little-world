import { useEffect, useRef, useState } from 'react';
import { useWorld } from '../state/WorldContext';

/**
 * 家长设置入口
 *  - 长按齿轮 1.2 秒才打开，避免幼儿误触
 *  - 可调声音、昼夜、天气，重置世界，查看操作说明
 */
export function Settings() {
  const { state, setSoundOn, setVolume, setTimeOfDay, setWeather, resetWorld } = useWorld();
  const [panel, setPanel] = useState(false);
  const [holding, setHolding] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const holdTimer = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef(0);

  const clearHold = () => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setHolding(false);
  };

  useEffect(() => () => clearHold(), []);

  const startHold = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    startRef.current = performance.now();
    setHolding(true);
    const tick = () => {
      const p = Math.min(1, (performance.now() - startRef.current) / 1200);
      document.documentElement.style.setProperty('--hold-progress', String(p));
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    holdTimer.current = window.setTimeout(() => {
      setPanel(true);
      setHolding(false);
      document.documentElement.style.setProperty('--hold-progress', '0');
    }, 1200);
  };

  return (
    <>
      <button
        className={`gear-btn ${holding ? 'holding' : ''}`}
        onPointerDown={startHold}
        onPointerUp={clearHold}
        onPointerLeave={clearHold}
        onPointerCancel={clearHold}
        aria-label="家长设置（长按打开）"
        title="长按打开家长设置"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
          <path
            d="M12 8.6a3.4 3.4 0 1 0 0 6.8 3.4 3.4 0 0 0 0-6.8Zm8.2 3.4c0-.5-.06-1-.16-1.47l1.5-1.13-1.6-2.77-1.75.68a7.9 7.9 0 0 0-2.55-1.48L15.4 4h-3.2l-.24 1.83a7.9 7.9 0 0 0-2.55 1.48L7.66 6.6 6.06 9.37l1.5 1.13a8.4 8.4 0 0 0 0 2.94L6.06 14.6l1.6 2.77 1.75-.68a7.9 7.9 0 0 0 2.55 1.48L12.2 20h3.2l.24-1.83a7.9 7.9 0 0 0 2.55-1.48l1.75.68 1.6-2.77-1.5-1.13c.1-.47.16-.96.16-1.47Z"
            fill="currentColor"
            opacity="0.85"
          />
        </svg>
        <span className="hold-ring" />
      </button>

      {panel && (
        <div className="panel-backdrop" onPointerDown={() => setPanel(false)}>
          <div className="panel" onPointerDown={(e) => e.stopPropagation()}>
            <header>
              <h2>家长设置</h2>
              <button className="close" onClick={() => setPanel(false)} aria-label="关闭">
                ✕
              </button>
            </header>

            <div className="panel-body">
              <section>
                <div className="row">
                  <span>世界声音</span>
                  <button
                    className={`switch ${state.soundOn ? 'on' : ''}`}
                    onClick={() => setSoundOn(!state.soundOn)}
                    aria-pressed={state.soundOn}
                  >
                    <span />
                  </button>
                </div>
                <div className="row">
                  <span>音量</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(state.volume * 100)}
                    onChange={(e) => setVolume(Number(e.target.value) / 100)}
                    aria-label="音量"
                  />
                </div>
              </section>

              <section>
                <p className="label">时间</p>
                <div className="segments">
                  <button className={state.timeOfDay === 'day' ? 'active' : ''} onClick={() => setTimeOfDay('day')}>
                    白天
                  </button>
                  <button className={state.timeOfDay === 'night' ? 'active' : ''} onClick={() => setTimeOfDay('night')}>
                    夜晚
                  </button>
                </div>
              </section>

              <section>
                <p className="label">天气</p>
                <div className="segments">
                  <button className={state.weather === 'clear' ? 'active' : ''} onClick={() => setWeather('clear')}>
                    晴天
                  </button>
                  <button className={state.weather === 'rain' ? 'active' : ''} onClick={() => setWeather('rain')}>
                    雨天
                  </button>
                </div>
              </section>

              <section>
                <p className="label">操作说明</p>
                <ul className="tips">
                  <li>轻点太阳、云、树、花、房子和小动物，都会有回应。</li>
                  <li>云朵、果实、胡萝卜、种子和小船都可以拖动。</li>
                  <li>轻点深色雨云会下雨，轻点月亮会入夜；夜晚再点月亮回到白天。</li>
                  <li>把种子拖到草地上，再点一下土坑浇水，就会长出一株植物。</li>
                  <li>把胡萝卜拖到小兔子嘴边，它会吃掉。</li>
                  <li>孩子的种植、天气、昼夜和声音设置会自动保存在本机。</li>
                </ul>
              </section>

              <section>
                <p className="label">重置</p>
                {confirmReset ? (
                  <div className="confirm">
                    <p>确定要重置整个世界吗？种下的植物会被清除。</p>
                    <div className="confirm-actions">
                      <button className="ghost" onClick={() => setConfirmReset(false)}>
                        取消
                      </button>
                      <button
                        className="danger"
                        onClick={() => {
                          resetWorld();
                          setConfirmReset(false);
                          setPanel(false);
                        }}
                      >
                        确认重置
                      </button>
                    </div>
                  </div>
                ) : (
                  <button className="ghost wide" onClick={() => setConfirmReset(true)}>
                    重置世界
                  </button>
                )}
              </section>

              <p className="footnote">Little World · 小小世界 — 没有分数，没有任务，只有探索。</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
