import React, { useState } from "react";
import { View } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import Styles from "../../../styles/index";
import { Button, Portal } from "react-native-paper";
import VerusPay from "../../VerusPay/VerusPay";
import Colors from "../../../globals/colors";
import { openConvertOrCrossChainSendModal, openSubwalletSendModal } from "../../../actions/actions/sendModal/dispatchers/sendModal";
import { IS_PBAAS, VRPC } from "../../../utils/constants/intervalConstants";
import ListSelectionModal from "../../../components/ListSelectionModal/ListSelectionModal";
import {
  SEND_MODAL_ADVANCED_FORM,
  SEND_MODAL_AMOUNT_FIELD,
  SEND_MODAL_CONVERTTO_FIELD,
  SEND_MODAL_DISABLED_INPUTS,
  SEND_MODAL_EXPORTTO_FIELD,
  SEND_MODAL_IS_PRECONVERT,
  SEND_MODAL_MAPPING_FIELD,
  SEND_MODAL_MEMO_FIELD,
  SEND_MODAL_PRICE_ESTIMATE,
  SEND_MODAL_SHOW_CONVERTTO_FIELD,
  SEND_MODAL_SHOW_EXPORTTO_FIELD,
  SEND_MODAL_SHOW_IS_PRECONVERT,
  SEND_MODAL_SHOW_MAPPING_FIELD,
  SEND_MODAL_SHOW_VIA_FIELD,
  SEND_MODAL_TO_ADDRESS_FIELD,
  SEND_MODAL_VIA_FIELD,
} from '../../../utils/constants/sendModal';
import { saveGeneralSettings } from "../../../actions/actionCreators";
import { openUrl } from "../../../utils/linking";
import { createAlert, resolveAlert } from "../../../actions/actions/alert/dispatchers/alert";
import {
  CONVERSION_DISABLED
} from '../../../../env/index';

