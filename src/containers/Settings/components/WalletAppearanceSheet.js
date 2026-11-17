import React, {useEffect, useState} from 'react';
import {useDispatch} from 'react-redux';
import {setWalletAvatar} from '../../../actions/actionCreators';
import WalletAvatarPickerSheet from '../../Onboard/CreateProfile/Forms/WalletAvatarPickerSheet';
import {
  DEFAULT_WALLET_AVATAR,
  normalizeWalletAvatar,
} from '../../../utils/walletAvatar';

const WalletAppearanceSheet = ({account, onClose, visible}) => {
  const dispatch = useDispatch();
  const [draftAvatar, setDraftAvatar] = useState(DEFAULT_WALLET_AVATAR);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    if (visible) {
      setDraftAvatar(
        normalizeWalletAvatar(account?.walletAvatar, DEFAULT_WALLET_AVATAR),
      );
      setSaveError(null);
    }
  }, [account?.walletAvatar, visible]);

  // A failed save keeps the sheet open with the error; the next pick clears it.
  const changeAvatar = avatar => {
    setSaveError(null);
    setDraftAvatar(avatar);
  };

  const saveAppearance = async () => {
    if (!account?.accountHash || saving) return;

    setSaving(true);
    setSaveError(null);

    try {
      dispatch(await setWalletAvatar(account.accountHash, draftAvatar));
      onClose();
    } catch (error) {
      console.warn(error);
      setSaveError('Not saved. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <WalletAvatarPickerSheet
      errorText={saveError}
      onChange={changeAvatar}
      onClose={onClose}
      onSubmit={saveAppearance}
      submitLabel="Save"
      submitVariant="primary"
      submitting={saving}
      visible={visible}
      walletAvatar={draftAvatar}
    />
  );
};

export default WalletAppearanceSheet;
