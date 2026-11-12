// What the readout beside the model shows of a floor: the order against what
// runs, as one pip per job, the state of the control loop, and the lamps.
import { inStep, jobsOf, jobsOn, type FloorJob, type FloorState } from './floor.ts';
import type { LampState, MachineId, WorkerId } from './scene.ts';

/** One job: ready, ready on a release that is under way, or not passing its health check. */
export type Pip = 'ready' | 'new' | 'unhealthy';

/** The control loop: in step with Git, correcting the floor, or gone with the plant. */
export type LoopState = 'ok' | 'warn' | 'down';

export interface FloorReadout {
  /** What Git orders: one group of pips per application. */
  readonly order: readonly (readonly Pip[])[];
  /** What runs, in the same groups, ready jobs first. */
  readonly floor: readonly (readonly Pip[])[];
  readonly loop: LoopState;
  readonly lamps: Readonly<Record<MachineId, LampState>>;
}

const pipRank: Readonly<Record<Pip, number>> = { ready: 0, new: 1, unhealthy: 2 };

function pipOf(job: FloorJob): Pip {
  if (job.status !== 'ready') return 'unhealthy';
  return job.release === 'new' ? 'new' : 'ready';
}

export function readout(state: FloorState): FloorReadout {
  const apps = [...state.order];
  const step = inStep(state);
  const cell = (worker: WorkerId): LampState => {
    if (state.dark) return 'off';
    if (state.down.has(worker)) return 'stop';
    const correcting = jobsOn(state, worker).some(
      (job) => job.kind !== 'data' && job.status !== 'ready',
    );
    return correcting ? 'warn' : 'ok';
  };
  return {
    order: apps.map(([, { copies, fresh }]) =>
      Array.from({ length: copies }, (): Pip => (fresh ? 'new' : 'ready')),
    ),
    floor: apps.map(([app]) =>
      jobsOf(state, app)
        .map(pipOf)
        .toSorted((a, b) => pipRank[a] - pipRank[b]),
    ),
    loop: state.dark ? 'down' : step ? 'ok' : 'warn',
    lamps: {
      w1: cell('w1'),
      w2: cell('w2'),
      w3: cell('w3'),
      control: state.dark ? 'off' : step ? 'ok' : 'warn',
    },
  };
}
