import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, TextInput,
} from 'react-native';
import Styles from '../../../styles/index';

const AddIdentity = (props) => {
  const {
    navigation, actions, identities, activeIdentityId,
  } = props;
  const [name, setName] = useState('');

  const handleOnChange = (value) => {
    setName(value);
  };

  const handleAdd = () => {
    if (!name) return;
    actions.addNewIdentityName(name.includes('@') ? name : `${name}@`);
    setName('');
  };

  const selectIdentity = (identityId) => {
    if (activeIdentityId) {
      navigation.navigate('Identity', { selectedScreen: 'Identity' });
    }
    actions.changeActiveIdentity(identityId);
  };

  return (
    <View style={Styles.root}>
      <View style={Styles.flexColumn}>
        <TextInput
          onChangeText={(text) => handleOnChange(text)}
          value={name}
          style={Styles.inputField}
          placeholder="Identity@"
        />
        <TouchableOpacity style={Styles.linkButton} onPress={handleAdd}>
          <Text style={Styles.whiteTextWithCustomFontSize}>Add identity</Text>
        </TouchableOpacity>
      </View>
      <Text style={Styles.labelUltraLightGrey}>AVAILABLE IDENTITIES</Text>
      <View>
        {identities.keySeq().map((identity) => (
          <TouchableOpacity
            key={identities.getIn([identity, 'id'], '')}
            style={Styles.greyButtonWithShadow}
            onPress={() => selectIdentity(identities.getIn([identity, 'id'], ''))}
          >
            <View>
              <Text style={Styles.textWithLeftPadding}>{identities.getIn([identity, 'id'], '')}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

export default AddIdentity;
