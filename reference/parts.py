"""Static parts of prototype F (the working model): an isometric scale model of the cluster.

Every shape is a box projected to isometric screen space. The hero copy moves blocks with
JavaScript; the tour copy is still and only moves its camera group.
"""
import math

C, S, U = math.cos(math.radians(30)), 0.5, 40.0
SLAB, SLAB_H, PITCH, PAD, BLOCK = 2.75, 0.35, 1.25, 0.25, 1.0
PLATE_H, PLATE_GAP = 0.28, 0.06


def P(x, y, z):
    return ((x - y) * C * U, ((x + y) * S - z) * U)


def pts(points, dx=0.0, dy=0.0):
    return ' '.join(f'{X - dx:.1f},{Y - dy:.1f}' for X, Y in points)


def faces(x, y, z, w, d, h):
    top = [P(x, y, z + h), P(x + w, y, z + h), P(x + w, y + d, z + h), P(x, y + d, z + h)]
    left = [P(x, y + d, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x, y + d, z + h)]
    right = [P(x + w, y, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x + w, y, z + h)]
    return top, left, right


def box(x, y, z, w, d, h, cls='', origin=(0.0, 0.0)):
    t, l, r = faces(x, y, z, w, d, h)
    ox, oy = origin
    return (f'<g class="{cls}"><polygon class="l" points="{pts(l, ox, oy)}"/>'
            f'<polygon class="r" points="{pts(r, ox, oy)}"/><polygon class="t" points="{pts(t, ox, oy)}"/></g>')


def shadow(x, y, w, d):
    foot = [P(x + 0.4, y + 0.1, 0), P(x + w + 0.4, y + 0.1, 0), P(x + w + 0.4, y + d + 0.1, 0), P(x + 0.4, y + d + 0.1, 0)]
    return f'<polygon class="sh" points="{pts(foot)}"/>'


def place(x_left, depth, w, d):
    """Base corner (x, y) of a footprint whose left screen corner sits at x_left units and depth x + y."""
    diff = x_left / C + d
    return (diff + depth) / 2, (depth - diff) / 2


# the layout, left to right: the door in front, three workers, the control machine, the offsite copy behind
ROW = 4.0
SLAB_SCREEN = (SLAB + SLAB) * C
DOOR = place(0.0, 5.6, 0.5, 2.0)
WORKERS = {}
x_left = 2.6
for name in ('w1', 'w2', 'w3'):
    WORKERS[name] = place(x_left, ROW, SLAB, SLAB)
    x_left += SLAB_SCREEN + 0.7
CONTROL = place(x_left, ROW, SLAB, SLAB)
VAULT = place(x_left + SLAB_SCREEN + 1.9, 2.4, 2.4, 2.4)

SLOTS = [(0, 0), (1, 0), (0, 1), (1, 1)]          # k = j * 2 + i; depth order 0, 1 and 2, 3
START = {'w1': {0: 'A', 1: 'B'}, 'w2': {0: 'A', 2: 'B', 3: 'C'}, 'w3': {1: 'A', 2: 'C', 3: 'data'}}


def slot_origin(m, k):
    x, y = WORKERS[m]
    i, j = SLOTS[k]
    return P(x + PAD + i * PITCH, y + PAD + j * PITCH, SLAB_H)


def block_markup(app, m, k, extra=''):
    X, Y = slot_origin(m, k)
    return (f'<g class="blk{extra}" data-app="{app}" data-m="{m}" data-k="{k}" transform="translate({X:.1f} {Y:.1f})">'
            f'{box(0, 0, 0, BLOCK, BLOCK, BLOCK, "b")}</g>')


def stack_local():
    return ''.join(box(0, 0, n * (PLATE_H + PLATE_GAP), BLOCK, BLOCK, PLATE_H, 'p') for n in range(3))


def data_markup(m, k):
    X, Y = slot_origin(m, k)
    return (f'<g class="blk data" data-app="data" data-m="{m}" data-k="{k}" transform="translate({X:.1f} {Y:.1f})">'
            f'<g class="b">{stack_local()}</g></g>')


def door_markup():
    x, y = DOOR
    return (f'<g class="door" data-part="door">{shadow(x, y, 0.5, 2.0)}'
            f'{box(x, y, 0, 0.5, 0.5, 1.8, "pillar")}{box(x, y + 1.5, 0, 0.5, 0.5, 1.8, "pillar")}'
            f'{box(x, y, 1.8, 0.5, 2.0, 0.35, "pillar")}</g>')


def vault_markup():
    x, y = VAULT
    plates = ''.join(box(x + 0.4, y + 0.4, 0.25 + n * (PLATE_H + PLATE_GAP), 1.6, 1.6, PLATE_H, 'p') for n in range(3))
    return f'<g class="vault" data-part="vault">{shadow(x, y, 2.4, 2.4)}{box(x, y, 0, 2.4, 2.4, 0.25, "pad")}{plates}</g>'


def control_markup():
    x, y = CONTROL
    return (f'<g class="machine control" data-part="control">{shadow(x, y, SLAB, SLAB)}'
            f'{box(x, y, 0, SLAB, SLAB, SLAB_H, "slab")}{box(x + 0.82, y + 0.82, SLAB_H, 1.1, 1.1, 1.5, "tower")}</g>')


