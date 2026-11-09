export const convertFqnToDisplayFormat = fqn => {
  if (typeof fqn !== 'string' || !fqn) return fqn;

  // Only the mainnet root suffix is optional in a displayed identity name.
  // Keep every other parent and consistently end the name with @.
  const name = fqn.replace(/@$/, '').replace(/\.VRSC$/i, '');
  return `${name}@`;
};
