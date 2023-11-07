import React, { Component } from 'react';
import { connect } from 'react-redux';

import {
  Platform,
  View,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
  TouchableOpacity,
  Text,
  StyleSheet,

} from 'react-native';
import { TextInput, Portal, RadioButton, Dialog , Button, HelperText} from 'react-native-paper'
import {  Badge, CheckBox,  Button as ElementButton } from 'react-native-elements';

import { topProgress } from "./ValuBadgeProgress"

import Styles from '../../../../../../styles/index';
import Colors from '../../../../../../globals/colors';

//import { VALU_COUNTRIES } from '../../../../utils/constants/constants';
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

const ID_NAMES = {"drivers_license":"Drivers Licence",
                    "passport":"Passport",
                    "government_id":"Goverment ID"}


class KYCDocumentType extends Component {
  constructor(props) {
    super(props);
    this.state = {
      documentType: "",
      containsAddress: true,
      showDocumentPicker: false,
      errors: {documentType: null}
    };

  }

  handleSelect = () => {
    Keyboard.dismiss();
    this.props.navigation.navigate("KYCDocumentUpload", { documentType: this.state.documentType, containsAddress: this.state.containsAddress});
  };

  openMenu = () => this.setState({ showDocumentPicker: true });

  closeMenu = () => this.setState({ showDocumentPicker: false });


  render() {

    return (
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={Styles.root}>
          <View style={Styles.centralRow}>
            {topProgress(2)}
          </View>
          <View style={styles.mainInputView}>

            <View>
              <View style={{paddingTop: 70, paddingBottom: 10, paddingRight: 15, paddingLeft: 15,  borderRadius: 20, marginTop:1}}>
                <View>
                  <View >
                    <TouchableOpacity onPress={this.openMenu}>
                      <TextInput
                        returnKeyType="done"
                        label="Select Document Type:"
                        value={this.state.documentType && ID_NAMES[this.state.documentType]} 
                        mode={"outlined"}
                        onChangeText={(text) => { }}
                        autoCapitalize={"none"}
                        pointerEvents="none"
                        editable={false}
                        error={this.state.errors.documentType}
                      />
                      <HelperText type="error" visible={this.state.errors.documentType}>{this.state.errors.documentType}</HelperText>
                    </TouchableOpacity>
                  </View>
                </View>
                <Portal>
                  <Dialog visible={this.state.showDocumentPicker} onDismiss={this.closeMenu}>
                    <Dialog.Title>Select Identity Document</Dialog.Title>
                    <Dialog.Content>
                      <RadioButton.Group onValueChange={choice => this.setState({ documentType: choice })} value={this.state.documentType}>

                          <RadioButton.Item value="drivers_license" label="Drivers Licence"/>
                     


                          <RadioButton.Item value="passport" label="Passport"/>
   

      
                          <RadioButton.Item value="government_id" label="Government ID"/>


                      </RadioButton.Group>
                    </Dialog.Content>
                    <Dialog.Actions>
                      <Button onPress={this.closeMenu}>Done</Button>
                    </Dialog.Actions>
                  </Dialog>
                </Portal>
              </View>
              <View style={styles.dropdownInput}>

              </View>
              <CheckBox
                title='My document contains my current address'
                checked={this.state.containsAddress}
                onPress={() => this.setState({ containsAddress: !this.state.containsAddress })}
              />
              <View style={styles.buttonContainerBottom}>
              <ElementButton
                titleStyle={{...Styles.whiteText, fontWeight: 'bold'}}
                buttonStyle={{backgroundColor:Colors.primaryColor, paddingTop: 10, paddingBottom: 10, paddingRight: 15, paddingLeft: 15,  borderRadius: 20, marginTop:40} }
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


export {
  KYCDocumentType
}

export default connect(mapStateToProps)(KYCDocumentType);