const SendCoin = ({ navigation }) => {
  const activeCoin = useSelector(state => state.coins.activeCoin);
  const subWallet = useSelector(state => {
    const chainTicker = state.coins.activeCoin.id;
    return state.coinMenus.activeSubWallets[chainTicker];
  });
  const generalWalletSettings = useSelector(
    state => state.settings.generalWalletSettings,
  );
  const dispatch = useDispatch()

  const CONVERT_OR_CROSS_CHAIN_OPTIONS = CONVERSION_DISABLED ? [
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
        [SEND_MODAL_MAPPING_FIELD]: '',
        [SEND_MODAL_PRICE_ESTIMATE]: null,
        [SEND_MODAL_IS_PRECONVERT]: false,
        [SEND_MODAL_SHOW_CONVERTTO_FIELD]: false,
        [SEND_MODAL_SHOW_EXPORTTO_FIELD]: true,
        [SEND_MODAL_SHOW_MAPPING_FIELD]: true,
        [SEND_MODAL_SHOW_VIA_FIELD]: false,
        [SEND_MODAL_ADVANCED_FORM]: false,
        [SEND_MODAL_DISABLED_INPUTS]: {
          [SEND_MODAL_MAPPING_FIELD]: activeCoin.proto === 'vrsc'
        }
      },
    },
    {
      key: 'advanced',
      title: 'Advanced',
      description: 'Send off-chain using an unguided form',
      data: {
        [SEND_MODAL_TO_ADDRESS_FIELD]: '',
        [SEND_MODAL_AMOUNT_FIELD]: '',
        [SEND_MODAL_MEMO_FIELD]: '',
        [SEND_MODAL_CONVERTTO_FIELD]: '',
        [SEND_MODAL_EXPORTTO_FIELD]: '',
        [SEND_MODAL_VIA_FIELD]: '',
        [SEND_MODAL_MAPPING_FIELD]: '',
        [SEND_MODAL_PRICE_ESTIMATE]: null,
        [SEND_MODAL_IS_PRECONVERT]: false,
        [SEND_MODAL_SHOW_CONVERTTO_FIELD]: false,
        [SEND_MODAL_SHOW_EXPORTTO_FIELD]: true,
        [SEND_MODAL_SHOW_MAPPING_FIELD]: (activeCoin.proto === 'erc20' || activeCoin.proto === 'eth'),
        [SEND_MODAL_SHOW_VIA_FIELD]: false,
        [SEND_MODAL_ADVANCED_FORM]: true,
        [SEND_MODAL_SHOW_IS_PRECONVERT]: false,
        [SEND_MODAL_DISABLED_INPUTS]: {}
      },
    }
  ] : [
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
        [SEND_MODAL_MAPPING_FIELD]: '',
        [SEND_MODAL_PRICE_ESTIMATE]: null,
        [SEND_MODAL_IS_PRECONVERT]: false,
        [SEND_MODAL_SHOW_CONVERTTO_FIELD]: true,
        [SEND_MODAL_SHOW_EXPORTTO_FIELD]: true,
        [SEND_MODAL_SHOW_MAPPING_FIELD]: false,
        [SEND_MODAL_SHOW_VIA_FIELD]: true,
        [SEND_MODAL_ADVANCED_FORM]: false,
        [SEND_MODAL_DISABLED_INPUTS]: {}
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
        [SEND_MODAL_MAPPING_FIELD]: '',
        [SEND_MODAL_PRICE_ESTIMATE]: null,
        [SEND_MODAL_IS_PRECONVERT]: false,
        [SEND_MODAL_SHOW_CONVERTTO_FIELD]: false,
        [SEND_MODAL_SHOW_EXPORTTO_FIELD]: true,
        [SEND_MODAL_SHOW_MAPPING_FIELD]: true,
        [SEND_MODAL_SHOW_VIA_FIELD]: false,
        [SEND_MODAL_ADVANCED_FORM]: false,
        [SEND_MODAL_DISABLED_INPUTS]: {
          [SEND_MODAL_MAPPING_FIELD]: activeCoin.proto === 'vrsc'
        }
      },
    },
    {
      key: 'preconvert',
      title: 'Preconvert',
      description: `Participate in a currency preconvert that accepts ${activeCoin.display_ticker}`,
      data: {
        [SEND_MODAL_TO_ADDRESS_FIELD]: '',
        [SEND_MODAL_AMOUNT_FIELD]: '',
        [SEND_MODAL_MEMO_FIELD]: '',
        [SEND_MODAL_CONVERTTO_FIELD]: '',
        [SEND_MODAL_EXPORTTO_FIELD]: '',
        [SEND_MODAL_VIA_FIELD]: '',
        [SEND_MODAL_MAPPING_FIELD]: '',
        [SEND_MODAL_PRICE_ESTIMATE]: null,
        [SEND_MODAL_IS_PRECONVERT]: true,
        [SEND_MODAL_SHOW_CONVERTTO_FIELD]: true,
        [SEND_MODAL_SHOW_EXPORTTO_FIELD]: true,
        [SEND_MODAL_SHOW_MAPPING_FIELD]: false,
        [SEND_MODAL_SHOW_VIA_FIELD]: false,
        [SEND_MODAL_ADVANCED_FORM]: false,
        [SEND_MODAL_DISABLED_INPUTS]: {}
      },
    },
    {
      key: 'advanced',
      title: 'Advanced',
      description: 'Send off-chain, convert, or preconvert using an unguided form',
      data: {
        [SEND_MODAL_TO_ADDRESS_FIELD]: '',
        [SEND_MODAL_AMOUNT_FIELD]: '',
        [SEND_MODAL_MEMO_FIELD]: '',
        [SEND_MODAL_CONVERTTO_FIELD]: '',
        [SEND_MODAL_EXPORTTO_FIELD]: '',
        [SEND_MODAL_VIA_FIELD]: '',
        [SEND_MODAL_MAPPING_FIELD]: '',
        [SEND_MODAL_PRICE_ESTIMATE]: null,
        [SEND_MODAL_IS_PRECONVERT]: false,
        [SEND_MODAL_SHOW_CONVERTTO_FIELD]: true,
        [SEND_MODAL_SHOW_EXPORTTO_FIELD]: true,
        [SEND_MODAL_SHOW_MAPPING_FIELD]: (activeCoin.proto === 'erc20' || activeCoin.proto === 'eth'),
        [SEND_MODAL_SHOW_VIA_FIELD]: true,
        [SEND_MODAL_ADVANCED_FORM]: true,
        [SEND_MODAL_SHOW_IS_PRECONVERT]: true,
        [SEND_MODAL_DISABLED_INPUTS]: {}
      },
    },
  ];

  if (activeCoin.proto === 'eth' || activeCoin.proto === 'erc20') {
    CONVERT_OR_CROSS_CHAIN_OPTIONS.splice(2, 1);
  }

  const [
    convertOrCrossChainOptionsModalOpen,
    setConvertOrCrossChainOptionsModalOpen,
  ] = useState(false);

  const channel = subWallet.channel.split(".")[0];
  const allowConvertOrOffchain =
    (activeCoin.tags.includes(IS_PBAAS) && channel === VRPC) ||
    activeCoin.proto === 'erc20' ||
    activeCoin.proto === 'eth';

  const selectConvertOrCrossChainOption = (option) => {
    setConvertOrCrossChainOptionsModalOpen(false)
    openConvertOrCrossChainSendModal(activeCoin, subWallet, option.data)
  }

  const openConvertOrCrossChainModal = () => {
    const { ackedCurrencyDisclaimer } = generalWalletSettings;

    if (!!!ackedCurrencyDisclaimer) {
      createAlert(
        'Disclaimer',
        `Please read and acknowledge the following before proceeding:

1. The Verus Protocol and The Verus Mobile Wallet are open-source projects under the MIT license, offered "as is" without warranties.
        
2. The wallet facilitates interaction with a peer-to-peer protocol that allows for currency conversion. The Verus Mobile Wallet's creators, developers, and maintainers are not intermediaries in any Verus Public Blockchains as a Service (PBaaS) transaction, and do not endorse or recommend any specific network currency whatsoever.
        
3. You bear sole responsibility for understanding the risks and mechanics involved in currency conversion.
        
4. You agree that the wallet's creators, developers, and maintainers are not liable for any loss or other outcomes that may result from your use of these protocols.
        
By proceeding, you confirm that you've read, understood, and agreed to this. Ensure you fully understand the currencies you choose to convert.`,
        [
          {
            text: 'Cancel',
            onPress: () => resolveAlert(false),
            style: 'cancel',
          },
          {text: 'Learn', onPress: () => {
            openUrl("https://docs.verus.io/sendcurrency/");
            resolveAlert(false);
          }},
          {text: 'Continue', onPress: async () => {
            setConvertOrCrossChainOptionsModalOpen(true);
            dispatch(await saveGeneralSettings({ ackedCurrencyDisclaimer: true }));
            resolveAlert(true);
          }},
        ],
      );
    } else setConvertOrCrossChainOptionsModalOpen(true);
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
              buttonColor={Colors.secondaryColor}
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
                textColor={Colors.secondaryColor}
                onPress={() =>
                  openConvertOrCrossChainModal()
                }
                style={{
                  marginBottom: 8,
                }}
              >
                {CONVERSION_DISABLED ? "Send cross-chain" : "Convert or cross-chain"}
              </Button>
            )}
          </View>
        )}
      />
    </View>
  );
};

export default SendCoin;
