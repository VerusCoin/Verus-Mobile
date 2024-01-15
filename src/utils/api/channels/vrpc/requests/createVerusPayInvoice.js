import VrpcProvider from "../../../../vrpc/vrpcInterface"

export const createVerusPayInvoice = async (coinObj, invoiceDetails) => {
  const verusIdInterface = VrpcProvider.getVerusIdInterface(coinObj.system_id);

  const inv = await verusIdInterface.createVerusPayInvoice(
    invoiceDetails
  );

  return inv;
};