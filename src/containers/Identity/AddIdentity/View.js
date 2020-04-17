import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import styles from './styles';
import data from './identitiesData';
import uuid from 'react-uuid';

const AddIdentity = ({ navigation, actions }) => {
    const [identities, setIdentity] = useState(data);
    const [name, setName] = useState('');

    const handleOnChange = (name) => {
        setName(name);
    };

    const handleAdd = () => {
        if (name) {
            if (!name.includes('@')) {
                setIdentity([...identities, ...[{
                    id: uuid(),
                    name: `${name}@`,
                }]]);

            } else {
                setIdentity([...identities, ...[{
                    id: uuid(),
                    name: name,
                }]]);
            }
            setName(null);
        }
    };

    const selectIdentity = () => {
        navigation.navigate('Identity', { selectedScreen: "Identity"});
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
                {identities.map(item =>
                    <TouchableOpacity
                        key={item.id}

                        style={styles.identities}
                        onPress={() => selectIdentity(item.name)}>
                        <View>
                            <Text style={{ paddingLeft: 5 }}>{item.name}</Text>
                        </View>
                    </TouchableOpacity>
                )
                }
            </View>
        </View >
    );
};

export default AddIdentity;
