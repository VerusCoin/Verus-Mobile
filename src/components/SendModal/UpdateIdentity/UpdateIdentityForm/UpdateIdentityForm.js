import { useCallback, useEffect } from 'react';
import {
  SEND_MODAL_FORM_STEP_CONFIRM,
  SEND_MODAL_IDENTITY_UPDATE_ID_BLOCKHEIGHT,
  SEND_MODAL_IDENTITY_UPDATE_ID_RAW_TX_HEX,
  SEND_MODAL_IDENTITY_UPDATE_REQUEST_HEX,
  SEND_MODAL_IDENTITY_UPDATE_TX_HEX
} from '../../../../utils/constants/sendModal';
import {UpdateIdentityFormRender} from './UpdateIdentityForm.render';
import { createUpdateIdentityTx } from '../../../../utils/api/channels/verusid/requests/updateIdentity';
import { IdentityUpdateRequest } from 'verus-typescript-primitives';
import { useObjectSelector } from '../../../../hooks/useObjectSelector';
import { satsToCoins } from '../../../../utils/math';
import BigNumber from 'bignumber.js';

const UpdateIdentityForm = (props) => {
  const sendModal = useObjectSelector(state => state.sendModal);
  const { data, subWallet } = sendModal;

  useEffect(() => {
    submitData();
  }, [])

  const submitData = useCallback(async () => {
    const [channelName, address, systemId] = subWallet.channel.split('.');

    const reqHex = data[SEND_MODAL_IDENTITY_UPDATE_REQUEST_HEX];
    const rawIdHex = data[SEND_MODAL_IDENTITY_UPDATE_ID_RAW_TX_HEX];
    const idHeight = data[SEND_MODAL_IDENTITY_UPDATE_ID_BLOCKHEIGHT];
    const updateIdTxHex = data[SEND_MODAL_IDENTITY_UPDATE_TX_HEX];

    const req = new IdentityUpdateRequest();
    req.fromBuffer(Buffer.from(reqHex, 'hex'));

    const updateIdentityTx = await createUpdateIdentityTx(
      systemId,
      req.details,
      address,
      rawIdHex,
      idHeight,
      true,
      updateIdTxHex
    );
    
    if (updateIdentityTx.deltas.size !== 1) throw new Error("Unknown fees");

    const feeObj = Object.fromEntries(updateIdentityTx.deltas.entries());
    const feeCurrency = Object.keys(feeObj)[0];

    props.navigation.navigate(SEND_MODAL_FORM_STEP_CONFIRM, {
      fee: satsToCoins(BigNumber(updateIdentityTx.deltas.get(feeCurrency).abs().toString())).toString(),
      feeCurrency,
      txHex: updateIdentityTx.hex,
      utxos: updateIdentityTx.utxos
    });
  }, [props]);

  return UpdateIdentityFormRender();
};

export default UpdateIdentityForm;
