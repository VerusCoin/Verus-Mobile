import React from 'react';
import SelectionSheet, {SelectionRow} from '../../../components/SelectionSheet';
import useSheetDismissal from '../../../components/useSheetDismissal';
import {ADDRESS_TYPE, shortAddress} from '../wizardUtils';

const SelfAddressSheet = ({
  addressType,
  addresses,
  onClose,
  onSelect,
  visible,
}) => {
  const dismissal = useSheetDismissal({visible, onClose});
  return (
    <SelectionSheet
      title="Your addresses"
      subtitle={`${
        addressType === ADDRESS_TYPE.ETHEREUM ? 'Ethereum' : 'Verus'
      } addresses in this wallet`}
      visible={visible}
      onClose={dismissal.close}
      onClosed={dismissal.onClosed}>
      {addresses.map(item => (
        // Each address stays on one line: its first and last six characters
        // (owner, 2026-11-13). Screen readers get the full address.
        <SelectionRow
          key={item.id || item.address}
          accessibilityLabel={[item.verusIdName, item.address].filter(Boolean).join(', ')}
          title={item.verusIdName || shortAddress(item.address)}
          titleMonospace={!item.verusIdName}
          subtitle={item.verusIdName ? shortAddress(item.address) : undefined}
          subtitleMonospace
          onPress={() => dismissal.dismiss(() => onSelect(item))}
        />
      ))}
    </SelectionSheet>
  );
};

export default SelfAddressSheet;
