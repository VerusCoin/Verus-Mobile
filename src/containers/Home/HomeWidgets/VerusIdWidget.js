import React from 'react';
import {View, Dimensions} from 'react-native';
import {Card, Paragraph} from 'react-native-paper';
import Colors from '../../../globals/colors';
import {VerusIdLogo} from '../../../images/customIcons';

const VerusIdWidget = props => {
  const {width} = Dimensions.get('window');

  return (
    <Card
      style={{
        height: 110,
        width: width / 2 - 16,
        borderRadius: 10,
        backgroundColor: Colors.ultraUltraLightGrey
      }}
      mode="elevated"
      elevation={5}>
      <Card.Content>
        <View
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
          }}>
          <Paragraph style={{fontSize: 16, fontWeight: 'bold'}}>
            {'Link & manage'}
          </Paragraph>
        </View>
        <VerusIdLogo
          width={110}
          height={60}
          style={{
            marginLeft: 3,
          }}
        />
      </Card.Content>
    </Card>
  );
};

export default VerusIdWidget;
