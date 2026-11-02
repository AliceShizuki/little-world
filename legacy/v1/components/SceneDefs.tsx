import { C } from '../theme';
import type { Layout } from '../systems/layout';

/**
 * 场景共用的渐变、滤镜与图案定义。
 * 所有颜色都来自统一调色板，保证整幅画的美术一致性。
 */
export function SceneDefs({ layout }: { layout: Layout }) {
  const { u, uh, horizon } = layout;
  return (
    <defs>
      <linearGradient id="skyDay" x1="0" y1="0" x2="0.15" y2="1">
        <stop offset="0%" stopColor={C.skyDayTop} />
        <stop offset="52%" stopColor={C.skyDayMid} />
        <stop offset="86%" stopColor="#eef6f4" />
        <stop offset="100%" stopColor={C.skyDayLow} />
      </linearGradient>

      <linearGradient id="skyNight" x1="0" y1="0" x2="0.1" y2="1">
        <stop offset="0%" stopColor={C.skyNightTop} />
        <stop offset="55%" stopColor={C.skyNightMid} />
        <stop offset="100%" stopColor={C.skyNightLow} />
      </linearGradient>

      <linearGradient id="rainSky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#8ea4b8" stopOpacity="0.85" />
        <stop offset="100%" stopColor="#b9c8d2" stopOpacity="0.5" />
      </linearGradient>

      <linearGradient id="grassGrad" x1="0" y1="0" x2="0.05" y2="1">
        <stop offset="0%" stopColor={C.grassFar} />
        <stop offset="38%" stopColor={C.grass} />
        <stop offset="100%" stopColor={C.grassNear} />
      </linearGradient>

      <linearGradient id="hillFar" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#d6e6c8" />
        <stop offset="100%" stopColor={C.hillMid} />
      </linearGradient>

      <linearGradient id="waterGrad" x1="0" y1="0" x2="0.2" y2="1">
        <stop offset="0%" stopColor={C.waterTop} />
        <stop offset="100%" stopColor={C.waterBottom} />
      </linearGradient>

      <linearGradient id="sandGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={C.sand} />
        <stop offset="100%" stopColor={C.sandDark} />
      </linearGradient>

      <radialGradient id="sunBody" cx="0.36" cy="0.32" r="0.78">
        <stop offset="0%" stopColor="#fff6d6" />
        <stop offset="62%" stopColor={C.sunCore} />
        <stop offset="100%" stopColor={C.sunEdge} />
      </radialGradient>

      <radialGradient id="sunGlowGrad" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0%" stopColor={C.sunGlow} stopOpacity="0.55" />
        <stop offset="55%" stopColor={C.sunGlow} stopOpacity="0.16" />
        <stop offset="100%" stopColor={C.sunGlow} stopOpacity="0" />
      </radialGradient>

      <radialGradient id="moonBody" cx="0.34" cy="0.3" r="0.8">
        <stop offset="0%" stopColor="#fffceb" />
        <stop offset="65%" stopColor={C.moonCore} />
        <stop offset="100%" stopColor={C.moonEdge} />
      </radialGradient>

      <radialGradient id="moonGlowGrad" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0%" stopColor="#f6edc8" stopOpacity="0.4" />
        <stop offset="100%" stopColor="#f6edc8" stopOpacity="0" />
      </radialGradient>

      <linearGradient id="wallGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#fdf0d3" />
        <stop offset="100%" stopColor={C.houseWallDark} />
      </linearGradient>

      <linearGradient id="roofGrad" x1="0" y1="0" x2="0.25" y2="1">
        <stop offset="0%" stopColor="#f2b18d" />
        <stop offset="100%" stopColor={C.houseRoofDark} />
      </linearGradient>

      <linearGradient id="windowGlowGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#ffeec0" />
        <stop offset="100%" stopColor={C.houseWindowLight} />
      </linearGradient>

      <radialGradient id="windowHalo" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0%" stopColor="#ffdf95" stopOpacity="0.55" />
        <stop offset="100%" stopColor="#ffdf95" stopOpacity="0" />
      </radialGradient>

      <linearGradient id="cloudGrad" x1="0" y1="0" x2="0.1" y2="1">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="100%" stopColor={C.cloudShade} />
      </linearGradient>

      <linearGradient id="cloudRainGrad" x1="0" y1="0" x2="0.1" y2="1">
        <stop offset="0%" stopColor="#e2e9f0" />
        <stop offset="100%" stopColor={C.cloudRainShade} />
      </linearGradient>

      <linearGradient id="leafGrad" x1="0.2" y1="0" x2="0.8" y2="1">
        <stop offset="0%" stopColor={C.leafLight} />
        <stop offset="100%" stopColor={C.leaf} />
      </linearGradient>

      <linearGradient id="pineGrad" x1="0.2" y1="0" x2="0.8" y2="1">
        <stop offset="0%" stopColor="#93c98a" />
        <stop offset="100%" stopColor={C.pineDark} />
      </linearGradient>

      <linearGradient id="trunkGrad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor={C.trunkDark} />
        <stop offset="45%" stopColor={C.trunk} />
        <stop offset="100%" stopColor="#a97f57" />
      </linearGradient>

      <linearGradient id="boatGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#fffaf0" />
        <stop offset="100%" stopColor={C.boatShade} />
      </linearGradient>

      <radialGradient id="rabbitGrad" cx="0.4" cy="0.3" r="0.85">
        <stop offset="0%" stopColor="#fffdf9" />
        <stop offset="100%" stopColor={C.rabbitBody} />
      </radialGradient>

      <linearGradient id="frogGrad" x1="0.2" y1="0" x2="0.8" y2="1">
        <stop offset="0%" stopColor="#b8e0a0" />
        <stop offset="100%" stopColor={C.frogDark} />
      </linearGradient>

      <linearGradient id="birdGrad" x1="0.2" y1="0" x2="0.8" y2="1">
        <stop offset="0%" stopColor="#a9d8f0" />
        <stop offset="100%" stopColor={C.birdWing} />
      </linearGradient>

      <linearGradient id="carrotGrad" x1="0.2" y1="0" x2="0.8" y2="1">
        <stop offset="0%" stopColor="#ffc08d" />
        <stop offset="60%" stopColor={C.carrot} />
        <stop offset="100%" stopColor={C.carrotDark} />
      </linearGradient>

      <linearGradient id="nightTint" x1="0" y1="0" x2="0.1" y2="1">
        <stop offset="0%" stopColor="#1b2450" stopOpacity="0.9" />
        <stop offset="60%" stopColor="#2c3663" stopOpacity="0.78" />
        <stop offset="100%" stopColor="#3d4370" stopOpacity="0.7" />
      </linearGradient>

      <linearGradient id="rainTint" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#7e93a8" stopOpacity="0.55" />
        <stop offset="100%" stopColor="#a8bdcc" stopOpacity="0.3" />
      </linearGradient>

      <linearGradient id="vignette" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#000" stopOpacity="0.05" />
        <stop offset="30%" stopColor="#000" stopOpacity="0" />
        <stop offset="82%" stopColor="#000" stopOpacity="0" />
        <stop offset="100%" stopColor="#4a3a2a" stopOpacity="0.1" />
      </linearGradient>

      <filter id="softBlur" x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="6" />
      </filter>
      <filter id="tinyBlur" x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="2.2" />
      </filter>
      <filter id="glowBlur" x="-80%" y="-80%" width="260%" height="260%">
        <feGaussianBlur stdDeviation="10" />
      </filter>

      <mask id="moonCrescent" maskUnits="userSpaceOnUse" x={-140} y={-140} width={280} height={280}>
        <circle cx={0} cy={0} r={100} fill="#fff" />
        <circle cx={62} cy={-28} r={94} fill="#000" />
      </mask>

      <clipPath id="skyClip">
        <rect x={-40} y={-40} width={u + 80} height={horizon + 42} />
      </clipPath>
      <clipPath id="sceneClip">
        <rect x={-40} y={-40} width={u + 80} height={uh + 80} />
      </clipPath>
    </defs>
  );
}
