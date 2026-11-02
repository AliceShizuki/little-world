/**
 * 界面层
 *
 * 顶栏三枚（地图 / 声音 / 长按的家长入口），画面左右各一枚翻页箭头。
 * 箭头不是"第四、第五个按钮"——它贴在画面边缘、半透明，是"翻页"的一部分，
 * 不是工具栏的一部分。孩子不点它也不会觉得少了什么。
 */

import { useRef, useState } from 'react';
import { REGIONS, REGION_ORDER, neighborOf } from './regions';
import { spriteOf } from './sprites';
import { useWorld } from './store';
import type { Phase, Season, Weather } from './types';

const WEATHERS: { k: Weather; label: string }[] = [
  { k: 'clear', label: '晴' },
  { k: 'cloudy', label: '阴' },
  { k: 'rain', label: '雨' },
  { k: 'snow', label: '雪' },
  { k: 'wind', label: '风' },
];

const PHASES: { k: Phase; label: string }[] = [
  { k: 'dawn', label: '日出' },
  { k: 'day', label: '白天' },
  { k: 'sunset', label: '日落' },
  { k: 'night', label: '夜晚' },
];

const SEASONS: { k: Season; label: string }[] = [
  { k: 'spring', label: '春' },
  { k: 'summer', label: '夏' },
  { k: 'autumn', label: '秋' },
  { k: 'winter', label: '冬' },
];

