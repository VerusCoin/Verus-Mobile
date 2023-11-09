import React, { Component } from 'react';
import { connect } from 'react-redux';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { createAlert, resolveAlert } from "../../../../../../actions/actions/alert/dispatchers/alert";
import {
  Platform,
  View,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
  Image,
  Text,
  StyleSheet,
  TouchableOpacity,

} from 'react-native';

import Spinner from 'react-native-loading-spinner-overlay';
import {  Button as ElementButton } from 'react-native-elements';
import { topProgress } from "./ValuBadgeProgress"

import Styles from '../../../../../../styles/index';
import Colors from '../../../../../../globals/colors';
import ValuProvider from '../../../../../../utils/services/ValuProvider';
import { verifyPermissions } from "../../../../../../utils/permissions";
import { PERMISSIONS } from "react-native-permissions";
import { conditionallyUpdateService, modifyPersonalDataForUser } from "../../../../../../actions/actionDispatchers";

import { PermissionsAndroid } from "react-native";
import { VALU_SERVICE_ID } from "../../../../../../utils/constants/services";
import { updateKYCStage } from '../../../../../../actions/actions/services/dispatchers/valu/updates';
import { setValuAccountStage } from "../../../../../../actions/actionCreators";
import store from "../../../../../../store";
import { API_GET_SERVICE_ACCOUNT } from "../../../../../../utils/constants/intervalConstants";

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
var RNFS = require('react-native-fs');

let doesContainAddress = false;


