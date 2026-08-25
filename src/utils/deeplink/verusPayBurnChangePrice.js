import { API_SEND } from "../constants/intervalConstants";
import { IS_GATEWAY_FLAG, IS_TOKEN_FLAG } from "../constants/currencies";

export const VERUSPAY_BURN_OWN_ADDRESS_DISPLAY =
  "Your own address (selected from the paying wallet)";

export const validateVerusPayBurnChangePrice = (
  details,
  currencyDefinition,
  defaultSystemId,
) => {
  if (!details.isBurnChangePrice()) return;

  if (details.acceptsConversion()) {
    throw new Error(
      "Burn-change-price invoices cannot allow currency conversion.",
    );
  }

  if (details.isPreconvert()) {
    throw new Error("Burn-change-price invoices cannot be preconverts.");
  }

  if (
    currencyDefinition == null ||
    (Number(currencyDefinition.options) & IS_TOKEN_FLAG) !== IS_TOKEN_FLAG
  ) {
    throw new Error(
      "Burn-change-price invoices can only burn token currencies.",
    );
  }

  if (
    (Number(currencyDefinition.options) & IS_GATEWAY_FLAG) === IS_GATEWAY_FLAG
  ) {
    throw new Error(
      "Burn-change-price invoices cannot burn gateway currencies.",
    );
  }

  if (
    !details.acceptsAnyDestination() &&
    (
      details.destination == null ||
      (!details.destination.isPKH() && !details.destination.isIAddr())
    )
  ) {
    throw new Error(
      "Burn output destination must be a transparent address or VerusID.",
    );
  }

  const burnSystemId = currencyDefinition.systemid;
  const acceptsDefaultSystem =
    !details.excludesVerusBlockchain() && burnSystemId === defaultSystemId;
  const acceptsBurnSystem =
    details.acceptsNonVerusSystems() &&
    (details.acceptedsystems || []).includes(burnSystemId);

  if (!acceptsDefaultSystem && !acceptsBurnSystem) {
    throw new Error(
      "This burn invoice does not accept the currency's native system.",
    );
  }
};

export const getVerusPayInvoicePaymentDestination = (
  details,
  activeAccount,
  coinObj,
  wallet,
) => {
  if (!details.acceptsAnyDestination()) {
    if (
      details.destination == null ||
      typeof details.destination.getAddressString !== "function"
    ) {
      throw new Error("Burn invoice destination is missing or invalid.");
    }

    return details.destination.getAddressString();
  }

  if (!details.isBurnChangePrice()) return "";

  const sendChannel = wallet?.api_channels?.[API_SEND];
  const ownAddress =
    sendChannel == null
      ? null
      : activeAccount?.keys?.[coinObj.id]?.[sendChannel]?.addresses?.[0];

  if (!ownAddress) {
    throw new Error(
      "Unable to find your address for the selected burn source.",
    );
  }

  return ownAddress;
};
