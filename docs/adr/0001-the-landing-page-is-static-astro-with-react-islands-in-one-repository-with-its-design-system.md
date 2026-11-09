---
title: "The landing page is static Astro with React islands, in one repository with its design system"
description: "Why tosak.net, its design system and its status service share one pnpm workspace, why the page is static HTML with two React islands and the browser's own animation, and why it ships before its live numbers."
type: decision
status: accepted
date: 2026-11-09
---

Since 2026-10-25 the apex `tosak.net` has sent every visitor to the docs site
with a 302, a placeholder until a landing page took over. The page that
replaces it shows the platform it runs on. Its design was chosen over two
rounds of prototypes, and version 11 of the "Working model" was accepted on
2026-11-09: one HTML file built by a Python generator, kept in
[`reference/`](../../reference/README.md). Its hero is an isometric model of
the cluster drawn as a small factory, run by a real reconcile loop on a
pausable clock; a tour further down moves a camera over a still copy of the
same model as the reader scrolls. Everything else on the page is text.

Two further needs shaped the build. The design is the baseline for later
tosak applications, which are written in React, so its tokens and components
must be React a second application can import, not styles inside one page.
And the page quotes numbers about the platform (checks passed, releases, the
last restore drill) that should become live, which needs a small service that
reads Prometheus without exposing it.

## The decision

The page, its design system and that service live in one public repository,
`stevetosak/tosak-net`, as a pnpm workspace: `packages/design` (tokens, React
primitives and the isometric model kit), `apps/site`, and `services/status` in
Go once the live numbers start. Astro renders every component to static HTML at
build time, and only the hero model and the tour camera hydrate as React
islands; the page reads completely with JavaScript off. The animation stays on
the browser's Web Animations API, with the prototype's clock ported as a typed
module and tested on a fake clock. The site goes live first with build-time
numbers and the date they were measured; the status service follows and
returns the same shape. The design package is published to npm only once a
second application uses it.

## Why this and not the alternatives

Separate repositories for the design system and the page would put a version
boundary between them before anything else consumes the package. Every token
or component change the page needs would become a release and an upgrade, and
a change that touches both could not land as one commit. One workspace keeps
that change atomic; the package keeps its own folder and exports, so it can
leave the workspace when a second application needs a published version.

A single-page React application, or a framework that renders on a server,
would ship the React runtime for a page that is mostly prose, and the server
variant would need a Node process in the cluster where a static file server
does. Astro's islands hydrate only the two parts that move, and the rest costs
no JavaScript.

An animation library (GSAP, or Motion for React) would replace a mechanism
that already works and is small. The prototype's Pause holds the request dots,
the chapter timers and the reconcile loop together because all of them run on
one clock; a library would animate the shapes, but the clock would still be
needed for everything that is not an animation. The Web Animations API is what
the prototype already uses, and it needs no dependency.

Waiting for live numbers before going live would tie the page to a service and
to a decision about the source and window of each number. Build-time numbers
with their date are honest about their age and let the page replace the
redirect now.

## What it costs

One repository carries two toolchains, Node and Go, and its CI must run both
once the service exists. While the design package lives only in the workspace
its API has no version, so a breaking change is caught by the page's build and
tests, not by a version number. The clock and the reconcile loop are code this
repository owns and has to test, where a library would have brought its own
tests. React state cannot be shared between Astro islands without a store;
the hero and the tour do not share state, so nothing needs one yet. The
build-time numbers go stale until the status service ships.

The choice is worth revisiting when a second application takes on the design
package (it moves to npm, and possibly to its own repository), or when the
page grows interactive parts that need shared state across islands.
