import React from 'react';
import { ScrollView, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { CommonActions } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import Styles from '../../../styles/index';
import AnimatedSuccessCheckmark from '../../../components/AnimatedSuccessCheckmark';
import Colors from '../../../globals/colors';
import { resetDeeplinkData } from '../../../actions/actionCreators';

const GenericRequestComplete = props => {
  const signedIn = useSelector(state => state.authentication.signedIn);
  const dispatch = useDispatch();

  const completeRequest = () => {
    const resetAction = CommonActions.reset({
      index: 0,
      routes: [{name: signedIn ? 'SignedInStack' : 'SignedOutStack'}],
    });

    dispatch(resetDeeplinkData());
    props.navigation.dispatch(resetAction);
  };

  return (
    <ScrollView
      style={{...Styles.fullWidth, ...Styles.backgroundColorWhite}}
      contentContainerStyle={{
        ...Styles.focalCenter,
        justifyContent: 'space-between',
      }}>
      <View style={Styles.focalCenter}>
        <Text
          numberOfLines={1}
          style={{
            textAlign: 'center',
            fontSize: 20,
            color: Colors.verusDarkGray,
          }}>
          {'Success!'}
        </Text>
        <View style={{paddingVertical: 16}}>
          <AnimatedSuccessCheckmark
            style={{
              width: 128,
            }}
          />
        </View>
        <View
          style={{
            width: '90%',
            flexDirection: 'row',
            justifyContent: 'space-evenly',
            paddingTop: 16,
          }}>
          <Button
            textColor={Colors.warningButtonColor}
            style={{width: 148}}
            labelStyle={{fontSize: 18}}
            onPress={() => completeRequest()}>
            Cancel
          </Button>
          <Button
            buttonColor={Colors.verusGreenColor}
            textColor={Colors.secondaryColor}
            style={{width: 148}}
            labelStyle={{fontSize: 18}}
            onPress={() => completeRequest()}>
            Done
          </Button>
        </View>
      </View>
    </ScrollView>
  );
};

export default GenericRequestComplete;
