import React from 'react';
import { Text, View, Modal } from 'react-native';
import Icon from 'react-native-vector-icons/AntDesign';
import data from './mockData';
import Styles from '../../../../styles';
import Colors from '../../../../globals/colors';

const ScannedInformation = ({ navigation }) => {
  const add = () => {};

  return (

    <View>
      { visible && (
      <Modal
        visible={visible}
        animationType="slide"
        transparent={false}
      >
        <View style={Styles.defaultRoot}>

          <View style={Styles.blockWithBorderBottom}>
            <Text style={Styles.textWithBlackColor}>COVID-19</Text>
            <Icon name="checkcircle" color={Colors.successButtonColor} size={23} />
          </View>
          <View style={Styles.blockWithFlexStart}>
            <Text style={Styles.textWithRightPadding}>Status:</Text>
            <Text style={Styles.borderWithGreenColor}>{data.status}</Text>
          </View>

          <View style={Styles.blockWithFlexStart}>
            <Text style={Styles.textWithRightPadding}>Attested to by:</Text>
            <Text style={Styles.textWithBlackColor}>{data.attestedBy}</Text>
          </View>

          <View style={Styles.containerWithTopMargin}>
            <View style={Styles.blockWithBorderBottom}>
              <Text style={Styles.textWithBlackColor}>Goverment ID</Text>
              <Icon name="checkcircle" color={Colors.successButtonColor} size={23} />
            </View>

            <View style={Styles.blockWithFlexStart}>
              <Text style={Styles.textWithRightPadding}>ID:</Text>
              <Text style={Styles.textWithBlackColor}>{data.person.id}</Text>
            </View>
            <View style={Styles.blockWithFlexStart}>
              <Text style={Styles.textWithRightPadding}>Attested to by:</Text>
              <Text style={Styles.textWithBlackColor}>{data.person.attestedBy}</Text>
            </View>
          </View>
        </View>
      </Modal>
      )}
    </View>
  );
};

export default ScannedInformation;
