import { VerusPayInvoiceDetails, CurrencyDefinition, GenericRequest, VerusPayInvoiceDetailsOrdinalVDXFObject, GenericResponse } from "verus-typescript-primitives"
import VrpcProvider from '../../vrpc/vrpcInterface';
import { extractVerusPayInvoiceFromSigAndSigner, getBlock, getInfo } from "../../api/channels/vrpc/callCreators";
import { getCurrency, getIdentity } from "../../api/channels/verusid/callCreators";
import { convertFqnToDisplayFormat } from "../../fullyqualifiedname";
import { VERUSPAY_INVOICE_INFO } from "../../constants/deeplink";
import { satsToCoins } from "../../math";
import { CoinDirectory } from "../../CoinData/CoinDirectory";
import BigNumber from "bignumber.js";

/**
 * @param {GenericRequest} request
 * @param {GenericResponse} response
 * @param {number} invoiceIndex
 * @returns {{
 *  displayProps: {
 *    detailsBufferString: string;
 *    isSigned: boolean;
 *    sigtime?: number;
 *    signerFqn?: string;
 *    signerSystemID?: string;
 *    currencyDefinition: CurrencyDefinition;
 *    amountDisplay?: string,
 *    destinationDisplay: string,
 *    acceptedSystemsDefinitions?: {
 *      definitions: { [key: string]: CurrencyDefinition };
 *      remainingSystems: Array<string>;
 *   }
 *   coinObj: any;
 *   chainInfo: any;
 *  }
 *  response: GenericResponse;
 *  handledIndices: Array<number>;
 * }}
 */
export const handleVerusPayInvoiceDetailsVDXFObject = async (request, response, invoiceIndex) => {
  /**
   * @type {VerusPayInvoiceDetailsOrdinalVDXFObject}
   */
  const details = request.getDetails(invoiceIndex);

  if (details == null) throw new Error("Invalid index for request details");
  if (!(details instanceof VerusPayInvoiceDetailsOrdinalVDXFObject)) throw new Error("Invoice details not found at specified index");

  let displayProps = {};

  if (request.isSigned()) {
    displayProps = await getDisplayDataFromVerusPayInvoiceDetails(
      details.data, 
      request.signature.identityID.toIAddress(), 
      request.signature.signatureAsVch.toString('base64')
    );
  } else {
    displayProps = await getDisplayDataFromVerusPayInvoiceDetails(details.data);
  }

  return {
    displayProps,
    response,
    handledIndices: []
  }
}

/**
 * Gets display data provided a validated Verus Pay Invoice details
 * @param {VerusPayInvoiceDetails} details 
 * @param {string} signingID
 * @param {string} signerSystemID
 * @param {string} signatureAsVch
 * @returns {Promise<{
 *    detailsBufferString: string;
 *    isSigned: boolean;
 *    sigtime?: number;
 *    signerFqn?: string;
 *    signerSystemID?: string;
 *    currencyDefinition: CurrencyDefinition;
 *    amountDisplay?: string,
 *    destinationDisplay: string,
 *    acceptedSystemsDefinitions?: {
 *      definitions: { [key: string]: CurrencyDefinition };
 *      remainingSystems: Array<string>;
 *   }
 *   coinObj: any;
 *   chainInfo: any;
 *   invoiceVersion: string;
 * }>}
 */
export const getDisplayDataFromVerusPayInvoiceDetails = async (details, signingID, signerSystemID, signatureAsVch) => {
  const coinObj = CoinDirectory.getBasicCoinObj(details.isTestnet() ? 'VRSCTEST' : 'VRSC')
  VrpcProvider.initEndpoint(coinObj.system_id, coinObj.vrpc_endpoints[0])

  const chainInfo = await getInfo(coinObj.system_id)
  if (chainInfo.error) throw new Error(chainInfo.error.message)

  const getDestinationDisplay = async () => {
    let destinationDisplay;

    if (details.acceptsAnyDestination()) destinationDisplay = 'any destination'
    else if (details.destination.isIAddr()) {
      const destinationId = await getIdentity(coinObj.system_id, details.destination.getAddressString())
      if (destinationId.error) throw new Error(destinationId.error.message)

      destinationDisplay = convertFqnToDisplayFormat(destinationId.result.fullyqualifiedname)
    } else destinationDisplay = details.destination.getAddressString()

    return destinationDisplay
  }

  const getAcceptedSystemsDefinitions = async () => {
    const acceptedSystems = {
      definitions: {},
      remainingSystems: []
    };

    let i = 0;

    if (!details.excludesVerusBlockchain()) {
      const rootSystemRes = await getCurrency(coinObj.system_id, coinObj.currency_id)
      if (rootSystemRes.error) throw new Error(rootSystemRes.error.message)
      acceptedSystems.definitions[rootSystemRes.result.currencyid] = rootSystemRes.result;
    }

    if (details.acceptsNonVerusSystems()) {
      for (; i < 10 && i < details.acceptedsystems.length; i++) {
        const systemId = details.acceptedsystems[i];

        const systemDefinitionRes = await getCurrency(coinObj.system_id, systemId)
        if (systemDefinitionRes.error) throw new Error(systemDefinitionRes.error.message)

        acceptedSystems.definitions[systemId] = systemDefinitionRes.result;
      }

      for (; i < details.acceptedsystems.length; i++) {
        acceptedSystems.remainingSystems.push(details.acceptedsystems[i])
      }
    }

    return acceptedSystems;
  }

  const requestedCurrency = await getCurrency(coinObj.system_id, details.requestedcurrencyid)
  if (requestedCurrency.error) throw new Error(requestedCurrency.error.message)

  let isSigned, sigtime, signerFqn;

  if (signingID && signatureAsVch) {
    const sig = await extractVerusPayInvoiceFromSigAndSigner(coinObj, signingID, signatureAsVch);

    const sigblock = await getBlock(coinObj.system_id, sig.height);
    if (sigblock.error) throw new Error(sigblock.error.message);

    sigtime = sigblock.result.time;

    const signedBy = await getIdentity(coinObj.system_id, signingID);
    if (signedBy.error) throw new Error(signedBy.error.message);

    isSigned = true;

    signerFqn = convertFqnToDisplayFormat(signedBy.result.fullyqualifiedname);
  }

  return {
    detailsBufferString: details.toBuffer().toString('hex'),
    isSigned,
    sigtime,
    signerFqn,
    signerSystemID,
    currencyDefinition: requestedCurrency.result,
    amountDisplay: details.acceptsAnyAmount() ? null : satsToCoins(BigNumber(details.amount)).toString(),
    destinationDisplay: await getDestinationDisplay(),
    acceptedSystemsDefinitions: await getAcceptedSystemsDefinitions(),
    coinObj,
    chainInfo: chainInfo.result,
    invoiceVersion: details.verusPayVersion.toString()
  }
}