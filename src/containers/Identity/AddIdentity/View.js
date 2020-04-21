import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, TextInput,
} from 'react-native';
import styles from './styles';

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
    <View style={styles.root}>
      <View style={styles.container}>
        <TextInput
          onChangeText={(text) => handleOnChange(text)}
          value={name}
          style={styles.input}
          placeholder="Identity@"
        />
        <TouchableOpacity style={styles.add} onPress={handleAdd}>
          <Text style={styles.textButton}>Add identity</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.label}>AVAILABLE IDENTITIES</Text>
      <View>
        {identities.keySeq().map((identity) => (
          <TouchableOpacity
            key={identities.getIn([identity, 'id'], '')}
            style={styles.identities}
            onPress={() => selectIdentity(identities.getIn([identity, 'id'], ''))}
          >
            <View>
              <Text style={styles.textIdentities}>{identities.getIn([identity, 'id'], '')}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

export default AddIdentity;
