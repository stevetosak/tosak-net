# tosak.net

The landing page of tosak, a self-hosted Kubernetes platform, and the base of
its design system. The page shows the platform it runs on: a scale model of
the cluster that keeps itself in step with Git, and the work behind it.

## Layout

| Path                       | What it holds                                                               |
| -------------------------- | --------------------------------------------------------------------------- |
| `packages/design`          | The design system: tokens, React primitives and the isometric model kit.    |
| `packages/status-contract` | The tosak-status contract: one JSON Schema and the types generated from it. |
| `apps/site`                | The landing page: Astro, rendered to static HTML, with React islands.       |
| `reference/`               | The accepted prototype, the visual baseline the build is compared against.  |

## Work on it

Node 24 (see `.nvmrc`) and pnpm, through Corepack.

```sh
corepack enable pnpm
pnpm install
pnpm --filter @tosak/site dev   # the page on http://localhost:4321
pnpm gate                       # lint, format check, typecheck, test, build: what CI runs
pnpm test:browser               # the page in Chromium at 1440 and 375 px, with axe
```

The cluster runs the page as the image `stevetosak/tosak-net-site`: the static
build behind unprivileged nginx on port 8080, as UID 10001 with a read-only
root filesystem. CI builds and pushes it from `main` only, tagged `latest` and
`alpha-<commit>`, then opens a pull request on the infrastructure repository
that sets the new tag in the site's overlay; Argo CD rolls the pod once it
merges. To build and run it locally:

```sh
docker build -f apps/site/Dockerfile -t tosak-net-site .
docker run --rm --read-only --tmpfs /tmp -p 8080:8080 tosak-net-site
```

The design tokens live in one TypeScript source,
`packages/design/src/tokens/values.ts`. After a change to it,
`pnpm --filter @tosak/design tokens` writes `src/styles/tokens.css`; a test
fails while the two differ. An application loads the typefaces, the tokens and
the element defaults with one import: `import '@tosak/design/styles.css'`.

The numbers the page states follow one contract,
`packages/status-contract/schema/status.schema.json`: what `/api/status` will
return, and the shape of the page's build-time snapshot. After a change to it,
`pnpm --filter @tosak/status-contract types` writes `src/status.ts`; a test
fails while the two differ, and the site's tests validate the snapshot against
the schema. Each section carries its own measured time, so a source that fails
leaves only its own numbers behind.

The isometric model kit is `@tosak/design/model`: the projection, the box,
slab, lamp and job components, and one scene description of the plant that the
hero and the tour both draw. Its arithmetic follows `reference/parts.py`, and a
test compares every point it draws with the prototype's built page.

The model moves on `@tosak/design/motion`: one pausable clock for the
chapters, the control loop and the animations, and a player for the chapters.
The plant's floor is data (`floor.ts` in the model kit): pure functions for
the control room's rules, and a small store a React island subscribes to.
Time moves only when the clock is advanced, so the tests run the control loop
on a fake clock.

The platform the page describes is
[hetzner-cloud-infra](https://github.com/stevetosak/hetzner-cloud-infra), and
its documentation is on [docs.tosak.net](https://docs.tosak.net).
