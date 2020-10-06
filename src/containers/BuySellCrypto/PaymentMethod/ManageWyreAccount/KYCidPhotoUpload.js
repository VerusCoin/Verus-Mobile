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

//import PrimeTrustInterface from '../../../../utils/PrimeTrust/provider';

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



class KYCidPhotoUploads extends Component {
  constructor(props) {
    super(props);
    this.state = {
      image: null,
      error: null,
      documents: [],
      isFetching: true
    };

  /*  if(PrimeTrustInterface.user === null) {
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

*/

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

export default connect(mapStateToProps, mapDispatchToProps)(KYCfoto);
