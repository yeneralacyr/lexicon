```markdown
# Design System Strategy: The Industrial Monolith

## 1. Overview & Creative North Star
The Creative North Star for this design system is **"Machine-Age Minimalism."** This system moves beyond standard "clean" UI into a space of intentional, industrial precision. It treats the digital interface as a physical piece of high-end hardware—functional, quiet, and unapologetically high-contrast.

We break the "template" look by rejecting traditional decoration. Instead, we use **Aggressive Whitespace** and **Technical Grids**. This is not an interface meant to entertain; it is meant to empower. By utilizing a "Dot-Matrix" ethos and shifting between raw, unyielding black and ethereal off-white, we create a signature aesthetic that feels both archival and futuristic.

## 2. Colors: The Tonal Foundation
This system operates on a monochrome spectrum. Color is an exception, used only for critical errors. 

### The "No-Line" Rule
Traditional 1px solid borders are strictly prohibited for sectioning. Boundaries must be defined through background color shifts. To separate a header from a body, or a sidebar from a main view, transition from `surface` (#f9f9f9) to `surface-container-low` (#f3f3f3). This creates a sophisticated, "etched" look rather than a boxed-in feel.

### Surface Hierarchy & Nesting
Think of the UI as a series of nested precision-cut plates.
*   **Base Layer:** `surface` (#f9f9f9)
*   **Secondary Content Areas:** `surface-container` (#eeeeee)
*   **Interactive Cards/Modules:** `surface-container-lowest` (#ffffff) for a "lifted" feel.
*   **The "Glass & Gradient" Rule:** For floating modals or high-end overlays, use `surface-container-lowest` at 80% opacity with a `20px` backdrop-blur. This softens the industrial edge with a premium "frosted glass" finish.

### Signature Textures
Main CTAs or Hero backgrounds should utilize a subtle linear gradient from `primary` (#000000) to `primary_container` (#3b3b3b). This prevents pure black from appearing "dead" on OLED screens and adds a machined, metallic depth.

## 3. Typography: Editorial Authority
The typography is the soul of this system. It balances the technical precision of a blueprint with the boldness of a fashion magazine.

*   **Display & Headlines (Space Grotesk):** These are your "Machine Parts." Use `display-lg` (3.5rem) with tight letter-spacing (-0.02em) for a high-impact, industrial look. Headlines should feel architectural.
*   **Body & Labels (Inter):** These are your "Technical Specs." Inter provides neutral, high-readability. Use `body-md` (0.875rem) for most content to maximize whitespace.
*   **Hierarchy Tip:** Pair a `display-sm` headline with a `label-sm` (all caps, 0.05em tracking) immediately above it to mimic industrial labeling or serial numbers.

## 4. Elevation & Depth
We eschew traditional drop shadows in favor of **Tonal Layering**.

*   **The Layering Principle:** Depth is achieved by "stacking." A `surface-container-lowest` card sitting on a `surface-container` background provides all the visual separation required.
*   **Ambient Shadows:** If a component must float (e.g., a floating action button), use an ultra-diffused shadow: `box-shadow: 0 10px 30px rgba(0, 0, 0, 0.04)`.
*   **The "Ghost Border" Fallback:** For input fields or cards where definition is required, use a "Ghost Border": the `outline-variant` (#c6c6c6) at **20% opacity**. It should be felt, not seen.
*   **Dot-Matrix Hint:** In large empty states or hero backgrounds, implement a `12px` grid of `1px` dots using `outline-variant` at 30% opacity to reinforce the industrial aesthetic.

## 5. Components: Functional Primitives

### Buttons
*   **Primary:** Pure black (`primary`) with `on_primary` text. No shadow. `0.375rem` (md) roundedness.
*   **Secondary:** `surface-container-lowest` background with a `1px` border of `outline` (#777777). 
*   **Tertiary:** Ghost style. No background, `label-md` bold text with an underline that only appears on hover.

### Input Fields
*   **Style:** Flat `surface-container-low` background with a bottom-only `2px` border using `primary` for the active state. 
*   **Typography:** Labels use `label-sm` in `on_surface_variant` (#474747).

### Cards & Lists
*   **Rule:** Forbid divider lines.
*   **Implementation:** Use the Spacing Scale `6` (2rem) to separate list items. If grouping is needed, wrap the group in a `surface-container` block with `lg` (0.5rem) corner radius.

### The "Status Chip"
Instead of standard rounded pills, use "Technical Chips": `none` (0px) or `sm` (0.125rem) corner radius, using `secondary_container` with `on_secondary_container` text. It should look like a label from a thermal printer.

## 6. Do's and Don'ts

### Do:
*   **Embrace the Grid:** Align everything to the `8.5rem` (24) or `7rem` (20) gutters for a rigid, intentional layout.
*   **Use Mono-spacing for numbers:** When displaying data, use a mono-spaced font or Inter’s tabular num features to keep the "instrument cluster" feel.
*   **Vary Weight, Not Color:** Use `bold` vs `regular` to show hierarchy before reaching for a different gray scale.

### Don't:
*   **Don't use Rounded Corners > 0.75rem:** Anything too round feels "bubbly" and consumer-grade. Stay within the `sm` to `lg` range.
*   **Don't use Color for decoration:** If it’s not an error (`#ba1a1a`) or a primary action (`#000000`), it should likely be a shade of gray.
*   **Don't crowd the screen:** If you feel the need to add a divider line, try adding `2rem` of whitespace instead. If it still feels messy, your information architecture is the problem, not the visual styling.

### Accessibility Note
Ensure that all `on_surface_variant` text meets a 4.5:1 contrast ratio against `surface` colors. While we value the "Quiet" vibe, functional clarity is the ultimate luxury.