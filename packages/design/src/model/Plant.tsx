import { clsx } from 'clsx';
import { Fragment, type ComponentPropsWithoutRef } from 'react';
import { IsoBox, Shadow } from './Model.tsx';
import {
  door,
  jobShapes,
  machines,
  slotIndexes,
  slotOrigin,
  startJobs,
  vault,
  workerIds,
  type JobKind,
  type JobPlacement,
  type MachineShape,
  type SlotIndex,
  type WorkerId,
} from './scene.ts';
import { fixed } from './projection.ts';
import styles from './model.module.css';

// The parts of the plant. Each part carries `data-part`, by which a tour step
// fades the parts it does not frame, and the motion finds its parts by the
// other data attributes. States are data attributes too, so the motion can set
// them on the element without the module's class names.

type GroupProps = Omit<ComponentPropsWithoutRef<'g'>, 'children'>;

function partOf(id: MachineShape['id']): 'control' | 'workers' {
  return id === 'control' ? 'control' : 'workers';
}

export interface MachineProps extends GroupProps {
  machine: MachineShape;
  /** A machine that is down shows its slab dark. */
  status?: 'up' | 'down';
}

/** A machine: its shadow and slab, and the control room's tower. */
export function Machine({ machine, status = 'up', className, ...rest }: MachineProps) {
  return (
    <g
      className={clsx(styles.machine, className)}
      data-machine={machine.id}
      data-part={partOf(machine.id)}
      data-status={status}
      {...rest}
    >
      <Shadow footprint={machine.footprint} />
      <g className={styles.body}>
        <IsoBox shape={machine.slab} material="slab" />
        {machine.tower && <IsoBox shape={machine.tower} material="tower" />}
      </g>
    </g>
  );
}

export type LampState = 'ok' | 'warn' | 'stop' | 'off';

export interface LampProps extends GroupProps {
  machine: MachineShape;
  state?: LampState;
}

/** The status lamp on the front corner of a machine. A warning blinks while motion is allowed. */
export function Lamp({ machine, state = 'ok', className, ...rest }: LampProps) {
  return (
    <g
      className={clsx(styles.lamp, className)}
      data-lamp={machine.id}
      data-part={partOf(machine.id)}
      data-state={state}
      {...rest}
    >
      <IsoBox shape={machine.lamp} material="light" />
    </g>
  );
}

// `slot` is the job's place in its cell here, not the SVG attribute.
export interface JobProps extends Omit<GroupProps, 'slot'> {
  kind: JobKind;
  worker: WorkerId;
  slot: SlotIndex;
  /** A job of the new release shows in the accent colour. */
  release?: 'current' | 'new';
  /** A starting job is a dashed outline; a failing one is dark. */
  status?: 'ready' | 'starting' | 'failing';
}

/** A job in a slot of a cell: a block, or a stack of plates for the database. */
export function Job({
  kind,
  worker,
  slot,
  release = 'current',
  status = 'ready',
  className,
  ...rest
}: JobProps) {
  const [x, y] = slotOrigin(worker, slot);
  return (
    <g
      className={clsx(styles.job, className)}
      data-job={kind}
      data-machine={worker}
      data-slot={slot}
      data-part={kind === 'data' ? 'data' : 'workers'}
      data-release={release}
      data-status={status}
      transform={`translate(${fixed(x, 1)} ${fixed(y, 1)})`}
      {...rest}
    >
      <g className={styles.piece}>
        {jobShapes[kind].map((shape, n) => (
          <IsoBox key={n} shape={shape} />
        ))}
      </g>
    </g>
  );
}

/** The loading dock: the way in from the internet. */
export function Door(props: GroupProps) {
  return (
    <g data-part="door" {...props}>
      <Shadow footprint={door.footprint} />
      {door.pillars.map((pillar, n) => (
        <IsoBox key={n} shape={pillar} material="door" />
      ))}
      <IsoBox shape={door.lintel} material="door" />
    </g>
  );
}

/** The offsite store: a pad with a plate for each backup. */
export function Vault(props: GroupProps) {
  return (
    <g data-part="vault" {...props}>
      <Shadow footprint={vault.footprint} />
      <IsoBox shape={vault.pad} material="slab" />
      {vault.plates.map((plate, n) => (
        <IsoBox key={n} shape={plate} />
      ))}
    </g>
  );
}

export interface PlantProps extends GroupProps {
  /** The jobs in the cells. The default is the plant at rest. */
  jobs?: JobPlacement;
}

/**
 * The whole plant, at rest, back to front: the dock; each cell with its jobs
 * and its lamp; the control room; the store. Each cell's jobs sit in a group
 * (`data-layer`) that the motion fills and empties.
 */
export function Plant({ jobs = startJobs, ...rest }: PlantProps) {
  return (
    <g {...rest}>
      <Door />
      {workerIds.map((id) => (
        <Fragment key={id}>
          <Machine machine={machines[id]} />
          <g data-layer={id}>
            {slotIndexes.map((slot) => {
              const kind = jobs[id][slot];
              return kind && <Job key={slot} kind={kind} worker={id} slot={slot} />;
            })}
          </g>
          <Lamp machine={machines[id]} />
        </Fragment>
      ))}
      <Machine machine={machines.control} />
      <Lamp machine={machines.control} />
      <Vault />
    </g>
  );
}
