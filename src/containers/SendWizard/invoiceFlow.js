import {createContext, useContext} from 'react';

// A VerusPay invoice paid through the Send screens (InvoicePayFlow). It carries
// the payment options and how the flow ends; outside an invoice it is null.
export const InvoiceFlowContext = createContext(null);

export const useInvoiceFlow = () => useContext(InvoiceFlowContext);
