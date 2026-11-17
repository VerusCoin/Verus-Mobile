// Header titles of the wallet setup steps. Form steps show their title in the
// progress header; screens led by an icon (biometrics, shielded address, NFC)
// keep their large title and leave the header title empty.
export const SETUP_STEP_TITLES = {
  NAME: 'Personalize wallet',
  PASSWORD: 'Create password',
  SEED_INTRO: 'Back up wallet',
  SEED_WORDS: 'Recovery phrase',
  SEED_VERIFY: 'Verify phrase',
  IMPORT_SEED: 'Import phrase',
  IMPORT_SEED_REVIEW: 'Review phrase',
  IMPORT_TEXT: 'Import wallet',
};

export const getSeedWordsTitle = verifying =>
  verifying ? SETUP_STEP_TITLES.SEED_VERIFY : SETUP_STEP_TITLES.SEED_WORDS;

export const getImportSeedTitle = reviewing =>
  reviewing
    ? SETUP_STEP_TITLES.IMPORT_SEED_REVIEW
    : SETUP_STEP_TITLES.IMPORT_SEED;