export function Hud({ onMap }: { onMap: () => void }) {
  const {
    region,
    meta,
    s,
    setSound,
    setVol,
    bagEnts,
    takeOut,
    reset,
    setWeather,
    setPhase,
    setSeason,
    go,
    sfx,
    eco,
    setSpeed,
  } = useWorld();

  const [panel, setPanel] = useState(false);
  const [resetArm, setResetArm] = useState(false);
  const holdRef = useRef<number | null>(null);

  const startHold = () => {
    holdRef.current = window.setTimeout(() => {
      setPanel(true);
      sfx('pop');
    }, 1100);
  };
  const endHold = () => {
    if (holdRef.current !== null) {
      clearTimeout(holdRef.current);
      holdRef.current = null;
    }
  };

  return (
    <>
      <div className="v3-topbar">
        <div className="v3-topleft">
          {/* 里层空间（地下 / 树上）多一个明确的返回入口，孩子不用猜怎么出去 */}
          {meta.parent && (
            <button
              className="v3-chip v3-back"
              onPointerDown={() => go(meta.parent!)}
              aria-label={`回到${REGIONS[meta.parent].name}`}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                <path d="M 14 5 L 7 12 L 14 19" />
              </svg>
              <span>回去</span>
            </button>
          )}

          <button className="v3-chip" onPointerDown={onMap} aria-label="打开世界地图">
          <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M 9 4 L 15 6 L 21 4 L 21 19 L 15 21 L 9 19 L 3 21 L 3 6 Z" />
            <path d="M 9 4 L 9 19 M 15 6 L 15 21" />
          </svg>
            <span>{meta.name}</span>
          </button>
        </div>

        <div className="v3-topbar-right">
          <button
            className="v3-round"
            onPointerDown={() => setSound(!s.sound)}
            aria-label={s.sound ? '关闭声音' : '打开声音'}
          >
            {s.sound ? (
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M 4 10 L 8 10 L 13 6 L 13 18 L 8 14 L 4 14 Z" />
                <path d="M 17 9 C 19 11 19 13 17 15" />
                <path d="M 19.5 6.5 C 23 10 23 14 19.5 17.5" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M 4 10 L 8 10 L 13 6 L 13 18 L 8 14 L 4 14 Z" />
                <path d="M 17 9 L 22 15 M 22 9 L 17 15" />
              </svg>
            )}
          </button>

          <button
            className="v3-round v3-gear"
            onPointerDown={startHold}
            onPointerUp={endHold}
            onPointerLeave={endHold}
            onPointerCancel={endHold}
            aria-label="家长设置（长按）"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
              <circle cx="12" cy="12" r="3.4" />
              <path d="M 12 3 L 12 6 M 12 18 L 12 21 M 3 12 L 6 12 M 18 12 L 21 12 M 5.6 5.6 L 7.8 7.8 M 16.2 16.2 L 18.4 18.4 M 18.4 5.6 L 16.2 7.8 M 7.8 16.2 L 5.6 18.4" />
            </svg>
          </button>
        </div>
      </div>

      {/*
        画面左右的两枚翻页箭头。
        里层空间（地下 / 树上 / 谷仓 / 沉船）没有"隔壁"，不显示——
        那儿出去只能靠梯子或顶栏的「回去」。
      */}
      {!meta.parent && (
        <>
          <button
            className="v3-flip v3-flip-l"
            aria-label="上一个地方"
            onPointerDown={(ev) => {
              ev.stopPropagation();
              const prev = neighborOf(region, -1);
              if (prev) go(prev);
            }}
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M 12.5 6 L 7 12 L 12.5 18" />
              <path d="M 18 6 L 12.5 12 L 18 18" opacity="0.45" />
            </svg>
          </button>
          <button
            className="v3-flip v3-flip-r"
            aria-label="下一个地方"
            onPointerDown={(ev) => {
              ev.stopPropagation();
              const next = neighborOf(region, 1);
              if (next) go(next);
            }}
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M 11.5 6 L 17 12 L 11.5 18" />
              <path d="M 6 6 L 11.5 12 L 6 18" opacity="0.45" />
            </svg>
          </button>
        </>
      )}

      <div className={`v3-bag ${bagEnts.length ? '' : 'is-empty'}`} aria-label="随身小篮子">
          <svg viewBox="0 0 60 46" className="v3-bag-art">
            <path d="M 6 16 L 54 16 L 48 44 L 12 44 Z" fill="#e0bd8c" stroke="rgba(109,90,74,0.35)" strokeWidth="2" />
            <path d="M 14 16 C 18 4 42 4 46 16" fill="none" stroke="#b98b62" strokeWidth="3.4" strokeLinecap="round" />
          </svg>
          <div className="v3-bag-items">
            {bagEnts.map((e) => (
              <button
                key={e.id}
                className="v3-bag-item"
                onPointerDown={(ev) => {
                  ev.stopPropagation();
                  takeOut(e.id, meta.focusX + (Math.random() - 0.5) * 120, REGIONS[region].groundY + 36);
                  sfx('pop');
                }}
                aria-label="取出"
              >
                <svg viewBox="-34 -40 68 48" width="42" height="30">
                  <ItemGlyph type={e.t} />
                </svg>
              </button>
            ))}
          </div>
        </div>

      {panel && (
        <div className="v3-panel-wrap" onPointerDown={(e) => e.stopPropagation()}>
          <div className="v3-panel">
            <div className="v3-panel-head">
              <strong>家长设置</strong>
              <button className="v3-panel-x" onPointerDown={() => setPanel(false)} aria-label="关闭">
                ✕
              </button>
            </div>

            <div className="v3-panel-row">
              <span>天气</span>
              <div className="v3-seg">
                {WEATHERS.map((x) => (
                  <button
                    key={x.k}
                    className={s.weather === x.k ? 'on' : ''}
                    onPointerDown={() => setWeather(x.k)}
                  >
                    {x.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="v3-panel-row">
              <span>时段</span>
              <div className="v3-seg">
                {PHASES.map((x) => (
                  <button key={x.k} className={s.phase === x.k ? 'on' : ''} onPointerDown={() => setPhase(x.k)}>
                    {x.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="v3-panel-row">
              <span>季节</span>
              <div className="v3-seg">
                {SEASONS.map((x) => (
                  <button key={x.k} className={s.season === x.k ? 'on' : ''} onPointerDown={() => setSeason(x.k)}>
                    {x.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="v3-panel-row">
              <span>模拟</span>
              <div className="v3-seg">
                {[
                  { k: 0, l: '暂停' },
                  { k: 1, l: '常速' },
                  { k: 2, l: '快' },
                  { k: 4, l: '很快' },
                ].map((x) => (
                  <button
                    key={x.k}
                    className={Math.abs(eco.speed - x.k) < 0.01 ? 'on' : ''}
                    onPointerDown={() => setSpeed(x.k)}
                  >
                    {x.l}
                  </button>
                ))}
              </div>
            </div>

            {/* 世界状态：三根小条，不铺开数据面板 */}
            <div className="v3-panel-row v3-eco">
              <span>世界</span>
              <div className="v3-eco-bars">
                {[
                  { l: '土', v: eco.soil, c: '#a8845c' },
                  { l: '水', v: eco.water, c: '#7fc4e2' },
                  { l: '肥', v: eco.organic, c: '#8fbf78' },
                ].map((b) => (
                  <div key={b.l} className="v3-eco-bar">
                    <i>{b.l}</i>
                    <span>
                      <b style={{ width: `${Math.round(b.v * 100)}%`, background: b.c }} />
                    </span>
                  </div>
                ))}
                <em>
                  第 {eco.day} 天 · {(PHASES.find((x) => x.k === s.phase) ?? PHASES[1]).label} · 世界时间{' '}
                  {Math.floor(eco.t / 60)} 分 {Math.floor(eco.t % 60)} 秒
                </em>
              </div>
            </div>

            <div className="v3-panel-row">
              <span>音量</span>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(s.vol * 100)}
                onChange={(e) => setVol(Number(e.target.value) / 100)}
                className="v3-range"
              />
            </div>

            <div className="v3-panel-row">
              <span>声音</span>
              <div className="v3-seg">
                <button className={s.sound ? 'on' : ''} onPointerDown={() => setSound(true)}>
                  开
                </button>
                <button className={!s.sound ? 'on' : ''} onPointerDown={() => setSound(false)}>
                  关
                </button>
              </div>
            </div>

            <div className="v3-panel-row">
              <span>去别的区域</span>
              <div className="v3-seg">
                {REGION_ORDER.map((r) => (
                  <button key={r} className={region === r ? 'on' : ''} onPointerDown={() => go(r)}>
                    {REGIONS[r].name}
                  </button>
                ))}
              </div>
            </div>

            <div className="v3-panel-row v3-panel-last">
              <span>世界</span>
              <button
                className={`v3-danger ${resetArm ? 'armed' : ''}`}
                onPointerDown={() => {
                  if (!resetArm) {
                    setResetArm(true);
                    window.setTimeout(() => setResetArm(false), 3200);
                    return;
                  }
                  reset();
                  setResetArm(false);
                  setPanel(false);
                }}
              >
                {resetArm ? '再点一次，确定重来' : '重置这个世界'}
              </button>
            </div>

            <p className="v3-panel-note">
              拖动的东西都可以带着走：点右下角的小篮子取出来。所有东西都会自己记住位置。
              <br />
              世界会自己往前走：下雨会打湿土壤，花开会引来蜂蝶，落叶会慢慢变成肥土。
              <br />
              不收集任何个人信息，没有广告，没有排行榜。
            </p>
          </div>
        </div>
      )}
    </>
  );
}

/** 篮子里的小图标：复用精灵的绘制，按 68×48 的范围缩放 */
function ItemGlyph({ type }: { type: string }) {
  const spec = spriteOf(type);
  const k = Math.min(30 / spec.w, 36 / spec.h);
  return (
    <g transform={`scale(${k}) translate(${-0} ${-spec.h})`}>
      {spec.draw({ v: 0, st: 3, f: true, night: false })}
    </g>
  );
}
