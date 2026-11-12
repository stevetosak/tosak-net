---
title: "Design system: a package the tosak applications share"
description: "What the tosak design system needs beyond the landing page's base before a second application takes it on: a built and published package that works beside Tailwind, themes that let an application keep its own brand, dark mode, and the components an application uses."
type: plan
status: proposed
---

The design system began as the base of the landing page: the tokens of the
accepted prototype, the primitives the page repeats, the isometric model kit
and the clock that moves it, all in `packages/design` of this repository
([the build shape](../adr/0001-the-landing-page-is-static-astro-with-react-islands-in-one-repository-with-its-design-system.md),
[the landing page's Plan](/cloud-infra/plans/landing-page-tosak-net-shows-the-platform-it-runs-on/)).
That base has one consumer, the site in the same workspace, and it is shaped
by it. The package's exports point at TypeScript source, its CSS Modules are
compiled by the site's own bundler, it is `private` with no version, its
colours exist in light only, and its CSS imports the page's two fonts. The
build-shape decision keeps it that way until a second application uses it.

The second application is one of the tosak React applications, and both
candidates differ from the page in ways that decide this Plan. Authos UI and
doma run React 19 on Vite with Tailwind CSS 4, so the package has to work
beside Tailwind's utilities and its `@theme` tokens. Authos UI builds its
controls with shadcn/ui on seventeen Radix Primitives packages. It also
defines a dark theme (a `.dark` block, a class-based `dark` variant and
`dark:` utilities in fourteen component files), but nothing in its source sets
the class, so the theme is never shown (read from the source on 2026-11-12,
not checked in a browser). doma has no component library and no dark theme,
but it has a brand of its own, written down in its `DESIGN.md`: a
"ledger" look with its own palette and three other font families. A design
system that only carries the landing page's look would make doma give that
up. So the token names are the shared contract and the prototype's values
are the default theme, which an application can replace
([decided on 2026-11-12](../adr/0002-each-tosak-application-keeps-its-own-brand-through-a-theme-of-the-design-system.md)).

The work is done when a second application installs a published version,
draws its screens from the package's components in its own theme, and no
longer holds its own copies of them.

## A second application can install the package

**Done when:** a version of the package is on npm, released from a tag with
provenance; it ships compiled JavaScript, type declarations and plain CSS;
and a Vite, React and Tailwind 4 application outside the workspace installs
it, renders a primitive with the tokens, and overrides it with a Tailwind
utility, proven by a browser test in CI.

- [ ] Decide the npm scope and the release trigger (see the open questions)
      and record them as a Decision page.
- [ ] Build the package with Vite's library mode, which the site's toolchain
      already holds: JavaScript, type declarations, and CSS with the CSS
      Modules compiled to fixed class names. The exports point at the build;
      the site keeps reading the source through a workspace export
      condition, so a change to the package still needs no release.
- [ ] Put the package's CSS in named cascade layers. Tailwind 4 puts its
      utilities in a layer, and a style outside every layer wins over every
      layered one, so the package's unlayered base rules would beat an
      application's utilities today (by the cascade rules; assumed until the
      fixture shows it).
- [ ] Emit a Tailwind 4 `@theme` block from the same token source as
      `tokens.css`, so a Tailwind application gets the tokens as utilities
      and as the same custom properties.
- [ ] A fixture in CI: pack the package with `pnpm pack`, install the
      tarball into a minimal Vite, React and Tailwind 4 application, build
      it, and check the rendered primitive and the override in a browser.
- [ ] The release workflow: a tag starts it, npm trusted publishing through
      OIDC publishes with provenance, and a manual run is a dry run. Authos's
      SDK release already works this way for `@authoss/*`. The package loses
      its `private` flag, and React 19 stays a peer dependency.

## An application keeps its own brand through a theme

**Done when:** the components read only role tokens; the prototype's values
are one theme, and a second theme set in one CSS layer or one `@theme` block
changes every colour, family and radius the components draw with; the fonts
load only with the theme that names them; and the catalogue shows the
components in two themes.

- [ ] Split the role tokens from the landing page's own. Most colour tokens
      already name a role (paper, ink, muted, rule, accent); the model's
      faces, lamps and slabs belong to the model kit and stay out of a theme.
- [ ] Move the font imports out of the package's main CSS into the default
      theme, so an application with its own families does not download the
      page's.
- [ ] A test that every role token has a value in each theme the package
      ships, and that no component's CSS Module reads a token outside the
      roles.

## Dark mode

**Done when:** every role token has a dark value in the default theme; the
theme follows the reader's system setting unless the root element names one;
every text pair passes WCAG AA contrast in both, proven by a test over the
token values; and the catalogue shows both.

- [ ] Give each role token a dark value. The dark set redefines the same
      names, so no consumer changes a class or a variable.
- [ ] Switch with `prefers-color-scheme` and a `data-theme` attribute on the
      root element, so an application with its own toggle sets one
      attribute.
- [ ] A contrast test over the text pairs of each theme in light and dark.

## The components an application uses

**Done when:** the package holds the controls and overlays the second
application uses, each built on one headless library and styled with role
tokens, each with keyboard and axe tests; the catalogue shows every primitive
and component in each state with screenshot tests in CI; and the second
application draws those parts from the package.

- [ ] List what the second application uses that the package lacks, and keep,
      merge or drop each. For Authos UI that is the shadcn/ui set: dialog and
      alert dialog, dropdown menu, popover, select, tabs, tooltip, checkbox,
      switch, toggle and toggle group, label, scroll area, avatar,
      collapsible and separator, the form fields, and the toast (sonner).
- [ ] Decide the headless library in a grill (see the open questions) and
      record it as a Decision page.
- [ ] Build the listed components on it, with the hover, focus and disabled
      states the primitives already carry over from the prototype.
- [ ] The catalogue: one page in the workspace, outside the public site's
      navigation, that renders each primitive and component in every state
      and theme, with Playwright screenshots compared in CI.
- [ ] Move the second application onto the package and delete its own
      copies, in its own repository.

## Open questions

- The npm scope and the release trigger. No package is published under
  `@tosak`, and the registry's organisation listing for `tosak` returned 404
  on 2026-11-12, so the scope looks free; it is not claimed. Authos publishes
  `@authoss/*` from a `duster-sdk-vX.Y.Z` tag. The same shape with a
  `design-vX.Y.Z` tag is the lean; Changesets pays off only when several
  packages release on their own.
- When dark mode is built. The landing page ships light only, doma has no
  dark theme, and Authos UI defines one that it never turns on. Once the
  theme work splits the role tokens, a dark set is one more set of values
  for the same names, so it costs no more later than now. The lean is to
  build it when an application turns dark mode on, not before.
- The headless library. Radix Primitives is what Authos UI already uses
  through shadcn/ui, so a move there changes styling and not behaviour. React
  Aria Components is the other candidate, with wider internationalisation
  and its own state hooks for styling.
- Which application comes first. doma is the smaller step: TypeScript 6 like
  this repository, no component library to replace, and no dark theme, but it
  needs the theme work first. Authos UI is the larger proof and needs most
  of the components.
