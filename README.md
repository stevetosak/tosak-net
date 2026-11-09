# tosak.net

The landing page of tosak, a self-hosted Kubernetes platform, and the base of
its design system. The page shows the platform it runs on: a scale model of
the cluster that keeps itself in step with Git, and the work behind it.

## Layout

| Path              | What it holds                                                              |
| ----------------- | -------------------------------------------------------------------------- |
| `packages/design` | The design system: tokens, React primitives and the isometric model kit.   |
| `apps/site`       | The landing page: Astro, rendered to static HTML, with React islands.      |
| `reference/`      | The accepted prototype, the visual baseline the build is compared against. |

## Work on it

Node 24 (see `.nvmrc`) and pnpm, through Corepack.

```sh
corepack enable pnpm
pnpm install
pnpm --filter @tosak/site dev   # the page on http://localhost:4321
pnpm gate                       # lint, format check, typecheck, test, build: what CI runs
```

The design tokens live in one TypeScript source,
`packages/design/src/tokens/values.ts`. After a change to it,
`pnpm --filter @tosak/design tokens` writes `src/styles/tokens.css`; a test
fails while the two differ. An application loads the typefaces, the tokens and
the element defaults with one import: `import '@tosak/design/styles.css'`.

The platform the page describes is
[hetzner-cloud-infra](https://github.com/stevetosak/hetzner-cloud-infra), and
its documentation is on [docs.tosak.net](https://docs.tosak.net).
