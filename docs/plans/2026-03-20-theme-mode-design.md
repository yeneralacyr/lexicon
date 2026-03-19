# Theme Mode Design

## Objective

Add a real dark mode system that:

- follows the device color scheme on first launch,
- can be overridden from Settings,
- persists in SQLite using `app_settings.theme_mode`,
- updates the full app surface, not only text and background.

## Decision

Use a three-state preference:

- `system`
- `light`
- `dark`

`system` is the default and resolves from `useColorScheme()`. The resolved theme is then applied to:

- React Navigation theme
- `StatusBar`
- `SystemUI`
- all app surfaces and text tokens

## Data Model

The `StudySettings` model is extended with:

- `themeMode: 'system' | 'light' | 'dark'`

`app_settings.theme_mode` is stored alongside the existing limits and notification preferences. Reset returns this value to `system`.

## UI Behavior

Settings replaces the placeholder theme row with a real segmented control:

- `Auto`
- `Light`
- `Dark`

Dark mode visual rules:

- page background: black
- main text: white
- surface cards: charcoal / near-black layers
- borders and muted labels: soft gray
- controls keep high contrast and remain readable

## Architecture

A root theme provider resolves the active theme from:

1. persisted `theme_mode`
2. system color scheme

It exposes:

- active color palette
- resolved mode
- preference mode
- navigation theme

Components and screens consume the active palette instead of the old static singleton.

## Scope

This pass covers the main product surfaces:

- splash
- onboarding
- today
- library
- search
- settings
- session
- session complete
- word detail
- shared navigation and core UI primitives

## Verification

- first launch follows system theme
- changing Settings to `Light` or `Dark` persists across relaunch
- changing back to `Auto` resumes system behavior
- dark mode renders black backgrounds with white text across main screens
- `npm run typecheck` passes
