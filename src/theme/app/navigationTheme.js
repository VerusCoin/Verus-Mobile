export const createNavigationTheme = theme => ({
  dark: theme.isDark,
  colors: {
    primary: theme.colors.primary,
    background: theme.colors.background,
    card: theme.colors.surface,
    text: theme.colors.textPrimary,
    border: theme.colors.border,
    notification: theme.colors.danger,
  },
});
