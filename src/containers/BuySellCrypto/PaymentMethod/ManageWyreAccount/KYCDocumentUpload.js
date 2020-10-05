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
import { address } from 'bitgo-utxo-lib';

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


class KYCDocumentUpload extends Component {
  constructor(props) {
    super(props);
    //check the id type that is being processed
    console.log("props",props);
    //this.state.documentType = props.route.params.documentType;
    //this.state.hasAddress = props.route.params.includeAddress;
    this.state = {
      image: null,
      error: null,
      documents: [],
      isFetching: false,
      documentType : this.props.route.params.documentType,
      addressDocumentType : null,
      hasAddress : this.props.route.params.containsAddress,
      documentCountry: this.props.route.params.documentCountry,
      completeDocuments : false,
      addressDocumentId : null
    };

    switch(this.props.route.params.documentType) {
      case "drivers_license":
        this.state.currentDocument = "Front of Drivers License"
        break;
      case "identity_card":
        this.state.currentDocument = "Front of Identity Card"
        break;
      default :
        this.state.currentDocument = "Passport Photo Page"  
    }


    if(PrimeTrustInterface.user === null) {
      //redirect to  the  login page
      console.log("redirecting to login page:");
      this.props.navigation.navigate("KYCStart");
    }
    //load docs
    //this.getUploadedDocuments();
    this.getContacts();
    
  }

  handleSelect = () => {
    
    this.setState({isFetching : true},()=>{
      
      let image = null;
      ImagePicker.showImagePicker(async (response) => {
        if (response.error) {
          Alert.alert(response.error);
        } else if (response.type !== 'image/jpeg') {
          Alert.alert('Please select image in jpeg format');
        } else {
          image = response;
        }
        console.log("response:",response);
        //upload the image to primeTrust
        let document = await PrimeTrustInterface.sendDocument(this.state.contact.id,
          this.state.currentDocument,
          image);
        if(document.success){
          //console.log("document uploaded:",document);
          //store the document
          let tempDocuments = this.state.documents;
          tempDocuments.push({
            type:this.state.currentDocument,
            document:document.data.data
          });
          //adding the 
          this.setState({documents: tempDocuments});

          //set the next required document and store the document in the state
        switch(this.state.currentDocument) {
          case "Front of Drivers License" :
            console.log("setting back");
            this.setState({currentDocument : "Back of Drivers License"});
            break;
          case "Back of Drivers License" :
              if(this.state.hasAddress) {
                console.log("setting completed");
                this.setState({completeDocuments : true});
              } else {
                console.log("setting proof of address");
                this.setState({currentDocument : "Proof of Address Document"});
              }
              break;
            case "Passport Photo Page" :
                if(this.state.hasAddress) {
                  console.log("setting completed");
                  this.setState({completeDocuments : true});
                } else {
                  console.log("setting proof of address");
                  this.setState({currentDocument : "Proof of Address Document"});
                }
                break;   
          case "Front of Identity Card" :
            console.log("setting back of id card");
              this.setState({currentDocument : "Back of Identity Card"});
              break;
          case "Back of Identity Card" :
                if(this.state.hasAddress) {
                  console.log("complete");
                  this.setState({completeDocuments : true});
                } else {
                  console.log("setting proof of address 2");
                  this.setState({currentDocument : "Proof of Address Document"});
                }
                break;
          case "Proof of Address Document" :
            this.setState({completeDocuments : true});
            break;  
          default : 
          console.log("default:",this.state.currentDocument);
          break;  
        } 
          //console.log("state:",this.state);     
        } else {
          let message = document.error[0].source.pointer + document.error[0].detail;
          Alert.alert("There was a problem with your image", message );
        }
        this.setState({isFetching : false});
      });
    });
  };

  getUploadedDocuments = () => {
    //this.setState({isFetching : true});
    PrimeTrustInterface.getUploadedDocuments().then((retrievedDocuments) => {
      this.setState({documents : retrievedDocuments.data.data});  
      //this.setState({isFetching : false});
    });
  }

  getContacts = () => {
    if(!this.state.contacts){
      PrimeTrustInterface.getContacts().then((contacts) => {
        let contact = contacts.data.data[0];
        this.setState({contact: contact});
      })
    }
  }

  clearSelectedImage = () => {
    this.setState({
      image: null
    });
  }

