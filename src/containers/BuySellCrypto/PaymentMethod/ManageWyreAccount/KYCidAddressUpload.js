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

let doesContainAddress = false;


class KYCidAddressUploads extends Component {
  constructor(props) {
    super(props);
    this.state = {
      image: null,
      error: null,
      documents: [],
      isFetching: true
    };

    if(PrimeTrustInterface.user === null) {
      //redirect to  the  login page
      console.log("redirecting to login page:");
      this.props.navigation.navigate("KYCStart");
    }
    //load docs
    this.getUploadedDocuments();
    
  }

  handleSelect = () => {
    Keyboard.dismiss();
    ImagePicker.showImagePicker((response) => {
      if (response.error) {
        Alert.alert(response.error);
      } else if (response.type !== 'image/jpeg') {
        Alert.alert('Please select image in jpeg format');
      } else {
        this.setState({
          image: response,
        });
      }
    });
  };

  getUploadedDocuments = () => {
    this.isFetching = true;
    
    PrimeTrustInterface.getUploadedDocuments().then((retrievedDocuments) => {
      this.setState({documents : retrievedDocuments.data.data});  
      this.setState({isFetching : false});
    });

  }

  clearSelectedImage = () => {
    this.setState({
      image: null
    });
  }

  handleUpload = async () => {

    //console.log(this.state);
    let contacts = await PrimeTrustInterface.getContacts();
    
    if(contacts.data.data[0] == undefined){
      console.log("no contact");
    } else {
      console.log("state:",this.state.image);
      let contact = contacts.data.data[0];
      let document = await PrimeTrustInterface.sendDocument(contact.id,
        this.state.documentType,
        this.state.image);
      if(document.success){
        //document successfuly uploaded reset the page

        //check if there are now the correct number of documents
        this.clearSelectedImage();
      } else {
        let message = document.error[0].source.pointer + document.error[0].detail;
        Alert.alert("There was a problem with your image", message );
      }

    }
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
            <Spinner
              visible={this.state.isFetching}
              textContent="Loading..."
              textStyle={{ color: '#FFF' }}
            />
            <View>
              <Text style={styles.formLabel}>
                Uploaded documents: &nbsp; &nbsp;
                { this.state.documents == null ? 0 : this.state.documents.length}
              </Text>
            <FlatList data={this.state.documents} renderItem={({item}) => <View><Text>{item.attributes.label}</Text><Image style={styles.logo} source={{uri: item.attributes["file-url"]}}/></View>} />
            </View>
            {!this.state.image && (
            <View>
            <View style={styles.dropdownInput}>
              <Dropdown
                labelExtractor={(item) => item.value}
                valueExtractor={(item) => item.value}
                label="Select Document Type"
                labelTextStyle={{ fontFamily: 'Avenir-Book'}}
                labelFontSize={13}
                data={[{value:'Drivers License Front'},{value:'Drivers License Back'},{value:'Identity Card Front'},{value:'Identity Card Back'},{value:'Passport'}]}
                onChangeText={(value) => this.setState({ documentType: value })}
                textColor={Colors.quaternaryColor}
                selectedItemColor={Colors.quaternaryColor}
                baseColor={Colors.quaternaryColor}
                value={this.state.documentType == null? 'N/A': this.state.documentType}
                inputContainerStyle={styles.dropdownInputContainer}
                pickerStyle={{backgroundColor: Colors.tertiaryColor}}
              />
            </View>
            <CheckBox
              title='Contains Address'
              checked={this.state.containsAddress}
              />
              
              <View style={styles.buttonContainerBottom}>
                <Button
                titleStyle={Styles.whiteText}
                buttonStyle={Styles.defaultButtonClearWhite}
                  title="UPLOAD DOCUMENT"
                  onPress={this.handleSelect}
                />
              </View>
              </View>
            )}
            {this.state.image && (
              <View>
                <Image
                  style={styles.imageContainer}
                  source={{ uri: this.state.image.uri }}
                />
                <View style={styles.buttonContainer}>
                  <Button
                  titleStyle={Styles.whiteText}
                  buttonStyle={Styles.defaultButtonClearWhite}
                    title="CONFIRM"
                    onPress={this.handleUpload}
                  />
                  <Button
                  titleStyle={Styles.whiteText}
                  buttonStyle={Styles.defaultButtonClearWhite}
                    title="CANCEL"
                    onPress={this.clearSelectedImage}
                  />
                </View>
              </View>
            )}
          </View>
          <Button
          titleStyle={Styles.whiteText}
          buttonStyle={Styles.defaultButtonClearWhite}
            title="CHEAT TO NEXT SCREEN"
            onPress={()=>{
              this.props.navigation.navigate("KYCAddressInfo")
            }
            }
          />
        </View>
      </TouchableWithoutFeedback>
    );
  }
}

const mapStateToProps = (state) => ({
  isFetching: selectWyrePutAccountIsFetching(state),
  field: selectWyreAccountField(state, 'individualGovernmentId'),
  fieldId: 'individualGovernmentId',
});

const mapDispatchToProps = ({
  uploadWyreAccountDocument,
});

export {
  KYCfoto
}

export default connect(mapStateToProps, mapDispatchToProps)(KYCidAddressUploads);
