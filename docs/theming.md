# Theming

## Overview
ThemeProvider controls light/dark/auto and accent color. useThemeStyles centralizes class tokens.

## Flow
```mermaid
graph TD
  A[ThemeProvider] --> B[Persist setting]
  A --> C[Apply class on html]
  A --> D[Expose hook]
  D --> E[useThemeStyles]
  E --> F[Component styles]
```

## Key Concepts
- Theme mode: light, dark, auto.
- Accent: user-selected color used across UI.
- Centralized styles: useThemeStyles to prevent style drift.

## Related Files
- src/context/ThemeContext.jsx
- src/hooks/useThemeStyles.js
- THEME_REFACTOR_GUIDE.md
