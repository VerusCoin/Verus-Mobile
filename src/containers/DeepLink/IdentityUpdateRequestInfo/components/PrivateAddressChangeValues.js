import React, {useMemo} from 'react';
import {InfoSheetRow} from '../../../../components/InfoSheetSection';
import {requestCardStyles} from '../../../../styles';
import {useOnboardingTheme} from '../../../../theme/onboarding';
import {truncateMiddle} from '../../../../utils/subwallet/cardPresentation';

// All three review surfaces show the same raw addresses and empty-state copy.
// InfoSheetRow supplies CopyAction only when an address exists. The compact
// form shortens each address to its start and end, so both values stay above
// a fixed confirm button on small phones; the copy action still copies the
// full value. Android ignores ellipsizeMode on selectable text, so the
// shortening happens here.
const PrivateAddressChangeValues = ({change, compact = false}) => {
  const theme = useOnboardingTheme();
  const styles = useMemo(() => requestCardStyles(theme), [theme]);

  return (
    <>
      {[
        ['Current', change.beforeAddress],
        ['After update', change.afterAddress],
      ].map(([label, address]) => (
        <InfoSheetRow
          key={label}
          label={label}
          value={
            address
              ? compact
                ? truncateMiddle(address, 10, 8, '…')
                : address
              : 'No private address'
          }
          copy={!!address}
          copyValue={address || undefined}
          valueStyle={address ? styles.identifier : undefined}
        />
      ))}
    </>
  );
};

export default PrivateAddressChangeValues;
