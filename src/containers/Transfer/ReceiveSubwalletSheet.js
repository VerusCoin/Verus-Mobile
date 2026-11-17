import React, {useMemo} from 'react';
import {useSelector} from 'react-redux';
import {Text} from 'react-native';
import SelectionSheet, {
  SelectionGroup,
  SelectionRow,
} from '../../components/SelectionSheet';
import useSheetDismissal from '../../components/useSheetDismissal';
import {createSelectionSheetStyles} from '../../styles';
import {useOnboardingTheme} from '../../theme/onboarding';
import {CoinDirectory} from '../../utils/CoinData/CoinDirectory';
import {
  getSubWalletCardType,
  getSubWalletDisplayIdentifier,
  truncateMiddle,
} from '../../utils/subwallet/cardPresentation';

const getNetworkDetails = wallet => {
  const networkId =
    wallet.network || wallet.channel?.split('.')?.[2] || 'unknown';
  try {
    const coin = CoinDirectory.findCoinObj(networkId, null, true);
    return {
      id: networkId,
      name: coin.display_name || coin.display_ticker || networkId,
    };
  } catch (e) {
    return {id: networkId, name: networkId === 'unknown' ? 'Other' : networkId};
  }
};

const ReceiveSubwalletSheet = ({
  balanceMap = {},
  coinObj,
  onClose,
  onClosed,
  onSelect,
  selectedId,
  subWallets = [],
  visible,
}) => {
  const activeAccount = useSelector(state => state.authentication.activeAccount);
  const theme = useOnboardingTheme();
  const styles = useMemo(() => createSelectionSheetStyles(theme), [theme]);
  const dismissal = useSheetDismissal({visible, onClose, onClosed});
  const groups = useMemo(() => {
    const result = new Map();
    subWallets.forEach(wallet => {
      const network = getNetworkDetails(wallet);
      if (!result.has(network.id))
        result.set(network.id, {...network, wallets: []});
      result.get(network.id).wallets.push(wallet);
    });
    return Array.from(result.values());
  }, [subWallets]);

  if (!coinObj) return null;
  return (
    <SelectionSheet
      title="Choose an address"
      visible={visible}
      onClose={dismissal.close}
      onClosed={dismissal.onClosed}>
      {groups.length === 0 ? (
        // Never present an empty chooser: the invoking screen keeps the user
        // on an accurate empty state instead of opening this sheet.
        <Text style={styles.empty}>
          No receiving address is available for this asset.
        </Text>
      ) : (
        groups.map(group => {
          const rows = group.wallets.map(wallet => {
            const cardType = getSubWalletCardType(wallet);
            const title = cardType === 'VerusID' ? wallet.name : cardType;
            const privateAddress = cardType === 'Private'
              ? getSubWalletDisplayIdentifier(
                  wallet,
                  activeAccount,
                  coinObj.id,
                  false,
                )
              : null;
            const subtitle = cardType === 'Transparent'
              ? wallet.name
              : privateAddress && privateAddress !== '-'
              ? truncateMiddle(privateAddress, 5, 5, '...')
              : undefined;
            const balance = Number(balanceMap[wallet.id] || 0).toFixed(4);
            return (
              <SelectionRow
                key={wallet.id}
                title={title}
                titleNumberOfLines={cardType === 'VerusID' ? 1 : undefined}
                subtitle={subtitle}
                subtitleMonospace
                accessibilityLabel={`Receive with ${title}${subtitle ? `, ${subtitle}` : ''}, ${balance} ${coinObj.display_ticker}`}
                selected={
                  selectedId == null ? undefined : wallet.id === selectedId
                }
                value={balance}
                valueLabel={coinObj.display_ticker}
                onPress={() => dismissal.dismiss(() => onSelect(wallet))}
              />
            );
          });
          return groups.length === 1 ? rows : (
            <SelectionGroup key={group.id} title={group.name}>
              {rows}
            </SelectionGroup>
          );
        })
      )}
    </SelectionSheet>
  );
};

export default ReceiveSubwalletSheet;
