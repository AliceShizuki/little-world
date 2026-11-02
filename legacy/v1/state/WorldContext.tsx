import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { audio, type SoundName } from '../systems/audioSystem';
import type { Layout } from '../systems/layout';
import { DEFAULT_STATE, clearSave, hasSave, loadState, saveState } from '../systems/saveSystem';
import type { NVec, Plant, TimeOfDay, Vec, Weather, WorldState } from '../types';

/** 世界状态 + 所有可执行动作 */
export interface WorldApi {
  state: WorldState;
  layout: Layout;
  night: boolean;
  raining: boolean;
  /** 归一化坐标 <-> 单位坐标 */
  toUnits: (n: NVec) => Vec;
  toNorm: (v: Vec) => NVec;
  /** 天气 / 昼夜 */
  setWeather: (w: Weather) => void;
  setTimeOfDay: (t: TimeOfDay) => void;
  /** 房屋 */
  toggleDoor: () => void;
  toggleWindow: () => void;
  /** 种植 */
  addPlant: (n: NVec) => void;
  waterPlant: (id: string) => void;
  advancePlant: (id: string) => void;
  removePlant: (id: string) => void;
  /** 可拖动对象位置 */
  setCloud: (id: 'a' | 'b', n: NVec) => void;
  setBoat: (n: NVec) => void;
  setSeed: (n: NVec | null) => void;
  /** 小兔子吃掉一根胡萝卜 */
  countTreat: () => void;
  /** 声音 */
  setSoundOn: (on: boolean) => void;
  setVolume: (v: number) => void;
  sfx: (name: SoundName) => void;
  /** 重置 */
  resetWorld: () => void;
}

const WorldContext = createContext<WorldApi | null>(null);

export function useWorld(): WorldApi {
  const ctx = useContext(WorldContext);
  if (!ctx) throw new Error('useWorld 必须在 WorldProvider 内部使用');
  return ctx;
}

const COLORS: Plant['color'][] = ['pink', 'yellow', 'purple'];

