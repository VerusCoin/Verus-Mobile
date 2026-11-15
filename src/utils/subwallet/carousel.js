/** Keep the selected wallet first without searching indefinitely for a removed ID. */
export const prepareSubWalletCarousel = (wallets, selectedWallet) => {
  const available = Array.isArray(wallets) ? wallets : [];
  const selectedIndex = selectedWallet == null
    ? -1
    : available.findIndex(wallet => wallet.id === selectedWallet.id);
  const ordered = selectedIndex > 0
    ? available.slice(selectedIndex).concat(available.slice(0, selectedIndex))
    : available;

  return ordered.map((wallet, index) => ({...wallet, index}));
};
