import type { AgentActivity } from '../../types/agent';

export interface BuildingDef {
  id: string;
  label: string;
  activity: AgentActivity;
  x: number;
  y: number;
  imageKey: string;
  scale: number;
  description: string;
  toolCalls: string[];
}

/**
 * World is much larger (2800x1800) so we can render a thick decorative forest
 * around the village. The **interactive** village itself stays compact — all
 * buildings fit inside a ~1100×700 area centred at (1400, 720) — so every
 * functional target remains on-screen at default zoom.
 */
export const WORLD_WIDTH = 2800;
export const WORLD_HEIGHT = 1800;

/**
 * Main village clear-zone (no forest inside here). Forest fills everything
 * outside this ellipse, with a secondary clearing around the NPC hamlet.
 */
export const CITY_CLEAR = { x: 1400, y: 780, rx: 520, ry: 420 };

/** Plaza/fountain anchor — drives road hub & heroes' visual centre. */
export const PLAZA = { x: 1320, y: 790 };

/**
 * Organic, non-symmetric placement of the 8 functional buildings. Kept tight
 * (≈700×550 spread) so the whole interactive map is readable without zoom-out.
 */
export const BUILDING_DEFS: BuildingDef[] = [
  { id: 'library',    label: '도서관',     activity: 'reading',   x: 1060, y: 600,  imageKey: 'building-library',    scale: 0.52, description: '에이전트가 코드를 읽고 검색하러 오는 곳',                toolCalls: ['Read', 'Grep', 'Glob'] },
  { id: 'alchemist',  label: '연금술사',   activity: 'debugging', x: 1210, y: 460,  imageKey: 'building-alchemist',  scale: 0.50, description: '에이전트가 디버깅하고 오류를 고치러 오는 곳',                toolCalls: ['(오류 후 수정)'] },
  { id: 'castle',     label: '성',         activity: 'thinking',  x: 1430, y: 430,  imageKey: 'building-castle',     scale: 0.46, description: '에이전트가 생각하고 추론하러 오는 곳',                    toolCalls: ['(AI 사고/계획)'] },
  { id: 'watchtower', label: '망루',       activity: 'reviewing', x: 1650, y: 470,  imageKey: 'building-watchtower', scale: 0.42, description: '에이전트가 코드를 검토하고 서브에이전트를 보내는 곳',  toolCalls: ['Agent', 'review'] },
  { id: 'chapel',     label: '예배당',     activity: 'git',       x: 1790, y: 610,  imageKey: 'building-chapel',     scale: 0.38, description: '에이전트가 코드를 커밋하고 푸시하러 오는 곳',                toolCalls: ['git commit', 'git push', 'git merge'] },
  { id: 'tavern',     label: '선술집',     activity: 'idle',      x: 1510, y: 810,  imageKey: 'building-tavern',     scale: 0.50, description: '에이전트가 사용자 입력을 기다리며 쉬는 곳',           toolCalls: ['(유휴/대기)'] },
  { id: 'forge',      label: '대장간',     activity: 'editing',   x: 1150, y: 970,  imageKey: 'building-forge',      scale: 0.42, description: '에이전트가 코드를 작성하고 편집하러 오는 곳',                 toolCalls: ['Edit', 'Write'] },
  { id: 'arena',      label: '투기장',     activity: 'bash',      x: 1700, y: 970,  imageKey: 'building-arena',      scale: 0.42, description: '에이전트가 명령과 테스트를 실행하러 오는 곳',              toolCalls: ['Bash'] },
];

/** South gate — where heroes first spawn before walking into the village. */
export const VILLAGE_GATE = { x: 1400, y: 1130 };

/**
 * Small purple NPC village tucked into the NE forest, visually separated
 * from the main village by a strip of woods.
 */
export const NPC_VILLAGE = { x: 2420, y: 1430, radius: 180 };

export function getBuildingForActivity(activity: AgentActivity): BuildingDef {
  const building = BUILDING_DEFS.find((b) => b.activity === activity);
  return building ?? BUILDING_DEFS.find((b) => b.activity === 'idle')!;
}
