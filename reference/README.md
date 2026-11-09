# Reference: the accepted prototype

The visual baseline for `apps/site` and `packages/design`: version 11 of the
"Working model" prototype, accepted on 2026-11-09. It is a single HTML page
built by a small Python generator. It is kept as it was accepted and is not
changed; the build in this repository is compared against it.

| File         | What it is                                                                  |
| ------------ | --------------------------------------------------------------------------- |
| `index.html` | The built page. Open it in a browser.                                       |
| `page.html`  | The source: styles, markup with markers, and the scripts.                   |
| `base.css`   | The reset and base rules, inlined at the `/*BASE*/` marker.                 |
| `parts.py`   | The isometric model: the projection, the boxes and the scene, as SVG.       |
| `build.py`   | Inlines `base.css` and the output of `parts.py` into `page.html`.           |

Rebuild with `python3 -I reference/build.py`. The output is byte-identical to
the committed `index.html`.
