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
        label={"Brop"}
        open={open}
        icon={open ? "minus" : "plus"}
        actions={[
          {
            icon: 'qrcode-scan',
            label: 'Scan VerusPay Invoice',
            onPress: handleVerusPay,
          },
          {
            icon: 'plus',
            label: 'Add Coin',
            onPress: handleAddCoin,
          },
        ]}
        onStateChange={onStateChange}
        onPress={() => {
          if (open) {
            // do something if the speed dial is open
          }
        }}
      />
    </Portal>
  );
};

export default HomeFAB; 