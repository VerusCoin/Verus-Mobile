// iOS makes the app inactive while its Face ID or Touch ID sheet is open. The
// app's privacy cover must not hide the screen behind its own sheet (wallet
// setup, sign-in), so keychain reads that can show the sheet run through here.
let openPrompts = 0;

export const isBiometricPromptOpen = () => openPrompts > 0;

export const withBiometricPrompt = async read => {
  openPrompts += 1;

  try {
    return await read();
  } finally {
    openPrompts -= 1;
  }
};