  handleUpload = async () => {

    console.log("submitting documents for KYC");
    await this.getContacts();
    
    let contact = this.state.contact;
    let proceed = false;
    console.log("Identity id",contact.id,this.state.documents[0].id,
      this.state.documents[1].id,
      true,true,this.state.hasAddress,
      this.state.documentCountry,this.state.documentType);
    console.log("documents:",this.state.documents[0]);
    
    if(this.state.documentType == 'drivers_license' || this.state.documentType == 'government_id' || this.state.documentType == 'passport') {
      let documentCheck = await PrimeTrustInterface.postKYCDocumentChecks(contact.id,this.state.documents[0].document.id,
        this.state.documents[1].document.id,
        true,true,this.state.hasAddress,
        this.state.documentCountry,this.state.documentType);
        console.log("Document Check:",documentCheck);
        if(documentCheck.success){
          proceed = true;
        } else {
          let message = documentCheck.error[0].source.pointer + documentCheck.error[0].detail;
          Alert.alert("There was a problem with your identity document", message );
          proceed = false;
        }

    } 
    //submit the address documents
    if(!this.state.hasAddress){
      //get the address document
      
      if(this.documentType == 'drivers_license' || this.documentType == 'government_id') this.setState({addressDocumentId : this.state.documents[2].document.id});
      else this.setState({addressDocumentId : this.state.documents[1].document.id});
      
      //submit the
      let addressDocumentCheck = await PrimeTrustInterface.postKYCDocumentChecks(contact.id,this.state.addressDocumentId,
        null,
        true,true,this.state.hasAddress,
        this.state.documentCountry,this.state.documentType);

        console.log("Address Document Check:",addressDocumentCheck);
        if(addressDocumentCheck.success){
          //let the proceed result from the identity document pass through
        } else {
          let message = addressDocumentCheck.error[0].source.pointer + addressDocumentCheck.error[0].detail;
          Alert.alert("There was a problem with your address document", message );
          proceed = false;
        }
      
    }

  };

  componentDidMount(){
//    this.setState({isFetching :true});
  }
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
          </View>
          {(this.state.currentDocument == "Proof of Address Document" && !this.state.completeDocuments) && (
            <View style={styles.dropdownInput}>
              <Dropdown
                  labelExtractor={(item) => item.value}
                  valueExtractor={(item) => item.value}
                  label="Select Document Type"
                  labelTextStyle={{ fontFamily: 'Avenir-Book'}}
                  labelFontSize={13}
                  data={[{label:'Utility Bill',value:'utility_bill'},{label:'Other',value:'other'}]}
                  onChangeText={(value) => this.setState({ documentType: value })}
                  textColor={Colors.quaternaryColor}
                  selectedItemColor={Colors.quaternaryColor}
                  baseColor={Colors.quaternaryColor}
                  value={this.state.addressDocumentType == null? 'utility_bill': this.state.addressDocumentType}
                  inputContainerStyle={styles.dropdownInputContainer}
                  pickerStyle={{backgroundColor: Colors.tertiaryColor}}
              />
            </View>
          )}
            {!this.state.completeDocuments && (
              <View>  
                <View style={styles.buttonContainerBottom}>
                  <Button
                  titleStyle={Styles.whiteText}
                  buttonStyle={Styles.defaultButtonClearWhite}
                    title={"Upload " + this.state.currentDocument}
                    onPress={this.handleSelect}
                  />
                </View>
              </View>
            )}

            {(this.state.completeDocuments && (this.state.documentType == "Drivers License" || this.state.documentType == "Identity Card")) && (
              <View>
                <View><Text>{this.state.documents[0].document.attributes.label}</Text>
                <Image style={styles.logo} source={{uri: this.state.documents[0].document.attributes["file-url"]}}/></View>
                <View><Text>{this.state.documents[1].document.attributes.label}</Text>
                <Image style={styles.logo} source={{uri: this.state.documents[1].document.attributes["file-url"]}}/></View>
                </View>                
            )}
            {(this.state.completeDocuments && !this.state.hasAddress) && (
              <View>
              <View><Text>{this.state.documents[0].document.attributes.label}</Text>
              <Image style={styles.logo} source={{uri: this.state.documents[0].document.attributes["file-url"]}}/></View>
              <View><Text>{this.state.documents[1].document.attributes.label}</Text>
              <Image style={styles.logo} source={{uri: this.state.documents[1].document.attributes["file-url"]}}/></View>
              </View>                

            )}
            {this.state.completeDocuments && (
              <View style={styles.buttonContainer}>
                  <Button
                  titleStyle={Styles.whiteText}
                  buttonStyle={Styles.defaultButtonClearWhite}
                    title="CONFIRM"
                    onPress={this.handleUpload}
                  />
             </View>
            )}
          
          
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

export default connect(mapStateToProps, mapDispatchToProps)(KYCDocumentUpload);

export {
  KYCDocumentUpload
}


