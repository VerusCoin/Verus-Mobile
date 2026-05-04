import React from 'react';
import {SafeAreaView, View} from 'react-native';
import {Button, Portal, Text} from 'react-native-paper';
import {useSelector} from 'react-redux';
import Colors from '../../globals/colors';
import styles from '../../styles';
import AnimatedActivityIndicator from '../AnimatedActivityIndicator';
import SemiModal from '../SemiModal';
import { useObjectSelector } from '../../hooks/useObjectSelector';

export default function LoadingModal(props) {
  const {visible, message, height, onCancel, cancelLabel} = useObjectSelector(
    state => state.loadingModal,
  );

  return (
    <Portal>
      <SemiModal
        animationType="slide"
        transparent={true}
        visible={visible}
        contentContainerStyle={{
          height,
          flex: 0,
          backgroundColor: 'white',
        }}>
        <SafeAreaView style={styles.focalCenter}>
          <AnimatedActivityIndicator
            style={{
              width: 128,
            }}
          />
          {message != null && message.length > 0 && (
            <Text
              style={{
                textAlign: 'center',
                color: Colors.primaryColor,
                fontSize: 22,
                fontWeight: 'bold',
                marginTop: 8
              }}>
              {message}
            </Text>
          )}
          {onCancel != null && (
            <Button
              mode="text"
              onPress={onCancel}
              textColor={Colors.primaryColor}
              style={{marginTop: 16}}>
              {cancelLabel}
            </Button>
          )}
        </SafeAreaView>
      </SemiModal>
    </Portal>
  );
}