class KYCDocumentUpload extends Component {
  constructor(props) {
    super(props);
    //check the id type that is being processed
    //this.state.documentType = props.route.params.documentType;
    //this.state.hasAddress = props.route.params.includeAddress;
    const initialImage ={
          title: "",
          description: "",
          uris: [],
          image_type: null,
          image_subtype: null,
        };

    this.state = {
      images: null,
      image: initialImage,
      error: null,
      documents: [],
      isFetching: false,
      documentType : this.props.route.params.documentType,
      addressDocumentType : null,
      hasAddress : this.props.route.params.containsAddress,
      documentCountry: this.props.route.params.documentCountry,
      completeDocuments : false,
      addressDocumentId : null,
      loading: false,
      loadingImage: false,
      index: null,
      imageCategory: props.route.params.imageCategory,
      contact: null
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

    //load docs
    //this.getUploadedDocuments();
    this.getContacts();
    
  }

  async saveImage(uri, fileName) {
    const path = RNFS.DocumentDirectoryPath + `/${fileName}`;

    await RNFS.copyFile(uri, path)
    await RNFS.unlink(uri)

    return 'file://' + path
  }

  async saveNewAssets(assets, index) {
    let uris = this.state.image.uris.slice();

    const asset = assets[0]
    await this.saveImage(asset.uri, asset.fileName)
    if (assets != null) {

      if (!asset.fileName || !asset.uri)
        throw new Error('Could not save image, no uri or no filename');


      if (index != null) uris[index] = asset.fileName;
      else if (index >= uris.length) uris.push(asset.fileName);
    }
    
   /* this.setState(
      {
        image: {
          ...this.state.image,
          uris,
        },
      },
      () => {
        this.updateImage();
      }
    );*/
  }

  updateImage() {
    this.setState({ loading: true }, async () => {
      const { imageCategory } = this.state;
      let images = this.state.images[imageCategory];

      if (images == null) {
        images = [this.state.image];
      } else if (this.state.index == null) {
        images.push(this.state.image);
      } else {
        images[this.state.index] = this.state.image;
      }

      await modifyPersonalDataForUser(
        { ...this.state.images, [imageCategory]: images },
        PERSONAL_IMAGES,
        this.props.activeAccount.accountHash
      );

      this.setState({
        loading: false,
        loadingImage: false,
        index:
          this.state.images[imageCategory] == null
            ? 0
            : this.state.index == null
            ? this.state.images[imageCategory].length - 1
            : this.state.index,
      });
    });
  }

  handleSelect = () => {
    
    this.setState({isFetching : true}, async ()=>{
      
      let image = null;

      const libraryPermissions = await verifyPermissions(
        PERMISSIONS.IOS.PHOTO_LIBRARY,
        PERMISSIONS.ANDROID.CAMERA
      );

      // Hack to prevent library modal from bugging out and disappearing 
      // if security cover comes up because of permissions alert
      await (() => new Promise((resolve, reject) => {
        setTimeout(() => resolve(), 500)
      }))()

      if (libraryPermissions.canUse) {
        launchImageLibrary({ mediaType: "photo", selectionLimit: 1 }, async (res) => {
          if (res.errorCode != null) {
            console.warn(res);

            if (res.errorCode === "camera_unavailable") {
              createAlert(
                "Error",
                "Verus Mobile encountered a problem while trying to access your photo library"
              );
            }

            this.setState({ loadingImage: false, loading: false });
          } else if (!res.didCancel) {
           // await this.saveNewAssets(res.assets, 0);
            const copiedPath = await this.saveImage(res.assets[0].uri, res.assets[0].fileName)


            //upload the image to Valu
           
            let document = await ValuProvider.sendDocument(this.state.contact.id,
              this.state.currentDocument,
              {uri: copiedPath});
              console.log("document",document)
            if(document.success){
              //store the document
              let tempDocuments = this.state.documents;
              tempDocuments.push({
                type: this.state.currentDocument,
                uri: copiedPath,
                document: document.data
              });
              //adding the 
              this.setState({documents: tempDocuments});

              //set the next required document and store the document in the state
            switch(this.state.currentDocument) {
              case "Front of Drivers License" :
                await PermissionsAndroid.request(
                  PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
                  {
                    title: "Permission title",
                    message:
                      "Permission message",
                    buttonNeutral: "Ask Me Later",
                    buttonNegative: "Cancel",
                    buttonPositive: "OK",
                  }
                );
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
            } else {
              let message = document.error[0].source.pointer + document.error[0].detail;
              Alert.alert("There was a problem with your image", message );
            }
            this.setState({isFetching : false});
          } else {

            this.setState({ loadingImage: false, loading: false });
          }
        });
      } else {
        createAlert("Error", "Verus Mobile cannot access your photo library");
        this.setState({ loadingImage: false, loading: false, isFetching : false });
      }
        });
  };

  getUploadedDocuments = () => {
    //this.setState({isFetching : true});
    ValuProvider.getUploadedDocuments().then((retrievedDocuments) => {
      this.setState({documents : retrievedDocuments.data.data});  
      //this.setState({isFetching : false});
    });
  }

  getContacts = () => {
    if(!this.state.contacts){
      ValuProvider.getAccount(this.props.accountId).then((account) => {
    //    console.log("account.data.included[0]", JSON.stringify(account.data.included[0], null, 2))
        let contact = account.data.included[0];
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
    this.setState({ loading: true });
    console.log("submitting documents for KYC");
    try {
      await this.getContacts();
      
      let contact = this.state.contact;
      let proceed = false;
      console.log("start", this.state.documentType);
      if(this.state.documentType == 'drivers_license' || this.state.documentType == 'government_id' || this.state.documentType == 'passport') {

        let documentCheck = await ValuProvider.postKYCDocumentChecks({
          contact_id: contact.id,
          documentFront: this.state.documents[0].document.id,
          documentBack: this.state.documents[1].document.id,
          identity: true,
          identity_photo: true,
          proof_of_address: this.state.hasAddress,
          document_country: this.state.contact.attributes["tax-country"],
          document_type: this.state.documentType});
          
          //console.log("Document Check:",documentCheck);
          if(documentCheck.success){

            const contreply = await ValuProvider.getAccount(this.props.accountId);
            const amlstatus = await ValuProvider.getAMLStatus(contreply.data.included[0].id); //contact-id
            var output = {};
            amlstatus.data.included.map((value)=> {output[value.type] = value.id} )
            console.log("amlstatus", JSON.stringify(output, null, 2));
        
            const kycver = await ValuProvider.sandboxVerifyKYC(output["kyc-document-checks"]); //kycver.data.attributes.status == 'verified'

            console.log("sandboxVerifyKYC", JSON.stringify(kycver, null, 2));

          //  const cipCheck = await ValuProvider.sandboxCIPApprove(output["cip-checks"]) // .data.attributes.status == "approved",
          //  console.log("sandboxcipCheck", JSON.stringify(cipCheck.data, null, 2));

            const sandboxAccountOpenreply = await ValuProvider.sandboxAccountOpen(this.props.accountId);
            console.log("cosandboxAccountOpenreplyntreply", JSON.stringify(sandboxAccountOpenreply.data, null, 2)); //

            //const amlApproved = await ValuProvider.sandboxApproveAML(output["aml-checks"]) // TODO: socure needed id for auto

            await updateKYCStage(3);
            this.props.dispatch(setValuAccountStage(3));
            await conditionallyUpdateService(store.getState(), store.dispatch, API_GET_SERVICE_ACCOUNT);
            this.props.navigation.navigate("KYCPayForService");
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
        
        if(this.documentType == 'drivers_license' || this.documentType == 'government_id') 
          this.setState({addressDocumentId : this.state.documents[2].document.id});
        else this.setState({addressDocumentId : this.state.documents[1].document.id});
        
        //submit the
        let addressDocumentCheck = await ValuProvider.postKYCDocumentChecks({
          contact_id: contact.id,
          documentFront: this.state.addressDocumentId,
          documentBack: null,
          identity: true,
          identity_photo: true,
          proof_of_address: this.state.hasAddress,
          document_country: this.state.documentCountry,
          document_type: this.state.documentType});

          console.log("Address Document Check:",addressDocumentCheck);
          if(addressDocumentCheck.success){
            //let the proceed result from the identity document pass through
            await updateKYCStage(3);
            this.props.dispatch(setValuAccountStage(3));
            await conditionallyUpdateService(store.getState(), store.dispatch, API_GET_SERVICE_ACCOUNT);
            this.props.navigation.navigate("KYCPayForService");
          } else {
            let message = addressDocumentCheck.error[0].source.pointer + addressDocumentCheck.error[0].detail;
            Alert.alert("There was a problem with your address document", message );
            proceed = false;
          }
      
    }
  } catch(e) {
    this.setState({ loading: false });
    Alert.alert("There was a problem with your identity document", e.message );
  }
  this.setState({ loading: false });
  };

  componentDidMount(){
//    this.setState({isFetching :true});
  }
  render() {

    return (
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={Styles.root}>
        <View style={Styles.centralRow}>
        {topProgress(2)}
        <Spinner
            visible={this.state.loading}
            textContent="Uploading..."
            textStyle={{ color: Colors.quinaryColor }}
            color={Colors.quinaryColor}
          />
        </View>

         {/*    {(this.state.currentDocument == "Proof of Address Document" && !this.state.completeDocuments) && (
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
          )}*/}
            {!this.state.completeDocuments && (
              <View>  
              
                <ElementButton
                titleStyle={{...Styles.whiteText, fontWeight: 'bold'}}
                buttonStyle={{backgroundColor:Colors.primaryColor, paddingTop: 10, paddingBottom: 10, paddingRight: 15, paddingLeft: 15,  borderRadius: 20, marginTop: "80%"} }
                title={"Upload " + this.state.currentDocument}
                onPress={this.handleSelect}
              />
                
              </View>
            )}

            {(this.state.completeDocuments && (this.state.documentType == "drivers_license" || this.state.documentType == "identity_card")) && (
              <View>
                <View>
                  <Text>{this.state.documents[0].type}</Text>
                  <Image style={styles.logo} source={{uri: this.state.documents[0].uri}}/>
                </View>
                <View><Text>{this.state.documents[1].type}</Text>
                <Image style={styles.logo} source={{uri: this.state.documents[1].uri}}/></View>
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
                <ElementButton
                titleStyle={{...Styles.whiteText, fontWeight: 'bold'}}
                buttonStyle={{backgroundColor:Colors.primaryColor, paddingTop: 10, paddingBottom: 10, paddingRight: 15, paddingLeft: 15,  borderRadius: 20, marginTop:40} }
                title="CONFIRM"
                onPress={this.handleUpload}
              />
             </View>
            )}
          

        </View>
      </TouchableWithoutFeedback>
    );
  }
}

const mapStateToProps = (state) => ({
  accountId: state.channelStore_valu_service.accountId

});

export default connect(mapStateToProps)(KYCDocumentUpload);

export {
  KYCDocumentUpload
}