def slab_markup(m, part='workers'):
    x, y = WORKERS[m]
    return (f'<g class="machine worker" data-m="{m}" data-part="{part}">{shadow(x, y, SLAB, SLAB)}'
            f'<g class="slab-g">{box(x, y, 0, SLAB, SLAB, SLAB_H, "slab")}</g></g>')


LAMP, LAMP_H = 0.16, 0.42


def lamp_markup(name, base, state='ok'):
    x, y = base
    part = 'control' if name == 'control' else 'workers'
    return (f'<g class="lamp lamp--{state}" data-lamp="{name}" data-part="{part}">'
            f'{box(x + SLAB - 0.32, y + SLAB - 0.32, SLAB_H, LAMP, LAMP, LAMP_H, "light")}</g>')


def scene_bbox():
    xs, ys = [], []
    def add(x, y, z, w, d, h):
        for poly in faces(x, y, z, w, d, h):
            for X, Y in poly:
                xs.append(X); ys.append(Y)
    add(*DOOR, 0, 0.5, 2.0, 2.15)
    for m in WORKERS:
        add(*WORKERS[m], 0, SLAB, SLAB, SLAB_H + BLOCK)
    add(*CONTROL, 0, SLAB, SLAB, SLAB_H + 1.5)
    add(*VAULT, 0, 2.4, 2.4, 1.3)
    return min(xs), min(ys), max(xs), max(ys)


X0, Y0, X1, Y1 = scene_bbox()
VB = (X0 - 1.7 * U, Y0 - 1.3 * U, (X1 - X0) + 2.1 * U, (Y1 - Y0) + 1.8 * U)


def door_points():
    x, y = DOOR
    through = P(x + 0.25, y + 1.0, 0.8)
    start = (through[0] - 1.6 * U, through[1] + 0.7 * U)
    return start, through


def labels():
    def bottom(x, y, w, d):
        X, Y = P(x + w, y + d, 0)
        return (X - VB[0]) / VB[2] * 100
    items = [(bottom(*DOOR, 0.5, 2.0) - 1.2, 'loading dock', 'Gateway'),
             (bottom(*WORKERS['w2'], SLAB, SLAB), 'three cells', 'worker nodes'),
             (bottom(*CONTROL, SLAB, SLAB), 'control room', 'control plane, Argo CD'),
             (bottom(*VAULT, 2.4, 2.4), 'offsite store', 'backups in R2')]
    return ''.join(f'<span style="--x: {x:.2f}%"><b>{a}</b> {b}</span>' for x, a, b in items)


def scene(blocks=True):
    out = [door_markup()]
    for m in WORKERS:
        out.append(slab_markup(m))
        if blocks:
            out.append(f'<g class="layer" data-m="{m}">')
            for k in (0, 1, 2, 3):
                app = START[m].get(k)
                if app == 'data':
                    out.append(data_markup(m, k))
                elif app:
                    out.append(block_markup(app, m, k))
            out.append('</g>')
        out.append(lamp_markup(m, WORKERS[m]))
    out.append(control_markup())
    out.append(lamp_markup('control', CONTROL))
    out.append(vault_markup())
    return ''.join(out)


def hero_svg():
    import json
    slots = {m: [[round(c, 1) for c in slot_origin(m, k)] for k in range(4)] for m in WORKERS}
    vx, vy = VAULT
    vault_top = [round(c, 1) for c in P(vx + 0.7, vy + 0.7, 0.25 + 3 * (PLATE_H + PLATE_GAP))]
    start, through = door_points()
    tip = [round(c, 1) for c in P(BLOCK / 2, BLOCK / 2, BLOCK)]
    cx, cy = CONTROL
    ticket = [round(c, 1) for c in P(cx + 0.92, cy + 0.92, SLAB_H + 1.5)]
    meta = {'slots': slots, 'vault': vault_top, 'start': [round(c, 1) for c in start],
            'door': [round(c, 1) for c in through], 'tip': tip, 'ticket': ticket}
    templates = (f'<defs><g id="tpl-block" class="blk">{box(0, 0, 0, BLOCK, BLOCK, BLOCK, "b")}</g>'
                 f'<g id="tpl-data" class="blk data"><g class="b">{stack_local()}</g></g>'
                 f'<g id="tpl-ticket" class="blk is-new ticket">{box(0, 0, 0, 0.9, 0.9, 0.14, "b")}</g></defs>')
    return (f'<svg class="model model--hero" viewBox="{VB[0]:.1f} {VB[1]:.1f} {VB[2]:.1f} {VB[3]:.1f}" role="img" '
            f'aria-labelledby="model-title" data-meta=\'{json.dumps(meta)}\'>'
            f'<title id="model-title">A model of tosak as a small factory: the loading dock, three cells, the control room and the offsite store</title>'
            f'{templates}{scene()}<g class="air"></g><g class="dots" aria-hidden="true">'
            + '<circle r="3.4"/>' * 10 + '</g></svg>')


