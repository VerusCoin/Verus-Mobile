import React from 'react';
import SelectionSheet, {SelectionRow} from '../../../../components/SelectionSheet';
import useSheetDismissal from '../../../../components/useSheetDismissal';

// Chooses where the address blocklist comes from. The choice applies after
// the sheet closes.
const BlocklistSourceSheet = ({
  onClose,
  onClosed,
  onSelect,
  options,
  selectedType,
  visible,
}) => {
  const dismissal = useSheetDismissal({visible, onClose, onClosed});

  return (
    <SelectionSheet
      title="Blocklist source"
      visible={visible}
      onClose={dismissal.close}
      onClosed={dismissal.onClosed}>
      {options.map(option => (
        <SelectionRow
          key={option.type}
          title={option.title}
          subtitle={option.description}
          selected={option.type === selectedType}
          onPress={() => dismissal.dismiss(() => onSelect(option.type))}
        />
      ))}
    </SelectionSheet>
  );
};

export default BlocklistSourceSheet;
