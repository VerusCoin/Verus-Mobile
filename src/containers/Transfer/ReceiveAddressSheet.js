import React from 'react';
import SelectionSheet, {SelectionRow} from '../../components/SelectionSheet';
import useSheetDismissal from '../../components/useSheetDismissal';

const ReceiveAddressSheet = ({
  records,
  selectedIndex,
  onSelect,
  onClose,
  visible,
}) => {
  const dismissal = useSheetDismissal({visible, onClose});
  return (
    <SelectionSheet
      title="Choose an address"
      visible={visible}
      onClose={dismissal.close}
      onClosed={dismissal.onClosed}>
      {records.map((record, index) => (
        <SelectionRow
          key={`${record.address}-${index}`}
          title={record.label}
          subtitle={record.address}
          subtitleMonospace
          selected={index === selectedIndex}
          onPress={() => dismissal.dismiss(() => onSelect(index))}
        />
      ))}
    </SelectionSheet>
  );
};

export default ReceiveAddressSheet;
