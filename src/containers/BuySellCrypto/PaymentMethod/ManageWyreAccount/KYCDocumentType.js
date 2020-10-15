import React, { Component } from 'react';
import { connect } from 'react-redux';
import ImagePicker from 'react-native-image-picker';
import {
  Platform,
  View,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
  Image,
  Text,
  StyleSheet,

} from 'react-native';

import { Dropdown } from 'react-native-material-dropdown';
import {
  FormLabel,
  FormValidationMessage
} from 'react-native-elements';

import Spinner from 'react-native-loading-spinner-overlay';

import {Button, Badge,  CheckBox } from 'react-native-elements';

import {
  selectWyreAccountField,
  selectWyrePutAccountIsFetching,
} from '../../../../selectors/paymentMethods';

import {
  uploadWyreAccountDocument
} from '../../../../actions/actions/PaymentMethod/WyreAccount';

import PrimeTrustInterface from '../../../../utils/PrimeTrust/provider';

import Styles from '../../../../styles/index';
import Colors from '../../../../globals/colors';
import { FlatList } from 'react-native-gesture-handler';
import { PRIMETRUST_COUNTRIES } from '../../../../utils/constants/constants';
const formatURI = (uri) => (
  Platform.OS === 'android' ? uri : uri.replace('file://', '')
);

//temporary code
const styles = StyleSheet.create({
  logo: {
    width: 66,
    height: 58,
  },
});


class KYCDocumentType extends Component {
  constructor(props) {
    super(props);
    this.state = {
      documentType: "drivers_license",
      containsAddress: true,
      documentCountry: "US"
    };

    if(PrimeTrustInterface.user === null) {
      //redirect to  the  login page
      console.log("redirecting to login page:");
      this.props.navigation.navigate("KYCStart");
    }
    
  }

  handleSelect = () => {
    Keyboard.dismiss();
    this.props.navigation.navigate("KYCDocumentUpload",{documentType: this.state.documentType,containsAddress: this.state.containsAddress,documentCountry: this.state.documentCountry});
  };

  
  render() {
    const scaleFactorY = 2;
    const scalefatorX = 2;

    return (
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={Styles.root}>
        <View style={Styles.centralRow}>
          <Badge
            status="success"
            badgeStyle={ {scaleX: scalefatorX, scaleY: scaleFactorY } }
            containerStyle={Styles.horizontalPaddingBox10}
          />
          <Badge
            status="success"
            badgeStyle={ {scaleX: scalefatorX, scaleY: scaleFactorY } }
            containerStyle={Styles.horizontalPaddingBox10}
          />
          <Badge
            status="primary"
            badgeStyle={ {scaleX: scalefatorX, scaleY: scaleFactorY } }
            containerStyle={Styles.horizontalPaddingBox10}
          />
          <Badge
            status="primary"
            badgeStyle={ {scaleX: scalefatorX, scaleY: scaleFactorY } }
            containerStyle={Styles.horizontalPaddingBox10}
          />
        </View>
          <View style={styles.mainInputView}>
            
            <View>
                <View style={styles.dropdownInput}>
                <Dropdown
                    label="Select Document Type"
                    labelTextStyle={{ fontFamily: 'Avenir-Book'}}
                    labelFontSize={13}
                    data={[{label:'Drivers License',value:'drivers_license'},{label:'Identity Card',value:'government_id'},{label:'Passport',value:'passport'}]}
                    onChangeText={(value) => this.setState({ documentType: value })}
                    textColor={Colors.quaternaryColor}
                    selectedItemColor={Colors.quaternaryColor}
                    baseColor={Colors.quaternaryColor}
                    value={this.state.documentType == null? 'drivers_license': this.state.documentType}
                    inputContainerStyle={styles.dropdownInputContainer}
                    pickerStyle={{backgroundColor: Colors.tertiaryColor}}
                />
                </View>
                <View style={styles.dropdownInput}>
                  <Dropdown
                    labelExtractor={(item) => item.value}
                    valueExtractor={(item) => item.value}
                    label="Country: "
                    labelTextStyle={{ fontWeight: '700' }}
                    labelFontSize={13}
                    data={PRIMETRUST_COUNTRIES}
                    onChangeText={(value) => this.setState({ documentCountry: value })}
                    textColor={Colors.quaternaryColor}
                    selectedItemColor={Colors.quaternaryColor}
                    baseColor={Colors.quaternaryColor}
                    value={this.state.country ? `${this.state.documentCountry}` : ''}
                    inputContainerStyle={styles.dropdownInputContainer}
                    pickerStyle={{backgroundColor: Colors.tertiaryColor}}
                  />
              </View>
                <CheckBox
                    title='My document contains my current address'
                    checked={this.state.containsAddress}
                    onPress={() => this.setState({containsAddress: !this.state.containsAddress})}
                />
                <View style={styles.buttonContainerBottom}>
                    <Button
                    titleStyle={Styles.whiteText}
                    buttonStyle={Styles.defaultButtonClearWhite}
                    title="NEXT"
                    onPress={this.handleSelect}
                    />
                </View>
            </View>
          </View>
          
        </View>
      </TouchableWithoutFeedback>
    );
  }
}

const mapStateToProps = (state) => ({
  documentType: state.documentType,
  includeAddress: state.includeAddress
});

const mapDispatchToProps = ({
  uploadWyreAccountDocument,
});

export {
  KYCDocumentType
}

export default connect(mapStateToProps, mapDispatchToProps)(KYCDocumentType);
