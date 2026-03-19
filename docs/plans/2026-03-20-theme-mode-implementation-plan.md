# Theme Mode Implementation Plan

1. Extend settings types and SQLite query helpers with `theme_mode`.
2. Create dynamic light/dark palettes and a root theme provider.
3. Apply resolved theme to `StatusBar`, `SystemUI`, and React Navigation.
4. Replace the Settings placeholder with a real `Auto / Light / Dark` control.
5. Migrate shared primitives and main-flow screens from static palette imports to runtime theme tokens.
6. Verify persistence and run typecheck.
