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
} from 'react-native';

import {
  FormLabel,
  FormValidationMessage
} from 'react-native-elements';

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
            status="success"
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
              visible={this.props.isFetching}
              textContent="Loading..."
              textStyle={{ color: '#FFF' }}
            />
            <View>
              <Text style={styles.formLabel}>
                Uploaded documents: &nbsp; &nbsp;
                { this.props.field == null ? 0 : this.props.field.value.length}
              </Text>
            </View>
            {!this.state.image && (
              <View style={styles.buttonContainerBottom}>
                <Button
                titleStyle={Styles.whiteText}
                buttonStyle={Styles.defaultButtonClearWhite}
                  title=" DOCUMENT"
                  onPress={this.handleSelect}
                />
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
              this.props.navigation.navigate("KYCEndInfoScreen")
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
  KYCphotoAddress
}

export default connect(mapStateToProps, mapDispatchToProps)(KYCphotoAddress);
