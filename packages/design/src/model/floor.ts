// The floor of the plant as data: what Git orders, which job stands in which
// slot, and which machines are down. Every change is a pure function from one
// state to the next, and a function that changes nothing returns the state it
// was given. The control loop and the chapters change the floor only through
// these functions, so the rules run in a test without a DOM, and a view draws
// a state and animates the step from the one before. The rules follow the
// prototype's script (reference/page.html) one to one.
import {
  slotIndexes,
  startJobs,
  workerIds,
  type JobKind,
  type JobPlacement,
  type JobStatus,
  type ReleaseMark,
  type SlotIndex,
  type WorkerId,
} from './scene.ts';

/** An application: a kind of job that Git orders. The database is not one; it comes back only from the offsite copy. */
export type AppId = Exclude<JobKind, 'data'>;

/** What Git orders for one application. */
export interface AppOrder {
  readonly copies: number;
  readonly version: number;
  /** A release of it is under way. */
  readonly fresh: boolean;
}

/** A slot of a cell. */
export interface Place {
  readonly worker: WorkerId;
  readonly slot: SlotIndex;
}

/** A job that stands in a slot. */
export interface FloorJob extends Place {
  /** Unique for the life of the floor: a view keys the job's element by it. */
  readonly id: number;
  readonly kind: JobKind;
  readonly version: number;
  readonly status: JobStatus;
  /** The clock time it last started. */
  readonly since: number;
  readonly release: ReleaseMark;
}

export interface FloorState {
  /** What Git orders, by application, in a fixed order. */
  readonly order: ReadonlyMap<AppId, AppOrder>;
  /** The jobs, in the order they came. */
  readonly jobs: readonly FloorJob[];
  /** Slots held for a copy that is on its way from the offsite store. */
  readonly reserved: readonly Place[];
  readonly down: ReadonlySet<WorkerId>;
  /** The whole plant is gone: nothing runs, and the control room corrects nothing. */
  readonly dark: boolean;
  readonly nextId: number;
}

const isApp = (kind: JobKind): kind is AppId => kind !== 'data';
const samePlace = (a: Place, b: Place): boolean => a.worker === b.worker && a.slot === b.slot;
const placeOf = ({ worker, slot }: Place): Place => ({ worker, slot });

/** The floor at rest: the given jobs, ready on the first version, and an order that matches them. */
export function floorAtRest(placement: JobPlacement = startJobs): FloorState {
  const jobs: FloorJob[] = [];
  for (const worker of workerIds) {
    for (const slot of slotIndexes) {
      const kind = placement[worker][slot];
      if (!kind) continue;
      jobs.push({
        id: jobs.length,
        kind,
        version: 1,
        status: 'ready',
        since: 0,
        release: 'current',
        worker,
        slot,
      });
    }
  }
  const apps = [...new Set(jobs.map((job) => job.kind).filter(isApp))].sort();
  const order = new Map(
    apps.map((app): [AppId, AppOrder] => [
      app,
      { copies: jobs.filter((job) => job.kind === app).length, version: 1, fresh: false },
    ]),
  );
  return { order, jobs, reserved: [], down: new Set(), dark: false, nextId: jobs.length };
}

// ---------- what the floor holds ----------

export function jobsOf(state: FloorState, app: AppId): FloorJob[] {
  return state.jobs.filter((job) => job.kind === app);
}

export function jobsOn(state: FloorState, worker: WorkerId): FloorJob[] {
  return state.jobs.filter((job) => job.worker === worker);
}

/** The slots of a cell that no job stands in and no copy is held for, front to back. */
export function freeSlots(state: FloorState, worker: WorkerId): SlotIndex[] {
  const taken = [...state.jobs, ...state.reserved].filter((place) => place.worker === worker);
  return slotIndexes.filter((slot) => !taken.some((place) => place.slot === slot));
}

/** The jobs a visitor's request can go to: an application's jobs whose health check passes. */
export function requestTargets(state: FloorState): FloorJob[] {
  return state.jobs.filter((job) => isApp(job.kind) && job.status === 'ready');
}

/** The floor matches the order: every application has its copies, all ready, all on the ordered version. */
export function inStep(state: FloorState): boolean {
  if (state.dark) return false;
  return [...state.order].every(([app, { copies, version }]) => {
    const mine = jobsOf(state, app);
    return (
      mine.length === copies &&
      mine.every((job) => job.status === 'ready' && job.version === version)
    );
  });
}

// ---------- the control room ----------

/**
 * Starts a job of the application where it fits best: on the running machine
 * with the most free slots (the first such machine on a tie), in its first
 * free slot. The job starts as an outline, on the ordered version.
 */
export function startJob(state: FloorState, app: AppId, now: number): FloorState {
  const order = state.order.get(app);
  const worker = workerIds
    .filter((id) => !state.down.has(id) && freeSlots(state, id).length > 0)
    .toSorted((a, b) => freeSlots(state, b).length - freeSlots(state, a).length)[0];
  const slot = worker === undefined ? undefined : freeSlots(state, worker)[0];
  if (!order || worker === undefined || slot === undefined) return state;
  const job: FloorJob = {
    id: state.nextId,
    kind: app,
    version: order.version,
    status: 'starting',
    since: now,
    release: order.fresh ? 'new' : 'current',
    worker,
    slot,
  };
  return { ...state, jobs: [...state.jobs, job], nextId: state.nextId + 1 };
}

