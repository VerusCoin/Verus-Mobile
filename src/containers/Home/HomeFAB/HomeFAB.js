import * as React from 'react';
import { FAB, Portal } from 'react-native-paper';
import Colors from '../../../globals/colors';

const HomeFAB = (props) => {
  const { handleAddCoin, handleVerusPay } = props
  const [state, setState] = React.useState({ open: false });

  const onStateChange = ({ open }) => setState({ open });

  const { open } = state;

  return (
    <Portal>
      <FAB.Group
        fabStyle={{
          backgroundColor: Colors.primaryColor,
        }}
        open={open}
        icon={open ? "minus" : "plus"}
        actions={[
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
        ]}
        onStateChange={onStateChange}
      />
    </Portal>
  );
};

export default HomeFAB; 