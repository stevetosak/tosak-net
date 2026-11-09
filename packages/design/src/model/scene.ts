// The plant: the one scene that the hero and the tour both draw. The cluster is
// a small factory: a loading dock (the Gateway), three cells (the worker nodes)
// that hold jobs, a control room (the control plane) and an offsite store (the
// backups). Every shape, anchor and camera frame of the model derives from the
// layout here, with the arithmetic of reference/parts.py.
import { frameRect, type Camera, type Size } from './camera.ts';
import {
  boundsOf,
  cuboid,
  iso,
  placeFootprint,
  project,
  type Cuboid,
  type Footprint,
  type Ground,
  type Point,
  type Rect,
} from './projection.ts';

const U = iso.unit;

/** The measures shared by more than one part, in world units. */
export const measures = {
  slab: 2.75,
  slabHeight: 0.35,
  /** From one job slot to the next on a slab. */
  slotPitch: 1.25,
  /** From the edge of a slab to its first slot. */
  slotPad: 0.25,
  block: 1,
  plateHeight: 0.28,
  plateGap: 0.06,
  towerHeight: 1.5,
  lamp: 0.16,
  lampHeight: 0.42,
} as const;

export type WorkerId = 'w1' | 'w2' | 'w3';
export type MachineId = WorkerId | 'control';
export type SlotIndex = 0 | 1 | 2 | 3;
/** An application's job, or the database's, which is drawn as a stack of plates. */
export type JobKind = 'A' | 'B' | 'C' | 'data';
/** Which job stands in which slot of each cell. */
export type JobPlacement = Readonly<
  Record<WorkerId, Readonly<Partial<Record<SlotIndex, JobKind>>>>
>;

export const workerIds = ['w1', 'w2', 'w3'] as const satisfies readonly WorkerId[];
export const slotIndexes = [0, 1, 2, 3] as const satisfies readonly SlotIndex[];

/** The jobs at rest, before any chapter runs. */
export const startJobs: JobPlacement = {
  w1: { 0: 'A', 1: 'B' },
  w2: { 0: 'A', 2: 'B', 3: 'C' },
  w3: { 1: 'A', 2: 'C', 3: 'data' },
};

/** One value for each cell. */
function byWorker<T>(value: (id: WorkerId) => T): Record<WorkerId, T> {
  return { w1: value('w1'), w2: value('w2'), w3: value('w3') };
}

// The layout, left to right: the dock in front, the three cells and the
// control room in one row, the offsite store behind.
const ROW_DEPTH = 4;
const slabScreenWidth = (measures.slab + measures.slab) * iso.cos;

function rowGrounds(): { workers: Record<WorkerId, Ground>; control: Ground; vault: Ground } {
  const step = slabScreenWidth + 0.7;
  const workers = {} as Record<WorkerId, Ground>;
  let left = 2.6;
  for (const id of workerIds) {
    workers[id] = placeFootprint(left, ROW_DEPTH, measures.slab, measures.slab);
    left += step;
  }
  return {
    workers,
    control: placeFootprint(left, ROW_DEPTH, measures.slab, measures.slab),
    vault: placeFootprint(left + slabScreenWidth + 1.9, 2.4, 2.4, 2.4),
  };
}

const grounds = rowGrounds();

/** Stack level n of plates that sit on a base of the given height. */
function plateLevel(n: number, base = 0): number {
  return base + n * (measures.plateHeight + measures.plateGap);
}

const plateCount = 3;
const plateLevels = Array.from({ length: plateCount }, (_, n) => n);

/** A machine: a cell or the control room. Its lamp stands on the slab's front corner. */
export interface MachineShape {
  readonly id: MachineId;
  readonly footprint: Footprint;
  readonly slab: Cuboid;
  /** The control room's tower; a cell has none. */
  readonly tower?: Cuboid;
  readonly lamp: Cuboid;
  /** The space the machine and what stands on it take, for bounds and frames. */
  readonly envelope: Cuboid;
}

