import { readRequest, writeRequest } from 'verus-pay-utils'

const readVerusPay = (data) => {
  return readRequest(data, true)
} 

const writeVerusPayQR = (coinObj, amount, address, note) => {  
  const { id, system_id, display_name, display_ticker } = coinObj;

  return writeRequest(
    id,
    system_id,
    display_name,
    display_ticker,
    address,
    amount,
    null,
    null,
    note,
    true
  );
}

export default {
  readVerusPay,
  writeVerusPayQR
}