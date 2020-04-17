import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import styles from './styles';
import { Map as IMap } from 'immutable';
// import data from './identitiesData';
// import uuid from 'react-uuid';

const AddIdentity = (props) => {
    const { navigation, actions, identities, activeIdentity } = props;
    // const [identities, setIdentity] = useState(data);
    const [name, setName] = useState('');

    const handleOnChange = (name) => {
        setName(name);
    };

    const handleAdd = () => {
        if (name !== '') {
            if (!name.includes('@')) {
                actions.addNewIdentityName(`${name}@`)
            } else {
                actions.addNewIdentityName(name)
            }
            setName(null);
        }
    };

    const selectIdentity = (identity) => {
        if (activeIdentity) {
            navigation.navigate('Identity', { selectedScreen: "Identity"});
        }
            actions.changeActiveIdentity(identity.get('id', ''), identity)
    };

    return (
        <View style={styles.root}>
            <View style={styles.container}>
                <TextInput
                    onChangeText={text => handleOnChange(text)}
                    value={name}
                    style={styles.input}
                    placeholder="Identity@"
                />
                <TouchableOpacity style={styles.add} onPress={handleAdd}>
                    <Text style={{ color: 'white' }}>Add identity</Text>
                </TouchableOpacity>
            </View >
            <Text style={{ color: '#d6cccb' }}>AVAILABLE IDENTITIES</Text>
            <View >
                {identities.keySeq().map(identity =>
                    <TouchableOpacity
                        key={identities.getIn([identity, 'id'], '')}
                        style={styles.identities}
                        onPress={() => selectIdentity(identities.get(identity, IMap()))}>
                        <View>
                            <Text style={{ paddingLeft: 5 }}>{identities.getIn([identity, 'id'], '')}</Text>
                        </View>
                    </TouchableOpacity>
                )
                }
            </View>
        </View >
    );
};

export default AddIdentity;
