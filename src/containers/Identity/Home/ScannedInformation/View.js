import React from 'react';
import { Text, View } from 'react-native';
import Modal from '../../../../components/Modal'
//import Icon from 'react-native-vector-icons/AntDesign';
import data from './mockData';
import Styles from '../../../../styles';
import Colors from '../../../../globals/colors';
import StandardButton from '../../../../components/StandardButton';
import { truncateString } from '../../PersonalInfo/ClaimManager/utils/truncateString';

const getClaimData = (name) => {
  if (name.length > 20) return `${truncateString(name, 20)}...`;
  return name;
};

const ScannedInformation = (props) => {
  const {
    visible,
    actions: { setScanInfoModalVisibility },
  } = props;


  const cancelHandler = () => {
    setScanInfoModalVisibility(false);
  };
  return (

    <View>
      { visible && (
      <Modal
        visible={visible}
        animationType="slide"
        transparent={false}
      >
        <View style={Styles.rootWithoutPadding}>
          <View style={Styles.headerContainer}>
            <Text style={Styles.centralHeader}>
              Scan results
            </Text>
          </View>
          <View style={Styles.padding}>
            <View style={Styles.blockWithBorderBottom}>
              <Text style={Styles.textWithBlackColor}>The Department of Health@</Text>
              {/* <Icon name="checkcircle" color={Colors.verusGreenColor} size={23} /> */}
            </View>
            <View style={Styles.marginVertical}>
              <View style={Styles.blockWithBorderBottom}>
                <View style={Styles.flexRow}>
                  <Text style={Styles.textWithRightPadding}>Birth Date:</Text>
                  <Text style={Styles.textWithBlackColor}>{getClaimData(data.data)}</Text>
                </View>
                {/* <Icon name="checkcircle" color={Colors.verusGreenColor} size={23} /> */}
              </View>

              <View style={Styles.blockWithBorderBottom}>
                <View style={Styles.flexRow}>
                  <Text style={Styles.textWithRightPadding}>First name:</Text>
                  <Text style={Styles.textWithBlackColor}>{data.firstName}</Text>
                </View>
                {/* <Icon name="checkcircle" color={Colors.verusGreenColor} size={23} /> */}
              </View>

              <View style={Styles.blockWithBorderBottom}>
                <View style={Styles.flexRow}>
                  <Text style={Styles.textWithRightPadding}>Last name:</Text>
                  <Text style={Styles.textWithBlackColor}>{data.lastName}</Text>
                </View>
                {/* <Icon name="checkcircle" color={Colors.verusGreenColor} size={23} /> */}
              </View>
            </View>
          </View>
        </View>
        <View style={Styles.footerContainer}>
          <View style={[Styles.alignItemsCenter, Styles.paddingTop]}>
            <StandardButton
              buttonColor={Colors.warningButtonColor}
              title="CLOSE"
              onPress={cancelHandler}
            />
          </View>
        </View>
      </Modal>
      )}
    </View>
  );
};

export default ScannedInformation;
