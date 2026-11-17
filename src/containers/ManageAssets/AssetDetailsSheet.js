import React, {useMemo} from 'react';
import {TouchableOpacity, View} from 'react-native';
import {Text} from 'react-native-paper';
import {Trash2} from 'lucide-react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import InfoSheet from '../../components/InfoSheet';
import {createSignedOutSheetStyles} from '../../styles/components/signedOutSheet.styles';
import {useOnboardingTheme} from '../../theme/onboarding';
import {AssetLogo, ReviewRow} from './AssetManagementComponents';
import {createManageAssetsStyles} from './manageAssets.styles';

const ASSET_KIND = {vrsc: 'Verus currency', erc20: 'ERC-20 token'};

// Opened from a Manage assets row. The facts help the user recognise an asset
// before removing it; the remove row matches "Remove from this device" in the
// gift card options sheet. It is an information sheet: the facts and the
// remove row scroll above the pinned Done.
const AssetDetailsSheet = ({amount, coin, onClose, onClosed, onRemove, presentation, visible}) => {
  const theme = useOnboardingTheme();
  const styles = useMemo(() => createManageAssetsStyles(theme), [theme]);
  const sheetStyles = useMemo(() => createSignedOutSheetStyles(theme), [theme]);
  const kind = coin ? ASSET_KIND[coin.proto] : null;
  const identifierLabel = coin?.proto === 'vrsc' ? 'Currency ID' : coin?.proto === 'erc20' ? 'Contract address' : null;
  const header = coin ? (
    <View style={styles.sheetHeader}>
      <AssetLogo presentation={presentation} styles={styles} />
      <View style={styles.rowCopy}>
        <Text accessibilityRole="header" style={styles.reviewName}>{presentation.name}</Text>
        <Text style={styles.rowDescription}>{kind ? `${presentation.ticker} · ${kind}` : presentation.ticker}</Text>
      </View>
    </View>
  ) : null;
  return (
    <InfoSheet header={header} onClose={onClose} onClosed={onClosed} title={presentation?.name} visible={visible}>
      {coin ? <View testID="asset-details-sheet">
        <ReviewRow label="Balance" value={amount} styles={styles} />
        <ReviewRow label="Network" value={presentation.networkLabel} styles={styles} />
        {identifierLabel && coin.currency_id ? <ReviewRow label={identifierLabel} value={coin.currency_id} copy styles={styles} valueStyle={styles.sheetIdentifier} /> : null}
        <TouchableOpacity accessibilityRole="button" activeOpacity={0.74} onPress={onRemove} style={sheetStyles.actionRow} testID="asset-remove">
          <View style={[sheetStyles.actionIconContainer, sheetStyles.actionIcon]}>
            <Trash2 color={theme.colors.textPrimary} size={24} />
          </View>
          <Text style={sheetStyles.actionLabel}>Remove from wallet</Text>
          <MaterialCommunityIcons color={theme.colors.textSubtle} name="chevron-right" size={22} />
        </TouchableOpacity>
      </View> : null}
    </InfoSheet>
  );
};

export default AssetDetailsSheet;