/** Takes a job off the floor. Its slot is free at once; a view lets the job leave. */
export function removeJob(state: FloorState, id: number): FloorState {
  if (!state.jobs.some((job) => job.id === id)) return state;
  return { ...state, jobs: state.jobs.filter((job) => job.id !== id) };
}

/**
 * One pass of the control room: for each application, compare the order with
 * the floor and correct one step. Missing copies all start at once. While a
 * job of the application is not ready, nothing else happens to it. Then one
 * surplus job is retired, the old version first; or, when every copy is there
 * but one is on the old version, one new job starts beside them.
 */
export function reconcile(state: FloorState, now: number): FloorState {
  if (state.dark) return state;
  let next = state;
  for (const [app, { copies, version }] of state.order) {
    const mine = jobsOf(next, app);
    if (mine.length < copies) {
      for (let n = mine.length; n < copies; n++) next = startJob(next, app, now);
      continue;
    }
    if (mine.some((job) => job.status !== 'ready')) continue;
    const old = mine.find((job) => job.version !== version);
    if (mine.length > copies) {
      const surplus = old ?? mine[0];
      if (surplus) next = removeJob(next, surplus.id);
    } else if (old) {
      next = startJob(next, app, now);
    }
  }
  return next;
}

/** A starting job becomes ready once it has run for startMs of clock time: its health check passes. */
export function promote(state: FloorState, now: number, startMs: number): FloorState {
  const due = (job: FloorJob): boolean => job.status === 'starting' && now - job.since >= startMs;
  if (!state.jobs.some(due)) return state;
  return {
    ...state,
    jobs: state.jobs.map((job): FloorJob => (due(job) ? { ...job, status: 'ready' } : job)),
  };
}

// ---------- what the chapters do to the floor ----------

function changeOrder(
  state: FloorState,
  app: AppId,
  change: (order: AppOrder) => AppOrder,
): FloorState {
  const order = state.order.get(app);
  if (!order) return state;
  return { ...state, order: new Map(state.order).set(app, change(order)) };
}

function changeJob(state: FloorState, id: number, change: (job: FloorJob) => FloorJob): FloorState {
  if (!state.jobs.some((job) => job.id === id)) return state;
  return { ...state, jobs: state.jobs.map((job) => (job.id === id ? change(job) : job)) };
}

/** A release is merged in Git: the order asks for the next version of the application. */
export function release(state: FloorState, app: AppId): FloorState {
  return changeOrder(state, app, (order) => ({
    ...order,
    version: order.version + 1,
    fresh: true,
  }));
}

/** The release is done: its jobs no longer stand out. */
export function endRelease(state: FloorState, app: AppId): FloorState {
  const next = changeOrder(state, app, (order) => ({ ...order, fresh: false }));
  return {
    ...next,
    jobs: next.jobs.map((job): FloorJob =>
      job.kind === app ? { ...job, release: 'current' } : job,
    ),
  };
}

/** A job stops answering its health check: it gets no more requests. */
export function failJob(state: FloorState, id: number): FloorState {
  return changeJob(state, id, (job) => ({ ...job, status: 'failing' }));
}

/** The job restarts where it stands. */
export function restartJob(state: FloorState, id: number, now: number): FloorState {
  return changeJob(state, id, (job) => ({ ...job, status: 'starting', since: now }));
}

/** A machine stops, and its jobs stop with it. */
export function stopMachine(state: FloorState, worker: WorkerId): FloorState {
  return {
    ...state,
    down: new Set(state.down).add(worker),
    jobs: state.jobs.filter((job) => job.worker !== worker),
  };
}

/** The machine is back, empty. */
export function startMachine(state: FloorState, worker: WorkerId): FloorState {
  if (!state.down.has(worker)) return state;
  const down = new Set(state.down);
  down.delete(worker);
  return { ...state, down };
}

/** A job is lost and cannot start again from the order: its slot waits for the copy that replaces it. */
export function loseJob(state: FloorState, id: number): FloorState {
  const lost = state.jobs.find((job) => job.id === id);
  if (!lost) return state;
  return {
    ...state,
    jobs: state.jobs.filter((job) => job !== lost),
    reserved: [...state.reserved, placeOf(lost)],
  };
}

/** The database's copy from the offsite store lands in the slot held for it, ready. */
export function restoreData(state: FloorState, place: Place, now: number): FloorState {
  if (!state.reserved.some((held) => samePlace(held, place))) return state;
  const data: FloorJob = {
    id: state.nextId,
    kind: 'data',
    version: 1,
    status: 'ready',
    since: now,
    release: 'current',
    ...placeOf(place),
  };
  return {
    ...state,
    jobs: [...state.jobs, data],
    reserved: state.reserved.filter((held) => !samePlace(held, place)),
    nextId: state.nextId + 1,
  };
}

/** Everything is gone. Nothing runs, and only the database's slot is held, for its copy. */
export function blackout(state: FloorState): FloorState {
  const data = state.jobs.filter((job) => !isApp(job.kind)).map(placeOf);
  return { ...state, dark: true, jobs: [], reserved: [...state.reserved, ...data] };
}

/** The machines are built again, all of them up; the control room reads the order and starts every job. */
export function lightUp(state: FloorState): FloorState {
  if (!state.dark) return state;
  return { ...state, dark: false, down: new Set() };
}
