import React, {useEffect, useState} from 'react';
import AppTextInput from '../../components/AppTextInput';
import ReceiveRequestSheet from './ReceiveRequestSheet';

const ReceiveNoteSheet = ({note, onApply, onClose, visible}) => {
  const [draft, setDraft] = useState(note);
  useEffect(() => {
    if (visible) setDraft(note);
  }, [note, visible]);

  return (
    <ReceiveRequestSheet
      onApply={() => () => onApply(draft)}
      onClose={onClose}
      title="Note"
      visible={visible}>
      <AppTextInput
        accessibilityLabel="Note"
        autoCapitalize="sentences"
        autoFocus
        helperText="Added to the shared message. The QR code does not include it."
        onChangeText={setDraft}
        placeholder="e.g. Dinner"
        returnKeyType="done"
        value={draft}
      />
    </ReceiveRequestSheet>
  );
};

export default ReceiveNoteSheet;
