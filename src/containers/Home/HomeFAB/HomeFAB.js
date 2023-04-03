import * as React from 'react';
import { Platform } from 'react-native';
import { FAB, Portal } from 'react-native-paper';
import Colors from '../../../globals/colors';

const HomeFAB = (props) => {
  const { handleAddCoin, handleVerusPay, handleEditCards } = props
  const [state, setState] = React.useState({ open: false });

  const onStateChange = ({ open }) => setState({ open });

  const { open } = state;

  const actions =
    Platform.OS === 'ios'
      ? [
          {
            icon: 'qrcode-scan',
            label: 'Scan QR Code',
            onPress: handleVerusPay,
          },
          {
            icon: 'format-list-bulleted',
            label: 'Manage Coins',
            onPress: handleAddCoin,
          },
        ]
      : [
          {
            icon: 'qrcode-scan',
            label: 'Scan QR Code',
            onPress: handleVerusPay,
          },
          {
            icon: 'swap-horizontal-variant',
            label: 'Configure Home Cards',
            onPress: handleEditCards,
          },
          {
            icon: 'format-list-bulleted',
            label: 'Manage Coins',
            onPress: handleAddCoin,
          },
        ];


  return (
    <Portal>
      <FAB.Group
        fabStyle={{
          backgroundColor: Colors.primaryColor,
        }}
        open={open}
        icon={open ? "minus" : "plus"}
        actions={actions}
        onStateChange={onStateChange}
      />
    </Portal>
  );
};

export default HomeFAB; 