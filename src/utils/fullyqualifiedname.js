export const convertFqnToDisplayFormat = fqn => {
  if (typeof fqn !== 'string' || !fqn) return fqn;

  // Only the mainnet root suffix is optional in a displayed identity name.
  // Keep every other parent and consistently end the name with @.
  const name = fqn.replace(/@$/, '').replace(/\.VRSC$/i, '');
  return `${name}@`;
};

// Lets a long VerusID name wrap after a dot instead of inside a name part.
// Display only: the inserted zero-width spaces must not reach copied text.
export const withNameBreaks = name =>
  typeof name === 'string' ? name.replace(/\./g, '.\u200B') : name;
