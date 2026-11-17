import React from 'react';
import {useObjectSelector} from '../../hooks/useObjectSelector';
import NfcTapModal from './NfcTapModal';

// Shows the app-wide NFC tap screen from state.nfcTap.
export default function NfcTapHost() {
  const {visible, phase, title, detail, actions} = useObjectSelector(
    state => state.nfcTap,
  );

  return (
    <NfcTapModal
      actions={actions}
      detail={detail}
      phase={phase}
      testID="nfcTap.screen"
      title={title}
      visible={visible}
    />
  );
}
