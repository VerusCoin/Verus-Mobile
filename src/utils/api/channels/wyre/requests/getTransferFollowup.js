import WyreProvider from "../../../../services/WyreProvider"

export const getTransferFollowup = async ({ transferId }) => {
  try {    
    return await WyreProvider.getTransferInstructions({
      transferId
    });
  } catch(e) {
    console.error(e)

    throw e
  }
}