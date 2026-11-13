// The hero: the plant drawn from the floor's state, the readout of the control
// loop, and the chapter buttons. The server renders the plant at rest; in the
// browser, unless the reader asks for reduced motion, the model runs.
import { ChapterButton, ChapterList, PauseButton, Readout } from '@tosak/design';
import {
  Door,
  Floor,
  Job,
  Lamp,
  Machine,
  Model,
  Piece,
  Vault,
  fixed,
  labelPositions,
  machines,
  plantView,
  readout,
  workerIds,
  type FloorJob,
  type LabelledPart,
  type LoopState,
  type Pip,
  type WorkerId,
} from '@tosak/design/model';
import { Clock } from '@tosak/design/motion';
import { clsx } from 'clsx';
import {
  Fragment,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from 'react';
import { stories } from './captions.ts';
import { runHero, type HeroControls } from './run.ts';
import { ease, pieceOf } from './script.ts';
import { Stage, type Exit, type LeavingJob } from './stage.ts';
import styles from './HeroModel.module.css';

const TITLE =
  'A model of tosak as a small factory: the loading dock, three cells, the control room and the offsite store';

const labels: readonly { part: LabelledPart; name: string; role: string }[] = [
  { part: 'door', name: 'loading dock', role: 'Gateway' },
  { part: 'workers', name: 'three cells', role: 'worker nodes' },
  { part: 'control', name: 'control room', role: 'control plane, Argo CD' },
  { part: 'vault', name: 'offsite store', role: 'backups in R2' },
];

const loopText: Readonly<Record<LoopState, string>> = {
  ok: 'In step',
  warn: 'Correcting',
  down: 'Control room down',
};

/** Slots 0 and 1 stand behind 2 and 3, so a cell draws its jobs in this order. */
const depth = [0, 1, 1, 2] as const;
const DOTS = 10;
const ENTER_MS = 380;
const EXIT_MS = 420;
const exitRise: Readonly<Record<Exit, number>> = { rise: -40, sink: 14 };

export default function HeroModel() {
  const [parts] = useState(() => ({ floor: new Floor(), stage: new Stage(), clock: new Clock() }));
  const { floor, stage, clock } = parts;
  const floorState = useSyncExternalStore(
    floor.subscribe,
    () => floor.state,
    () => floor.state,
  );
  const view = useSyncExternalStore(
    stage.subscribe,
    () => stage.state,
    () => stage.state,
  );
  const scene = useRef<HTMLDivElement>(null);
  const controls = useRef<HeroControls | null>(null);

  useEffect(() => {
    const svg = scene.current?.querySelector('svg');
    if (!svg || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const hero = runHero({ clock, floor, stage, svg });
    controls.current = hero;
    return () => {
      controls.current = null;
      hero.stop();
    };
  }, [clock, floor, stage]);

  const shown = readout(floorState);
  const { position } = view;
  const cell = (worker: WorkerId) =>
    [
      ...view.leaving.filter(({ job }) => job.worker === worker),
      ...floorState.jobs.filter((job) => job.worker === worker),
    ].toSorted((a, b) => depth[slotOf(a)] - depth[slotOf(b)]);

  return (
    <>
      <figure className={styles.stage}>
        <div ref={scene} className={styles.scroll}>
          <Model view={plantView} title={TITLE}>
            <Door />
            {workerIds.map((worker) => (
              <Fragment key={worker}>
                <Machine
                  machine={machines[worker]}
                  status={floorState.down.has(worker) ? 'down' : 'up'}
                />
                <g data-layer={worker}>
                  {cell(worker).map((item) =>
                    'exit' in item ? (
                      <Leaving key={item.job.id} item={item} clock={clock} stage={stage} />
                    ) : (
                      <Live key={item.id} job={item} clock={clock} />
                    ),
                  )}
                </g>
                <Lamp machine={machines[worker]} state={shown.lamps[worker]} />
              </Fragment>
            ))}
            <Machine machine={machines.control} />
            <Lamp machine={machines.control} state={shown.lamps.control} />
            <Vault />
            <g data-layer="air">
              {view.air.map((piece) => (
                <Piece
                  key={piece.id}
                  data-air={piece.id}
                  shape={piece.shape}
                  at={piece.at}
                  release={piece.shape === 'ticket' ? 'new' : 'current'}
                />
              ))}
            </g>
            <g className={styles.dots} aria-hidden="true">
              {Array.from({ length: DOTS }, (_, n) => (
                <circle key={n} r={3.4} data-dot="" />
              ))}
            </g>
          </Model>
          <div className={styles.tags} aria-hidden="true">
            {labels.map(({ part, name, role }) => (
              <span
                key={part}
                style={{ '--x': `${fixed(labelPositions[part], 2)}%` } as CSSProperties}
              >
                <b>{name}</b> {role}
              </span>
            ))}
          </div>
        </div>
      </figure>
      <div className={clsx(styles.console, 'motion-only')}>
        <div className={styles.loop} aria-hidden="true">
          <PipRow name="Order · Git" groups={shown.order} dim={view.focus === 'floor'} />
          <PipRow name="Running · pods" groups={shown.floor} dim={view.focus === 'order'} />
          <p className={styles.state} data-state={shown.loop}>
            {loopText[shown.loop]}
          </p>
        </div>
        <Readout
          className={styles.readout}
          status={view.caption}
          time={view.timer ?? '0:00'}
          running={view.timer !== null}
        />
      </div>
      <ChapterList
        aria-label="Chapters of the model"
        count={stories.length}
        className={clsx(styles.chapters, 'motion-only')}
      >
        <PauseButton
          paused={view.paused}
          subject="the model"
          onClick={() => controls.current?.togglePause()}
        />
        {stories.map(({ title }, n) => (
          <ChapterButton
            key={title}
            n={n + 1}
            current={position?.chapter === n}
            done={position !== null && position.sequence && n < position.chapter}
            onClick={() => controls.current?.jump(n)}
          >
            {title}
          </ChapterButton>
        ))}
      </ChapterList>
    </>
  );
}

const slotOf = (item: FloorJob | LeavingJob): FloorJob['slot'] =>
  'exit' in item ? item.job.slot : item.slot;

/** A job on the floor. One that comes onto it starting grows in from its base. */
function Live({ job, clock }: { job: FloorJob; clock: Clock }) {
  const ref = useRef<SVGGElement>(null);
  const [arriving] = useState(job.status === 'starting');
  useLayoutEffect(() => {
    if (!arriving || !ref.current) return;
    clock.track(
      pieceOf(ref.current).animate(
        [
          { opacity: 0, transform: 'scale(0.9)' },
          { opacity: 1, transform: 'scale(1)' },
        ],
        { duration: ENTER_MS, easing: ease.out, fill: 'backwards' },
      ),
    );
  }, [arriving, clock]);
  return (
    <g ref={ref}>
      <Job
        data-id={job.id}
        kind={job.kind}
        worker={job.worker}
        slot={job.slot}
        release={job.release}
        status={job.status}
      />
    </g>
  );
}

/** A job that has left the floor: it lifts off, or sinks with its machine, then goes. */
function Leaving({ item, clock, stage }: { item: LeavingJob; clock: Clock; stage: Stage }) {
  const ref = useRef<SVGGElement>(null);
  const { job, exit } = item;
  useLayoutEffect(() => {
    if (!ref.current) return;
    const motion = clock.track(
      pieceOf(ref.current).animate(
        [
          { transform: 'translate(0px, 0px)', opacity: 1 },
          { transform: `translate(0px, ${String(exitRise[exit])}px)`, opacity: 0 },
        ],
        { duration: EXIT_MS, easing: ease.in, fill: 'forwards' },
      ),
    );
    motion.finished.then(
      () => {
        stage.forget(job.id);
      },
      () => undefined,
    );
  }, [clock, stage, job.id, exit]);
  return (
    <g ref={ref}>
      <Job
        kind={job.kind}
        worker={job.worker}
        slot={job.slot}
        release={job.release}
        status={job.status}
      />
    </g>
  );
}

/** One row of the loop's readout: a group of pips per application. */
function PipRow({
  name,
  groups,
  dim,
}: {
  name: string;
  groups: readonly (readonly Pip[])[];
  dim: boolean;
}) {
  return (
    <div className={clsx(styles.row, dim && styles.dim)}>
      <span className={styles.key}>{name}</span>
      <span className={styles.pips}>
        {groups.map((group, g) => (
          <span key={g} className={styles.group}>
            {group.map((pip, n) => (
              <i key={n} className={styles.pip} data-pip={pip} />
            ))}
          </span>
        ))}
      </span>
    </div>
  );
}
