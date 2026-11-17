import React from 'react';
import {Platform, StyleSheet, Text, View} from 'react-native';
import AppButton from '../../components/AppButton';
import CopyAction from '../../components/CopyAction';
import SignedOutActionRow from '../../components/SignedOutActionRow';
import {ExternalLink} from 'lucide-react-native';
import {revokeRecoverFlowStyles as styles} from '../../styles';
import {useAppTheme} from '../../theme/app';
import RevokeRecoverFlowScaffold from './RevokeRecoverFlowScaffold';
import RecoveryValues, {IdentityContext, RecoveryValue} from './RecoveryValues';

const RevokeRecoverSubmittedResult = ({
  action,
  deliveryUnknown,
  identityName,
  networkName,
  onDone,
  onViewTransaction,
  txid,
  values,
}) => {
  const theme = useAppTheme();
  const recovery = action === 'recovery';
  return (
    <RevokeRecoverFlowScaffold
      actions={
        <AppButton onPress={onDone} testID="revokeRecover.result.done">
          Done
        </AppButton>
      }
      backDisabled
      showBack={false}
      showProgress={false}
      headerTitle={deliveryUnknown ? 'Delivery not confirmed' : recovery ? 'Recovery submitted' : 'Revocation submitted'}
      keyboardAvoiding={false}>
      <Text
        style={[
          theme.typography.bodyMd,
          localStyles.body,
          {color: theme.colors.textSecondary},
        ]}>
        {deliveryUnknown
          ? 'The network may have received this update. Check the transaction before you start another review.'
          : recovery
          ? 'Your VerusID becomes active after one network confirmation.'
          : 'Your VerusID becomes revoked after one network confirmation.'}
      </Text>
      <IdentityContext name={identityName} networkName={networkName} />
      <View style={localStyles.transaction}>
        <Text
          style={[
            theme.typography.labelMd,
            {color: theme.colors.textSecondary},
          ]}>
          Transaction ID
        </Text>
        <View style={styles.txidRow}>
          <Text
            ellipsizeMode="middle"
            numberOfLines={1}
            selectable={Platform.OS === 'ios'}
            style={[styles.txid, {color: theme.colors.textPrimary}]}>
            {txid}
          </Text>
          <CopyAction accessibilityLabel="Copy transaction ID" value={txid} />
        </View>
        {onViewTransaction ? (
          <SignedOutActionRow
            IconComponent={ExternalLink}
            label="View transaction"
            onPress={onViewTransaction}
          />
        ) : null}
      </View>
      {deliveryUnknown ? null : recovery ? (
        <RecoveryValues values={values} title="Submitted values" />
      ) : (
        <RecoveryValue label="Requested status" value="Active → Revoked" />
      )}
    </RevokeRecoverFlowScaffold>
  );
};
const localStyles = StyleSheet.create({
  body: {marginTop: 8, marginBottom: 18},
  transaction: {marginBottom: 18},
});
export default RevokeRecoverSubmittedResult;
