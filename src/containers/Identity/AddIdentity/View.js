import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import styles from './styles';
import data from './identitiesData';
import Colors from '../../../globals/colors';

const AddIdentity = ({ navigation, actions }) => {
    const [identities, setIdentity] = useState(data);
    const [name, setName] = useState('');

    const handleOnChange = (name) => {
        setName(name);
    };

    const selectIdentity = (id) => {
    //set flag selected Identity
   // navigation.navigate('Identity');
    };

    const addIdentity = (id) => {
      //AddIdentity to local db
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
                <TouchableOpacity style={styles.add}>
                    <Text style={{color:'white'}}>Add identity</Text>
                </TouchableOpacity>
            </View>
            <Text style={{color:'#d6cccb'}}>AVAILABLE IDENTITIES</Text>
            <View >
                {identities.map(item =>
                    <TouchableOpacity
                        key={item.id}
                    
                        style={styles.identities}
                        onPress={() => selectIdentity(item.id)}>
                        <View>
                            <Text style={{paddingLeft:5}}>{item.name}</Text>
                        </View>
                    </TouchableOpacity>
                )
                }
            </View>
        </View>
    );
};

export default AddIdentity;
