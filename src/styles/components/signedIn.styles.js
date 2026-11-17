export const createSignedInStyles = theme => ({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  safeScreen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  title: {
    ...theme.typography.headlineMd,
    color: theme.colors.textPrimary,
  },
  subtitle: {
    ...theme.typography.bodyMd,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
  },
  sectionTitle: {
    ...theme.typography.labelMd,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  surface: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.rounded.lg,
  },
  row: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  rowTitle: {
    ...theme.typography.bodyMd,
    color: theme.colors.textPrimary,
  },
  rowDescription: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginLeft: 56,
  },
  actionBar: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    backgroundColor: theme.colors.background,
    borderTopColor: theme.colors.border,
    borderTopWidth: 1,
  },
  actionButton: {
    minHeight: 52,
    flex: 1,
    borderRadius: theme.rounded.lg,
    justifyContent: 'center',
  },
});

export default createSignedInStyles;
