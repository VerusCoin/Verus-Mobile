import React, { useState } from "react";
import { View } from "react-native";
import { useSelector } from "react-redux";
import Styles from "../../../styles/index";
import { Button, Portal } from "react-native-paper";
import VerusPay from "../../VerusPay/VerusPay";
import Colors from "../../../globals/colors";
import { openConvertOrCrossChainSendModal, openSubwalletSendModal } from "../../../actions/actions/sendModal/dispatchers/sendModal";
import { IS_PBAAS, VRPC } from "../../../utils/constants/intervalConstants";
import ListSelectionModal from "../../../components/ListSelectionModal/ListSelectionModal";
import {
  SEND_MODAL_AMOUNT_FIELD,
  SEND_MODAL_CONVERTTO_FIELD,
  SEND_MODAL_EXPORTTO_FIELD,
  SEND_MODAL_IS_PRECONVERT,
  SEND_MODAL_MEMO_FIELD,
  SEND_MODAL_PRICE_ESTIMATE,
  SEND_MODAL_SHOW_CONVERTTO_FIELD,
  SEND_MODAL_SHOW_EXPORTTO_FIELD,
  SEND_MODAL_SHOW_VIA_FIELD,
  SEND_MODAL_TO_ADDRESS_FIELD,
  SEND_MODAL_VIA_FIELD,
} from '../../../utils/constants/sendModal';

const SendCoin = ({ navigation }) => {
  const activeCoin = useSelector(state => state.coins.activeCoin);
  const subWallet = useSelector(state => {
    const chainTicker = state.coins.activeCoin.id;
    return state.coinMenus.activeSubWallets[chainTicker];
  });

  const CONVERT_OR_CROSS_CHAIN_OPTIONS = [
    {
      key: 'convert',
      title: 'Convert currency',
      description: `Convert ${activeCoin.display_ticker} to a different currency while sending it to an address`,
      data: {
        [SEND_MODAL_TO_ADDRESS_FIELD]: '',
        [SEND_MODAL_AMOUNT_FIELD]: '',
        [SEND_MODAL_MEMO_FIELD]: '',
        [SEND_MODAL_CONVERTTO_FIELD]: '',
        [SEND_MODAL_EXPORTTO_FIELD]: '',
        [SEND_MODAL_VIA_FIELD]: '',
        [SEND_MODAL_PRICE_ESTIMATE]: null,
        [SEND_MODAL_IS_PRECONVERT]: false,
        [SEND_MODAL_SHOW_CONVERTTO_FIELD]: true,
        [SEND_MODAL_SHOW_EXPORTTO_FIELD]: true,
        [SEND_MODAL_SHOW_VIA_FIELD]: true,
      },
    },
    {
      key: 'export',
      title: 'Send off-chain',
      description: `Send ${activeCoin.display_ticker} to an address on a different blockchain network without converting it`,
      data: {
        [SEND_MODAL_TO_ADDRESS_FIELD]: '',
        [SEND_MODAL_AMOUNT_FIELD]: '',
        [SEND_MODAL_MEMO_FIELD]: '',
        [SEND_MODAL_CONVERTTO_FIELD]: '',
        [SEND_MODAL_EXPORTTO_FIELD]: '',
        [SEND_MODAL_VIA_FIELD]: '',
        [SEND_MODAL_PRICE_ESTIMATE]: null,
        [SEND_MODAL_IS_PRECONVERT]: false,
        [SEND_MODAL_SHOW_CONVERTTO_FIELD]: false,
        [SEND_MODAL_SHOW_EXPORTTO_FIELD]: true,
        [SEND_MODAL_SHOW_VIA_FIELD]: false,
      },
    },
    {
      key: 'preconvert',
      title: 'Pre-convert',
      description: `Participate in a currency pre-convert that accepts ${activeCoin.display_ticker}`,
      data: {
        [SEND_MODAL_TO_ADDRESS_FIELD]: '',
        [SEND_MODAL_AMOUNT_FIELD]: '',
        [SEND_MODAL_MEMO_FIELD]: '',
        [SEND_MODAL_CONVERTTO_FIELD]: '',
        [SEND_MODAL_EXPORTTO_FIELD]: '',
        [SEND_MODAL_VIA_FIELD]: '',
        [SEND_MODAL_PRICE_ESTIMATE]: null,
        [SEND_MODAL_IS_PRECONVERT]: true,
        [SEND_MODAL_SHOW_CONVERTTO_FIELD]: true,
        [SEND_MODAL_SHOW_EXPORTTO_FIELD]: true,
        [SEND_MODAL_SHOW_VIA_FIELD]: true,
      },
    },
  ];

  const [
    convertOrCrossChainOptionsModalOpen,
    setConvertOrCrossChainOptionsModalOpen,
  ] = useState(false);

  const channel = subWallet.channel.split(".")[0];
  const allowConvertOrOffchain = activeCoin.tags.includes(IS_PBAAS) && channel === VRPC;

  const selectConvertOrCrossChainOption = (option) => {
    setConvertOrCrossChainOptionsModalOpen(false)
    openConvertOrCrossChainSendModal(activeCoin, subWallet, option.data)
  }

  return (
    <View style={Styles.defaultRoot}>
      <Portal>
        {convertOrCrossChainOptionsModalOpen && (
          <ListSelectionModal
            title="Select an Option"
            flexHeight={2}
            visible={convertOrCrossChainOptionsModalOpen}
            onSelect={(item) => selectConvertOrCrossChainOption(item)}
            data={CONVERT_OR_CROSS_CHAIN_OPTIONS}
            cancel={() => setConvertOrCrossChainOptionsModalOpen(false)}
          />
        )}
      </Portal>
      <VerusPay
        coinObj={activeCoin}
        channel={subWallet}
        showSpinner={convertOrCrossChainOptionsModalOpen}
        acceptAddressOnly={true}
        containerStyle={{
          backgroundColor: Colors.primaryColor,
          width: "100%",
        }}
        navigation={navigation}
        maskProps={{
          height: 120,
          width: 150,
        }}
        button={() => (
          <View>
            <Button
              color={Colors.secondaryColor}
              mode={"contained"}
              onPress={() =>
                openSubwalletSendModal(activeCoin, subWallet)
              }
              style={{
                marginBottom: allowConvertOrOffchain ? 8 : 24,
              }}
            >
              {"Enter manually"}
            </Button>
            {allowConvertOrOffchain && (
              <Button
                color={Colors.secondaryColor}
                mode={"text"}
                onPress={() =>
                  setConvertOrCrossChainOptionsModalOpen(true)
                }
                style={{
                  marginBottom: 8,
                }}
              >
                {"Convert or cross-chain"}
              </Button>
            )}
          </View>
        )}
      />
    </View>
  );
};

export default SendCoin;
