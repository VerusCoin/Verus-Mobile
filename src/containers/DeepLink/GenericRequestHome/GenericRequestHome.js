import React, {useState, useEffect} from 'react';
import {View} from 'react-native';
import Styles from '../../../styles/index';
import { primitives } from "verusid-ts-client"
import AnimatedActivityIndicatorBox from '../../../components/AnimatedActivityIndicatorBox';
import { AUTHENTICATION_REQUEST_VDXF_KEY, GenericRequest, GenericResponse, VERUSPAY_INVOICE_DETAILS_VDXF_KEY } from 'verus-typescript-primitives';
import InvoiceInfo from '../InvoiceInfo/InvoiceInfo';
import { handleVerusPayInvoiceDetailsVDXFObject } from '../../../utils/deeplink/handlers/verusPayInvoiceDetailsHandler';
import { handleAuthenticationRequestDetailsVDXFObject } from '../../../utils/deeplink/handlers/authenticationRequestDetailsHandler';
import { createAlert } from '../../../actions/actions/alert/dispatchers/alert';
import { CommonActions } from '@react-navigation/native';
import AuthenticationRequestInfo from '../AuthenticationRequestInfo/AuthenticationRequestInfo';

const GenericRequestHome = props => {
  const {
    deeplinkData
  } = props;

  /**
   * @type {[GenericRequest, (GenericRequest) => {}]}
   */
  const [request, setRequest] = useState(null);
  const [response, setResponse] = useState(new primitives.GenericResponse());

  const [displayProps, setDisplayProps] = useState({});

  const [displayKey, setDisplayKey] = useState(null);

  const [detailIndex, setDetailIndex] = useState(0);

  /**
   * @type {[number, (number) => {}]}
   */
  const [detailsProcessed, setDetailsProcessed] = useState(-1);

  /**
   * @type {[Array<number>, (Array<number>) => {}]}
   */
  const [processedDetailIndices, setProcessedDetailIndices] = useState([]);

  /**
   * @type {Map<string, (GenericRequest, GenericResponse, number) => Promise<{
   *  displayProps?: { [key: string]: any };
   *  response: GenericResponse;
   *  handledIndices: Array<number>;
   * }>}
   */
  const detailHandlers = new Map();

  detailHandlers.set(VERUSPAY_INVOICE_DETAILS_VDXF_KEY.vdxfid, handleVerusPayInvoiceDetailsVDXFObject);
  detailHandlers.set(AUTHENTICATION_REQUEST_VDXF_KEY.vdxfid, handleAuthenticationRequestDetailsVDXFObject);

  /**
   * Processes a detail in the request at a certain index
   * @param {number} index 
   */
  const processDetailAtIndex = async (index) => {
    const detail = request.getDetails(index);

    if (detail) {
      const iaddr = detail.getIAddressKey();

      if (detailHandlers.has(iaddr)) {
        setDetailIndex(index);
        return await detailHandlers.get(iaddr)(request, response, index);
      }
    } else throw new Error("Unable to find detail at index " + index);
  }

  const processNextDetail = async () => {
    const detailsLen = request.details.length;
    const numProcessed = processedDetailIndices.length;

    if (numProcessed < detailsLen) {
      for (let i = 0; i < request.details.length; i++) {
        if (!processedDetailIndices.includes(i)) {
          try {
            const res = await processDetailAtIndex(i);
            const newIndices = [...processedDetailIndices];

            for (const processedIndex of res.handledIndices) {
              if (!processedDetailIndices.includes(processedIndex)) {
                newIndices.push(processedIndex);
              }
            }

            setResponse(res.response);
            setProcessedDetailIndices(newIndices);

            if (res.displayProps) {
              setDisplayProps(res.displayProps)
              setDisplayKey(request.getDetails(i).getIAddressKey());
            } else {
              let newDetailsProcessed = detailsProcessed;

              for (const handledIndex of res.handledIndices) {
                if (!processedDetailIndices.includes(handledIndex)) {
                  newDetailsProcessed++;
                }
              }

              setDetailsProcessed(newDetailsProcessed)
            }

            return;
          } catch (e) {
            createAlert("Error", e.message)
            props.cancel()
            console.warn(e)
          }
        }
      }
    }
  }

  /**
   * Function passed to GUI elements that allows them to update handled
   * indices and response when done
   * @param {GenericResponse} response 
   * @param {Array<number>} handledIndices
   */
  const next = async (response, handledIndices) => {
    let newDetailsProcessed = detailsProcessed;

    for (const handledIndex of handledIndices) {
      if (!processedDetailIndices.includes(handledIndex)) {
        newDetailsProcessed++;
      }
    }

    if (request && newDetailsProcessed < request.details.length - 1) {
      props.navigation.popToTop();
    }

    setResponse(response);
    setProcessedDetailIndices([...processedDetailIndices, ...handledIndices]);
    setDetailsProcessed(newDetailsProcessed);
  }

  useEffect(() => {
    // Do not update after initial update
    if (request == null) {
      const req = new primitives.GenericRequest();
      req.fromBuffer(Buffer.from(deeplinkData, 'hex'));

      setRequest(req);
      setDetailsProcessed(0);
    }
  }, [deeplinkData]);

  useEffect(() => {
    if (request != null) {
      if (detailsProcessed < request.details.length && detailsProcessed >= 0) {
        setDisplayKey(null);
        setDisplayProps({});
        processNextDetail();
      } else {
        const responseBufferString = response.details && response.details.length > 0
          ? response.toBuffer().toString('hex')
          : '';
        const requestBufferString = request.toBuffer().toString('hex');

        props.navigation.navigate('GenericRequestComplete', {
          requestBufferString,
          responseBufferString
        });
      }
    }
  }, [detailsProcessed]);

  const screens = {
    [AUTHENTICATION_REQUEST_VDXF_KEY.vdxfid]: () => (
      <AuthenticationRequestInfo
        {...displayProps}
        cancel={props.cancel}
        setLoading={props.setLoading}
        navigation={props.navigation}
        next={next}
        response={response}
        request={request}
        detailIndex={detailIndex}
      />
    ),
    [VERUSPAY_INVOICE_DETAILS_VDXF_KEY.vdxfid]: () => (
      <InvoiceInfo
        {...displayProps}
        cancel={props.cancel}
        setLoading={props.setLoading}
        navigation={props.navigation}
        next={next}
        response={response}
        request={request}
        detailIndex={detailIndex}
      />
    ),
  };

  return (
    <View style={Styles.flexBackground}>
      {(displayKey == null || props.loading) ? <AnimatedActivityIndicatorBox /> : screens[displayKey]()}
    </View>
  );
};

export default GenericRequestHome;