# the tour: the same model, still, framed by a camera that moves between parts
PANEL = (800.0, 600.0)


def cam(bbox, pad=48.0):
    x0, y0, x1, y1 = bbox
    s = min((PANEL[0] - 2 * pad) / (x1 - x0), (PANEL[1] - 2 * pad) / (y1 - y0))
    tx, ty = PANEL[0] / 2 - s * (x0 + x1) / 2, PANEL[1] / 2 - s * (y0 + y1) / 2
    return f'translate({tx:.1f}px, {ty:.1f}px) scale({s:.4f})'


def bbox_of(*objs):
    xs, ys = [], []
    for x, y, z, w, d, h in objs:
        for poly in faces(x, y, z, w, d, h):
            for X, Y in poly:
                xs.append(X); ys.append(Y)
    return min(xs), min(ys), max(xs), max(ys)


def tour_svg():
    start, through = door_points()
    w1 = WORKERS['w1']
    hover = P(w1[0] + PAD, w1[1] + PAD + PITCH, SLAB_H + 1.7)
    land = P(w1[0] + PAD + 0.5, w1[1] + PAD + PITCH + 0.5, SLAB_H)
    data_top = P(WORKERS['w3'][0] + PAD + PITCH + 0.5, WORKERS['w3'][1] + PAD + PITCH + 0.5, SLAB_H + 1.0)
    vx, vy = VAULT
    vault_top = P(vx + 1.2, vy + 1.2, 1.3)
    mid = ((vault_top[0] + data_top[0]) / 2, min(vault_top[1], data_top[1]) - 3.2 * U)
    blocks_on = ''.join(
        f'<g class="part" data-part="{"data" if START[m].get(k) == "data" else "workers"}">'
        + (data_markup(m, k) if START[m].get(k) == 'data' else block_markup(START[m][k], m, k)) + '</g>'
        for m in WORKERS for k in (0, 1, 2, 3) if START[m].get(k))
    slabs = ''.join(slab_markup(m) for m in WORKERS)
    lamps = ''.join(lamp_markup(m, WORKERS[m]) for m in WORKERS) + lamp_markup('control', CONTROL)
    extras = (
        f'<g class="extra extra--road"><line class="drop" x1="{land[0]:.1f}" y1="{hover[1] + U:.1f}" x2="{land[0]:.1f}" y2="{land[1]:.1f}"/>'
        f'<g class="blk is-new" transform="translate({hover[0]:.1f} {hover[1]:.1f})">{box(0, 0, 0, BLOCK, BLOCK, BLOCK, "b")}</g></g>'
        f'<g class="extra extra--door">' + ''.join(
            f'<circle r="5" cx="{start[0] + (through[0] - start[0]) * f:.1f}" cy="{start[1] + (through[1] - start[1]) * f:.1f}"/>'
            for f in (0.15, 0.5, 0.85)) + '</g>'
        f'<g class="extra extra--drill"><path class="arc" d="M{vault_top[0]:.1f} {vault_top[1]:.1f} Q{mid[0]:.1f} {mid[1]:.1f} {data_top[0]:.1f} {data_top[1]:.1f}"/></g>'
    )
    door_bb = bbox_of((*DOOR, 0, 0.5, 2.0, 2.15))
    door_bb = (start[0] - 10, door_bb[1], door_bb[2] + 2 * U, door_bb[3] + 0.4 * U)
    machines = bbox_of(*[(*WORKERS[m], 0, SLAB, SLAB, SLAB_H + BLOCK) for m in WORKERS], (*CONTROL, 0, SLAB, SLAB, SLAB_H + 1.5))
    road = bbox_of((*w1, 0, SLAB, SLAB, SLAB_H + 2.7))
    vault = bbox_of((*VAULT, 0, 2.4, 2.4, 1.3))
    vault = (vault[0] - 1.2 * U, vault[1] - 0.8 * U, vault[2] + 1.2 * U, vault[3] + 0.6 * U)
    drill = bbox_of((*WORKERS['w3'], 0, SLAB, SLAB, SLAB_H + BLOCK), (*VAULT, 0, 2.4, 2.4, 1.3))
    drill = (drill[0], mid[1] + 1.2 * U, drill[2], drill[3])
    cams = {'all': cam((X0 - 1.7 * U, Y0, X1, Y1)), 'door': cam(door_bb), 'machines': cam(machines),
            'road': cam(road), 'vault': cam(vault), 'drill': cam(drill)}
    svg = (f'<svg class="model model--tour" viewBox="0 0 {PANEL[0]:g} {PANEL[1]:g}" aria-hidden="true" focusable="false">'
           f'<g class="cam" style="transform: {cams["all"]}">{door_markup()}{slabs}{blocks_on}{control_markup()}{lamps}{vault_markup()}{extras}</g></svg>')
    return svg, cams


def parts():
    tour, cams = tour_svg()
    out = {'<!--MODEL_HERO-->': hero_svg(), '<!--MODEL_LABELS-->': labels(), '<!--MODEL_TOUR-->': tour}
    for key, value in cams.items():
        out[f'<!--CAM_{key.upper()}-->'] = value
    return out
