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
  ScrollView
} from 'react-native';

import {
  FormLabel,
  FormValidationMessage
} from 'react-native-elements';

import Lock from '../../../../images/customIcons/iconmonstr-lock-18.svg';

import Spinner from 'react-native-loading-spinner-overlay';

import {Button, Badge } from 'react-native-elements';

import {
  selectWyreAccountField,
  selectWyrePutAccountIsFetching,
} from '../../../../selectors/paymentMethods';

import {
  uploadWyreAccountDocument
} from '../../../../actions/actions/PaymentMethod/WyreAccount';

import Styles from '../../../../styles/index';

const formatURI = (uri) => (
  Platform.OS === 'android' ? uri : uri.replace('file://', '')
);

class KYCphotoAddress extends Component {
  constructor(props) {
    super(props);
    this.state = {
      image: null,
      error: null,
    };
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

  clearSelectedImage = () => {
    this.setState({
      image: null
    });
  }

  handleUpload = () => {
    this.props.uploadWyreAccountDocument(this.props.fieldId,
      formatURI(this.state.image.uri), 'image/jpeg', this.clearSelectedImage);
  };

  render() {
    const scaleFactorY = 2;
    const scalefatorX = 2;

    return (
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={Styles.root}>
          <View style={Styles.progressBarContainer}>
            <Badge
              status="success"
              badgeStyle={Styles.progessBadgeDone}
              containerStyle={Styles.horizontalPaddingBox10}
            />
            <Badge
              status="success"
              badgeStyle={Styles.progessBadgeDone}
              containerStyle={Styles.horizontalPaddingBox10}
            />
            <Badge
              status="success"
              badgeStyle={Styles.progessBadgeDone}
              containerStyle={Styles.horizontalPaddingBox10}
            />
            <Badge
              status="primary"
              badgeStyle={Styles.progessBadgeTodo}
              containerStyle={Styles.horizontalPaddingBox10}
            />
        </View>
        <ScrollView>
        <View style={styles.mainInputView}>
          <Spinner
            visible={this.props.isFetching}
            textContent="Loading..."
            textStyle={{ color: '#FFF' }}
          />
        <View style={Styles.padding}>
          <Text  style={{...Styles.boldKYCText}}>Proof of address</Text>
        </View>
        <View style={Styles.padding}>
          <Text style={{ ...Styles.normalKYCText}}>Please make sure th etext is clear and your address matches with your personal information</Text>
        </View>
        <View style={Styles.footerContainerKYC}>
            {!this.state.image && (
              <View style={styles.buttonContainerBottom}>
                <Button
                titleStyle={Styles.whiteText}
                buttonStyle={Styles.fullWidthButtonKYC}
                  title=" DOCUMENT"
                  onPress={this.handleSelect}
                />
              </View>
            )}
        </View>
            {this.state.image && (
              <View>
                <Image
                  style={styles.imageContainer}
                  source={{ uri: this.state.image.uri }}
                />
                <View style={styles.buttonContainer}>
                  <Button
                  titleStyle={Styles.whiteText}
                  buttonStyle={Styles.fullWidthButtonKYC}
                    title="CONFIRM"
                    onPress={this.handleUpload}
                  />
                  <Button
                  titleStyle={Styles.whiteText}
                  buttonStyle={Styles.fullWidthButtonKYC}
                    title="CANCEL"
                    onPress={this.clearSelectedImage}
                  />
                </View>
              </View>
            )}
          </View>
          </ScrollView>

          <View style={Styles.footerContainerKYC} >
            <Button
            titleStyle={Styles.whiteText}
            buttonStyle={Styles.fullWidthButtonKYC}
              title="CHEAT TO NEXT SCREEN"
              onPress={()=>{
                this.props.navigation.navigate("KYCEndInfoScreen")
              }
              }
            />
          </View>

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
  KYCphotoAddress
}

export default connect(mapStateToProps, mapDispatchToProps)(KYCphotoAddress);