function machine(id: MachineId, [x, y]: Ground, top: number, tower?: Cuboid): MachineShape {
  const { slab, slabHeight, lamp, lampHeight } = measures;
  return {
    id,
    footprint: { x, y, w: slab, d: slab },
    slab: cuboid(x, y, 0, slab, slab, slabHeight),
    ...(tower && { tower }),
    lamp: cuboid(x + slab - 0.32, y + slab - 0.32, slabHeight, lamp, lamp, lampHeight),
    envelope: cuboid(x, y, 0, slab, slab, slabHeight + top),
  };
}

const [cx, cy] = grounds.control;

export const machines: Readonly<Record<MachineId, MachineShape>> = {
  w1: machine('w1', grounds.workers.w1, measures.block),
  w2: machine('w2', grounds.workers.w2, measures.block),
  w3: machine('w3', grounds.workers.w3, measures.block),
  control: machine(
    'control',
    grounds.control,
    measures.towerHeight,
    cuboid(cx + 0.82, cy + 0.82, measures.slabHeight, 1.1, 1.1, measures.towerHeight),
  ),
};

const [dx, dy] = placeFootprint(0, 5.6, 0.5, 2);

/** The loading dock: two pillars and a lintel. */
export interface DoorShape {
  readonly footprint: Footprint;
  readonly pillars: readonly Cuboid[];
  readonly lintel: Cuboid;
  readonly envelope: Cuboid;
}

export const door: DoorShape = {
  footprint: { x: dx, y: dy, w: 0.5, d: 2 },
  pillars: [cuboid(dx, dy, 0, 0.5, 0.5, 1.8), cuboid(dx, dy + 1.5, 0, 0.5, 0.5, 1.8)],
  lintel: cuboid(dx, dy, 1.8, 0.5, 2, 0.35),
  envelope: cuboid(dx, dy, 0, 0.5, 2, 2.15),
};

const [vx, vy] = grounds.vault;

/** The offsite store: a pad that holds three plates, one per backup. */
export interface VaultShape {
  readonly footprint: Footprint;
  readonly pad: Cuboid;
  readonly plates: readonly Cuboid[];
  readonly envelope: Cuboid;
}

export const vault: VaultShape = {
  footprint: { x: vx, y: vy, w: 2.4, d: 2.4 },
  pad: cuboid(vx, vy, 0, 2.4, 2.4, 0.25),
  plates: plateLevels.map((n) =>
    cuboid(vx + 0.4, vy + 0.4, plateLevel(n, 0.25), 1.6, 1.6, measures.plateHeight),
  ),
  envelope: cuboid(vx, vy, 0, 2.4, 2.4, 1.3),
};

/** The shapes of a job, in local units: its origin is the slot it stands on. */
export const jobShapes: Readonly<Record<JobKind | 'ticket', readonly Cuboid[]>> = {
  A: [cuboid(0, 0, 0, measures.block, measures.block, measures.block)],
  B: [cuboid(0, 0, 0, measures.block, measures.block, measures.block)],
  C: [cuboid(0, 0, 0, measures.block, measures.block, measures.block)],
  data: plateLevels.map((n) =>
    cuboid(0, 0, plateLevel(n), measures.block, measures.block, measures.plateHeight),
  ),
  /** A release on its way from the control room: a thin tile. */
  ticket: [cuboid(0, 0, 0, 0.9, 0.9, 0.14)],
};

const slotCells = [
  [0, 0],
  [1, 0],
  [0, 1],
  [1, 1],
] as const satisfies Readonly<Record<SlotIndex, readonly [number, number]>>;

/** The screen point a job's origin sits on in a slot. Slots 0 and 1 are behind 2 and 3. */
export function slotOrigin(worker: WorkerId, slot: SlotIndex): Point {
  const { x, y } = machines[worker].footprint;
  const [i, j] = slotCells[slot];
  const { slotPad, slotPitch, slabHeight } = measures;
  return project(x + slotPad + i * slotPitch, y + slotPad + j * slotPitch, slabHeight);
}

/** A screen rectangle as x, y, width and height, the form of the SVG viewBox. */
export interface ViewBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

const extent: Rect = boundsOf([
  door.envelope,
  ...workerIds.map((id) => machines[id].envelope),
  machines.control.envelope,
  vault.envelope,
]);

