# Course diagram style

Each figure explains one retrievable idea through explicit connectors,
restrained emphasis and accessible SVG labels.

## Colors and typography

Source: [Midnight Brand Hub](https://midnight.network/brand-hub).
The official brand guide specifies Midnight Black `#0A0A0A`, White `#FFFFFF`,
Blue `#0000FE`, and Outfit. The course adapts these colors for readable teaching diagrams.

| Role | Course value | Basis |
|---|---|---|
| paper | `#FAFAF7` | Near-white adaptation for the diagram surface |
| paper-2 | `#F0F0EE` | Derived neutral grouping surface |
| node surface | `#FFFFFF` | Official White |
| ink | `#0A0A0A` | Official Midnight Black |
| muted / soft | `#54545C` | Derived readable neutral |
| rule | `#C7C7CC` | Decorative separator only |
| node boundary | `#7A7A84` | Derived visible neutral outline |
| accent / link | `#0000FE` | Official Blue |
| accent-tint | `#EEEEFF` | Derived pale focal surface |
| title | Outfit, weight 500 | Official family; course role weight |
| node name | Outfit, weight 600 | Official family; course role weight |
| body | Outfit, weight 400 | Official family; course role weight |
| technical label | Geist Mono, weight 400–500 | Course monospace choice |

Outfit is requested through Google's public CSS2 service in the standalone HTML.
Arial/sans-serif remains a disclosed fallback when fonts cannot load, including
Markdown image viewers that block SVG font requests. Technical labels fall back
to the platform monospace face. No proprietary fonts or brand logos are copied.

## Diagram source and outputs

`catalog.json` holds diagram labels, relationships, explicit positions, and source
block IDs. `build.py` generates self-contained HTML with inline SVG. Each HTML
file also has a sibling SVG with matching labels, layout and font imports.
Markdown embeds the SVG and links it to the full-size HTML document.

The canvas is 1280 pixels wide with a content-fitted height. Larger figures are
split where distinct concepts need separate attention. Public state uses an inset
vertical rule; private inputs use dashed borders; decisions use diamonds; terminal
outcomes use rounded capsules. Blue identifies the focal idea, not every step.
Arrow labels sit above or beside their connectors, with opaque masks and clear gaps.
The footer supplies one retrieval cue. Standalone HTML scrolls locally on small
screens and scales to the page when printed.