export function WorldProvider({ layout, children }: { layout: Layout; children: ReactNode }) {
  const [state, setState] = useState<WorldState>(() => {
    const loaded = loadState();
    if (hasSave()) return loaded;
    // 首次进入：把云朵 / 小船 / 种子摆到当前屏幕布局对应的位置上
    const norm = (v: Vec): NVec => ({ fx: v.x / layout.u, fy: v.y / layout.uh });
    return {
      ...loaded,
      clouds: { a: norm(layout.clouds.a), b: norm(layout.clouds.b) },
      boat: norm(layout.boat),
      seed: norm(layout.seedSpawn),
      plants: [],
    };
  });

  // ---- 持久化（节流写入，避免拖动时频繁写 localStorage）----
  const saveTimer = useRef<number | null>(null);
  useEffect(() => {
    if (saveTimer.current !== null) clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => saveState(state), 320);
    return () => {
      if (saveTimer.current !== null) clearTimeout(saveTimer.current);
    };
  }, [state]);

  // ---- 声音状态同步 ----
  useEffect(() => {
    audio.setEnabled(state.soundOn);
    audio.setVolume(state.volume);
  }, [state.soundOn, state.volume]);

  useEffect(() => {
    audio.setRain(state.weather === 'rain');
  }, [state.weather]);

  useEffect(() => {
    audio.setNight(state.timeOfDay === 'night');
  }, [state.timeOfDay]);

  const patch = useCallback((next: Partial<WorldState> | ((s: WorldState) => Partial<WorldState>)) => {
    setState((s) => ({ ...s, ...(typeof next === 'function' ? next(s) : next) }));
  }, []);

  const toUnits = useCallback(
    (n: NVec): Vec => ({ x: n.fx * layout.u, y: n.fy * layout.uh }),
    [layout.u, layout.uh],
  );

  const toNorm = useCallback(
    (v: Vec): NVec => ({ fx: v.x / layout.u, fy: v.y / layout.uh }),
    [layout.u, layout.uh],
  );

  const setWeather = useCallback(
    (w: Weather) => {
      setState((s) => (s.weather === w ? s : { ...s, weather: w }));
      audio.unlock();
      audio.play('whoosh');
    },
    [],
  );

  const setTimeOfDay = useCallback((t: TimeOfDay) => {
    setState((s) =>
      s.timeOfDay === t ? s : { ...s, timeOfDay: t, windowLit: t === 'night' ? true : s.windowLit },
    );
    audio.unlock();
    audio.play(t === 'night' ? 'sparkle' : 'sun');
  }, []);

  const toggleDoor = useCallback(() => {
    setState((s) => ({ ...s, doorOpen: !s.doorOpen }));
    audio.unlock();
    audio.play('door');
  }, []);

  const toggleWindow = useCallback(() => {
    setState((s) => ({ ...s, windowLit: !s.windowLit }));
    audio.unlock();
    audio.play('pop');
  }, []);

  const addPlant = useCallback((n: NVec) => {
    setState((s) => {
      if (s.plants.length >= 7) return s;
      const plant: Plant = {
        id: `plant-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        fx: n.fx,
        fy: n.fy,
        stage: 0,
        watered: false,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      };
      return { ...s, plants: [...s.plants, plant], seed: null };
    });
    audio.unlock();
    audio.play('plant');
  }, []);

  const waterPlant = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      plants: s.plants.map((p) => (p.id === id && !p.watered ? { ...p, watered: true, stage: 1 } : p)),
    }));
    audio.unlock();
    audio.play('water');
  }, []);

  const advancePlant = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      plants: s.plants.map((p) =>
        p.id === id && p.stage < 3 ? { ...p, stage: (p.stage + 1) as Plant['stage'] } : p,
      ),
    }));
  }, []);

  const removePlant = useCallback((id: string) => {
    setState((s) => ({ ...s, plants: s.plants.filter((p) => p.id !== id) }));
  }, []);

  const setCloud = useCallback(
    (id: 'a' | 'b', n: NVec) => {
      setState((s) => ({ ...s, clouds: { ...s.clouds, [id]: n } }));
    },
    [],
  );

  const setBoat = useCallback((n: NVec) => {
    setState((s) => ({ ...s, boat: n }));
  }, []);

  const setSeed = useCallback((n: NVec | null) => {
    setState((s) => ({ ...s, seed: n }));
  }, []);

  const countTreat = useCallback(() => {
    setState((s) => ({ ...s, treatsEaten: s.treatsEaten + 1 }));
  }, []);

  const setSoundOn = useCallback((on: boolean) => {
    patch({ soundOn: on });
    if (on) {
      audio.unlock();
      audio.setEnabled(true);
      audio.play('pop');
    }
  }, [patch]);

  const setVolume = useCallback(
    (v: number) => {
      patch({ volume: Math.min(1, Math.max(0, v)) });
    },
    [patch],
  );

  const sfx = useCallback((name: SoundName) => {
    audio.unlock();
    audio.play(name);
  }, []);

  const resetWorld = useCallback(() => {
    clearSave();
    const fresh: WorldState = JSON.parse(JSON.stringify(DEFAULT_STATE)) as WorldState;
    setState(fresh);
    saveState(fresh);
    audio.play('sparkle');
  }, []);

  const value = useMemo<WorldApi>(
    () => ({
      state,
      layout,
      night: state.timeOfDay === 'night',
      raining: state.weather === 'rain',
      toUnits,
      toNorm,
      setWeather,
      setTimeOfDay,
      toggleDoor,
      toggleWindow,
      addPlant,
      waterPlant,
      advancePlant,
      removePlant,
      setCloud,
      setBoat,
      setSeed,
      countTreat,
      setSoundOn,
      setVolume,
      sfx,
      resetWorld,
    }),
    [
      state,
      layout,
      toUnits,
      toNorm,
      setWeather,
      setTimeOfDay,
      toggleDoor,
      toggleWindow,
      addPlant,
      waterPlant,
      advancePlant,
      removePlant,
      setCloud,
      setBoat,
      setSeed,
      countTreat,
      setSoundOn,
      setVolume,
      sfx,
      resetWorld,
    ],
  );

  return <WorldContext.Provider value={value}>{children}</WorldContext.Provider>;
}
