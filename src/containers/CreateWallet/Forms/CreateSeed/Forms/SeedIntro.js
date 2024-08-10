import React, {useState} from 'react';
import {View, Dimensions} from 'react-native';
import {Text, Paragraph, Button, Checkbox, List} from 'react-native-paper';
import {MnemonicSeed} from '../../../../../images/customIcons';
import Colors from '../../../../../globals/colors';
import TallButton from '../../../../../components/LargerButton';
import { SMALL_DEVICE_HEGHT } from '../../../../../utils/constants/constants';

export default function SeedIntro({navigation}) {
  const {height} = Dimensions.get('window');

  const [userAgrees, setUserAgrees] = useState(false);

  return (
    <View
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        flex: 1,
        alignItems: 'center',
        backgroundColor: Colors.secondaryColor
      }}>
      {height >= SMALL_DEVICE_HEGHT && <MnemonicSeed
        width={180}
        style={{ top: height / 2 - 260, position: 'absolute' }}
      />}
      <View
        style={{
          alignItems: 'center',
          position: 'absolute',
          top: height < SMALL_DEVICE_HEGHT ? 60 : height / 2 - 130,
        }}>
        <Text
          style={{
            textAlign: 'center',
            color: Colors.primaryColor,
            fontSize: 28,
            fontWeight: 'bold',
          }}>
          {'24-word Seed'}
        </Text>
        <Paragraph
          style={{
            textAlign: 'center',
            marginTop: 24,
            width: 280,
          }}>
          {
            'Your 24 word seed is the secret key that gives you access to your wallet.'
          }
        </Paragraph>
        <Paragraph
          style={{
            textAlign: 'center',
            marginTop: 24,
            width: 280,
          }}>
          {
            'Write each word down, separated by a space, and keep your words safe.'
          }
        </Paragraph>
      </View>
      <View
        style={{
          position: 'absolute',
          bottom: 40,
          width: 280,
        }}>
        <View style={{flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 8}}>
          <List.Icon style={{padding: 0, margin: 0, marginTop: 18, height: 19}} icon={"alert"} color={Colors.warningButtonColor}/>
          <Paragraph
            style={{
              textAlign: 'justify',
              marginTop: 24,
              width: 240,
              color: Colors.warningButtonColor,
              fontWeight: "bold",
              fontSize: 11,
              lineHeight: 12,
            }}>
            {
              'Write down the words or risk losing access to your wallet! Never show the words to anyone!'
            }
          </Paragraph>
        </View>
        <Checkbox.Item
          color={Colors.primaryColor}
          labelStyle={{
            fontSize: 14,
          }}
          label={
            'I understand the need to write down the seed, and to keep it secure.'
          }
          status={userAgrees ? 'checked' : 'unchecked'}
          onPress={() => setUserAgrees(!userAgrees)}
          mode="android"
        />
        <TallButton
          onPress={() => navigation.navigate("SeedWords")}
          mode="contained"
          disabled={!userAgrees}
          labelStyle={{fontWeight: 'bold'}}
          style={{
            marginTop: 8,
          }}>
          {'Show words 1-8'}
        </TallButton>
      </View>
    </View>
  );
}
