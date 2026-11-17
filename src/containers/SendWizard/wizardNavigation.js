export const closeWizard = navigation => {
  const parent = navigation.getParent?.();
  if (parent?.goBack) parent.goBack();
  else navigation.goBack();
};
