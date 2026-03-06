export const darkColors = {
  navy:       '#0d1b2a',
  navyMid:    '#1b2d42',
  navyLight:  '#243854',
  cream:      '#f5f0e8',
  creamDark:  '#d4cfc7',
  gold:       '#c9a84c',
  goldLight:  '#e8c97a',
  teal:       '#2cb4b4',
  tealLight:  '#4dd4d4',
};

export const lightColors = {
  navy:       '#f5f0e6',
  navyMid:    '#ece7da',
  navyLight:  '#d5ccba',
  cream:      '#1e2a3a',
  creamDark:  '#3d4f63',
  gold:       '#b07820',
  goldLight:  '#8a5c10',
  teal:       '#1a9090',
  tealLight:  '#0d7070',
};

// Default export for backward compat (dark theme)
export const colors = darkColors;

export type Colors = typeof darkColors;

export const sizes = {
  cell: 38,
  tile: 32,
  borderRadius: 4,
};
