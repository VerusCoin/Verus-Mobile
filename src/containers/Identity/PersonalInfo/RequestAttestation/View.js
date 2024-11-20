import React, { useState } from 'react';
import {
  View,
  Text,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SearchBar, ListItem, Button } from 'react-native-elements';
import Modal from '../../../../components/Modal'
import DelayedAlert from '../../../../utils/delayedAlert';
import Colors from '../../../../globals/colors';
import Styles from '../../../../styles';
import StandardButton from '../../../../components/StandardButton';
import RequestDialog from './RequestDialog';

const formattedSearchValue = (val) => (val.includes('@') ? val : `${val}@`);

const RequestAttestation = (props) => {
  const {
    visible,
    setRequestAttestationModalShown,
    selectedClaim,
    availableIdentities,
  } = props;

  const [identities, setIdentities] = useState(availableIdentities);
  const [searchValue, setSearchValue] = useState('');
  const [dialogShown, setDialogShown] = useState(false);
  const [selectedIdentity, setSelectedIdentity] = useState('');

  const cancelHandler = () => {
    setRequestAttestationModalShown(false);
  };

  const updateSearch = (value) => {
    const newData = availableIdentities.filter((item) => {
      const itemData = item.get('name', '').toUpperCase();
      const textData = value.toUpperCase();
      return itemData.includes(textData);
    });
    setIdentities(newData);
    setSearchValue(value);
  };

  const handleRequestAttestation = () => {
    setDialogShown(false);
    DelayedAlert(`Request sent to ${selectedIdentity}`);
  };

  const closeRequestDialog = () => {
    setDialogShown(false);
  };

  const openRequestDialog = (identity) => {
    setSelectedIdentity(identity);
    setDialogShown(true);
  };

  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
    >
      <View
        style={Styles.root}
      >
        <View style={Styles.tallHeaderContainer}>
          <Text style={Styles.centralHeader}>
            Request attestation for
          </Text>
          <Text style={Styles.centralHeader}>
            {selectedClaim.get('id', '')}
          </Text>
        </View>
        <View style={Styles.alignItemsCenterColumn}>
          <View>
            <SearchBar
              containerStyle={Styles.backgroundColorWhite}
              platform={Platform.OS === 'ios' ? 'ios' : 'android'}
              placeholder="Search Identities"
              onChangeText={updateSearch}
              value={searchValue}
              inputContainerStyle={Styles.defaultMargin}
              cancelButtonTitle=""
            />
          </View>
        </View>
        {identities.size > 0 ? (
          <ScrollView>
            <View>
              <Text style={[Styles.boldText, Styles.paddingTop]}>Available identities</Text>
              {identities.keySeq().map((identity) => (
                <TouchableOpacity
                  onPress={() => openRequestDialog(identities.getIn([identity, 'name'], ''))}
                  key={identities.getIn([identity, 'id'], '')}
                >
                  <ListItem
                    title={identities.getIn([identity, 'name'], '')}
                    bottomDivider
                  />
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        ) : (
          <View style={Styles.fullWidthFlexGrowCenterBlock}>
            <Text
              style={[Styles.defaultDescriptiveText, Styles.mediumFormInputLabel]}
            >
              There are no identities that match the search value.
            </Text>
            <Text style={[Styles.centralHeader, Styles.containerVerticalPadding]}>Request attestation from</Text>
            <Button
              style={Styles.centralHeader}
              title={formattedSearchValue(searchValue)}
              onPress={() => openRequestDialog(formattedSearchValue(searchValue))}
            />
          </View>
        )}
        <RequestDialog
          dialogShown={dialogShown}
          closeRequestDialog={closeRequestDialog}
          requestAttestation={handleRequestAttestation}
          selectedIdentity={selectedIdentity}
        />
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
  );
};

export default RequestAttestation;
