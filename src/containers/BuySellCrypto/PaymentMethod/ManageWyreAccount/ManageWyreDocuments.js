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

import StandardButton from '../../../../components/StandardButton';

import {
  selectWyreAccountField,
  selectWyrePutAccountIsFetching,
} from '../../../../selectors/paymentMethods';

import {
  uploadWyreAccountDocument
} from '../../../../actions/actions/PaymentMethod/WyreAccount';

import styles from './ManageWyreAccount.styles';

const formatURI = (uri) => (
  Platform.OS === 'android' ? uri : uri.replace('file://', '')
);

class ManageWyreDocuments extends Component {
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
    return (
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View>
          <View style={styles.mainInputView}>
            <Spinner
              visible={this.props.isFetching}
              textContent="Loading..."
              textStyle={{ color: '#FFF' }}
            />
            <View>
              <Text style={styles.formLabel}>
                Uploaded documents: &nbsp; &nbsp;
                {typeof this.props.field === 'undefined' ? 0 : this.props.field.value.length}
              </Text>
            </View>
            {!this.state.image && (
              <View style={styles.buttonContainerBottom}>
                <StandardButton
                  style={styles.buttonSelect}
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
                  <StandardButton
                    style={styles.buttonConfirm}
                    title="CONFIRM"
                    onPress={this.handleUpload}
                  />
                  <StandardButton
                    style={styles.buttonCancel}
                    title="CANCEL"
                    onPress={this.clearSelectedImage}
                  />
                </View>
              </View>
            )}
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
  ManageWyreDocuments
}

export default connect(mapStateToProps, mapDispatchToProps)(ManageWyreDocuments);
