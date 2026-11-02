import { useEffect, useRef, useState } from 'react';
import { Hud } from './v3/Hud';
import { Stage } from './v3/Stage';
import { WorldMap } from './v3/WorldMap';
import { WorldProvider } from './v3/store';
import { audio } from './systems/audioSystem';
import './styles/v3.css';

const HINT_KEY = 'little-world.hint.v3';

/**
 * 进入网页就是世界本身：没有开始菜单、没有登录、没有加载页。
 * 界面只剩三样东西——地图、声音、家长入口（长按）。
 */
export default function App() {
  const stageRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [mapOpen, setMapOpen] = useState(false);
  const [hint, setHint] = useState(false);

  // 测量舞台（含旋转屏幕、窗口缩放）
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener('orientationchange', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('orientationchange', measure);
    };
  }, []);

  // 浏览器要求用户手势后才能出声
  useEffect(() => {
    const unlock = () => audio.unlock();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  // 第一次来，给一句温柔的话，之后不再出现
  useEffect(() => {
    let seen = false;
    try {
      seen = localStorage.getItem(HINT_KEY) === '1';
    } catch {
      seen = false;
    }
    if (seen) return;
    const show = window.setTimeout(() => setHint(true), 1000);
    const hide = window.setTimeout(() => {
      setHint(false);
      try {
        localStorage.setItem(HINT_KEY, '1');
      } catch {
        /* 忽略 */
      }
    }, 9000);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, []);

  return (
    <div className="stage" ref={stageRef}>
      {size.w > 0 && (
        <WorldProvider size={size}>
          <Stage />
          <Hud onMap={() => setMapOpen(true)} />
          {mapOpen && <WorldMap onClose={() => setMapOpen(false)} />}
          {hint && (
            <div
              className="hint"
              onPointerDown={() => {
                setHint(false);
                try {
                  localStorage.setItem(HINT_KEY, '1');
                } catch {
                  /* 忽略 */
                }
              }}
            >
              点一点，拖一拖，左右划一划，左上角是地图
            </div>
          )}
        </WorldProvider>
      )}
      <div className="paper" aria-hidden />
    </div>
  );
}
