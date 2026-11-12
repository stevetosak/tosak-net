---
title: "Each tosak application keeps its own brand through a theme of the design system"
description: "Why the tosak design system shares components, behaviour and token names but not one look: the landing page's values are the default theme, and an application such as doma keeps its own palette and type."
type: decision
status: accepted
date: 2026-11-12
---

The design system began as the base of the landing page, with the values of
its accepted prototype: a studio grey paper and ink, one magenta accent for
what is new, and Rethink Sans with Spline Sans Mono
([the build shape](./0001-the-landing-page-is-static-astro-with-react-islands-in-one-repository-with-its-design-system.md)).
The landing page's Plan calls that design the baseline for later tosak
applications, and the
[design system's Plan](../plans/design-system-a-package-the-tosak-applications-share.md)
had to say what "baseline" means before a second application takes the
package on.

The candidates did not start from nothing. doma has a brand of its own,
written down in its `DESIGN.md`: a household ledger in a warm ground and
card, dark ink and one warm red accent, set in Outfit, Work Sans and
JetBrains Mono, with rules that depend on that palette, such as its three
priority levels drawn as three values of the accent's hue. Authos UI styles
its controls through shadcn/ui's tokens in its own `index.css`. The choice is hard to reverse once applications are built on
the package: what its components read, fixed values or names an application
can set, becomes the contract every application depends on.

## The decision

The design system shares its components, their behaviour and the names of
the tokens they read, not their values. The values form a theme. The landing
page's values are the default theme, and an application can supply its own
values for the same role tokens, in one CSS layer or one Tailwind `@theme`
block, and keep its own colours, families and radii. The isometric model
kit's face, slab and lamp colours are not role tokens; they belong to the
landing page and stay out of every theme.

## Why this and not the alternatives

One look for every tosak application was the simpler option: one set of
values, no theme contract, no tests per theme, and applications that look
like one family at a glance. It lost because doma's brand is accepted and
documented, and it is the identity of a household product, while the
landing page's look is the identity of the platform it runs on. Making doma
take the factory's grey and magenta would discard finished design work and
the rules written on top of it.

Keeping a separate set of components in each application, with no shared
package, lost for the opposite reason. What the applications have in common
is not colour but behaviour: focus, keyboard use, dialogs and menus that
pass an accessibility scan. That is the part most costly to build twice.

## What it costs

Every component of the package may read only role tokens, and every theme
the package ships needs tests that each role has a value and that its text
pairs pass contrast. The set of role tokens becomes an API: adding a role is
a change to every theme, so the set has to stay small. The tosak
applications will not look alike at a glance; the family shows in how they
behave and how they are laid out, not in their colours.

The choice is worth revisiting if the applications converge on one brand,
which would make the default theme the only one, or if the role set grows
until a theme is a second design system in all but name.