/** The view of the whole plant, with room for a job that arrives from the left. */
export const plantView: ViewBox = {
  x: extent.x0 - 1.7 * U,
  y: extent.y0 - 1.3 * U,
  width: extent.x1 - extent.x0 + 2.1 * U,
  height: extent.y1 - extent.y0 + 1.8 * U,
};

// The anchors add their terms in the order parts.py does, so each float is the same.
const [w1x, w1y] = grounds.workers.w1;
const [w3x, w3y] = grounds.workers.w3;
const { slotPad: pad, slotPitch: pitch, slabHeight } = measures;
const doorThrough = project(dx + 0.25, dy + 1, 0.8);
const vaultArcStart = project(vx + 1.2, vy + 1.2, 1.3);
const dataTop = project(
  w3x + pad + pitch + 0.5,
  w3y + pad + pitch + 0.5,
  slabHeight + measures.block,
);

/** The points the motion moves along, in the plant's screen units. */
export const anchors = {
  /** Every slot's origin, by cell. */
  slots: byWorker((id) => slotIndexes.map((k) => slotOrigin(id, k))),
  /** Where a job enters the scene, left of the dock. */
  arrival: [doorThrough[0] - 1.6 * U, doorThrough[1] + 0.7 * U] as Point,
  /** The middle of the dock's opening. */
  doorThrough,
  /** The top centre of a block, from its origin. */
  blockTip: project(measures.block / 2, measures.block / 2, measures.block),
  /** The top of the control room's tower, where a release starts. */
  towerTop: project(cx + 0.92, cy + 0.92, measures.slabHeight + measures.towerHeight),
  /** The top of the store's plates, where a restored copy leaves. */
  vaultTop: project(vx + 0.7, vy + 0.7, plateLevel(plateCount, 0.25)),
  /** Over the empty slot 2 of the first cell: where a new job hovers before it lands. */
  hover: project(w1x + pad, w1y + pad + pitch, slabHeight + 1.7),
  /** The centre of that slot, where the new job lands. */
  land: project(w1x + pad + 0.5, w1y + pad + pitch + 0.5, slabHeight),
  /** The restore arc: from the store, over a control point, to the top of the data stack. */
  restoreArc: {
    from: vaultArcStart,
    control: [
      (vaultArcStart[0] + dataTop[0]) / 2,
      Math.min(vaultArcStart[1], dataTop[1]) - 3.2 * U,
    ] as Point,
    to: dataTop,
  },
} as const;

/** The tour's panel, in its own screen units. */
export const tourPanel: Size = { width: 800, height: 600 };

/** The parts of the plant that a tour step frames. */
export type TourFocus = 'all' | 'machines' | 'road' | 'drill';

const drillBounds = boundsOf([machines.w3.envelope, vault.envelope]);

/** The screen rectangle that each tour step frames. */
export const tourFocusRects: Readonly<Record<TourFocus, Rect>> = {
  all: { ...extent, x0: extent.x0 - 1.7 * U },
  machines: boundsOf([...workerIds.map((id) => machines[id].envelope), machines.control.envelope]),
  road: boundsOf([cuboid(w1x, w1y, 0, measures.slab, measures.slab, slabHeight + 2.7)]),
  drill: { ...drillBounds, y0: anchors.restoreArc.control[1] + 1.2 * U },
};

/** The camera frame of each tour step. */
export const tourCameras: Readonly<Record<TourFocus, Camera>> = {
  all: frameRect(tourFocusRects.all, tourPanel),
  machines: frameRect(tourFocusRects.machines, tourPanel),
  road: frameRect(tourFocusRects.road, tourPanel),
  drill: frameRect(tourFocusRects.drill, tourPanel),
};

/** The parts the captions under the hero name. */
export type LabelledPart = 'door' | 'workers' | 'control' | 'vault';

/** How far across the plant's view each caption sits, in percent: under its part's front corner. */
export const labelPositions: Readonly<Record<LabelledPart, number>> = (() => {
  const across = ({ x, y, w, d }: Footprint): number =>
    ((project(x + w, y + d, 0)[0] - plantView.x) / plantView.width) * 100;
  return {
    door: across(door.footprint) - 1.2,
    workers: across(machines.w2.footprint),
    control: across(machines.control.footprint),
    vault: across(vault.footprint),
  };
})();
