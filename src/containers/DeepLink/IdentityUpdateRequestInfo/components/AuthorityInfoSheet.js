/*
  AuthorityInfoSheet
  - 2026-02-07: Created. SemiModal that explains what revocation and recovery
    authorities are. Triggered by the info icon on the HighRiskStep authority
    outcome card.
*/
import React from 'react';
import { View, Text } from 'react-native';
import SemiModal from '../../../../components/SemiModal';
import GradientButton from '../../../../components/GradientButton';
import styles from '../styles/AuthorityInfoSheet.styles';

const CONTENT = {
  revocation: {
    title: 'What is a revocation authority?',
    paragraphs: [
      'The revocation authority is an identity that can revoke (lock) this VerusID. Once revoked, the ID cannot transact until it is recovered by the recovery authority.',
      'Changing the revocation authority means a different identity will have the power to revoke this ID.',
    ],
  },
  recovery: {
    title: 'What is a recovery authority?',
    paragraphs: [
      'The recovery authority is an identity that can recover this VerusID if it is revoked or compromised. It can restore access and update the primary addresses.',
      'Changing the recovery authority means a different identity will have the power to recover this ID.',
    ],
  },
  both: {
    title: 'Authority changes',
    paragraphs: [
      'The revocation authority can revoke (lock) this VerusID. The recovery authority can recover it if revoked or compromised, restoring access and updating primary addresses.',
      'Both authorities are being changed, meaning different identities will have these powers after this update.',
    ],
  },
};

const AuthorityInfoSheet = ({ visible, onClose, type = 'revocation' }) => {
  const content = CONTENT[type] || CONTENT.revocation;

  return (
    <SemiModal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
      title={content.title}
      flexHeight={0.01}
      contentContainerStyle={styles.sheetContent}
    >
      <View style={styles.sheetBody}>
        {content.paragraphs.map((text, idx) => (
          <Text key={idx} style={styles.paragraph}>{text}</Text>
        ))}
        <GradientButton onPress={onClose}>
          {'Got it'}
        </GradientButton>
      </View>
    </SemiModal>
  );
};

export default AuthorityInfoSheet;
