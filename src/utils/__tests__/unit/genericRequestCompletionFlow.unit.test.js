import {
  GENERIC_REQUEST_COMPLETION_ACTIONS,
  alignGenericResponseNetwork,
  createGenericRequestDeliverySingleFlight,
  getGenericRequestCompletionAction,
} from '../../../containers/DeepLink/GenericRequestHome/genericRequestCompletionFlow';

describe('generic request completion flow', () => {
  it('aligns testnet responses with testnet requests', () => {
    const mainnetResponse = {
      setIsTestnet: jest.fn(),
    };
    const testnetResponse = {
      setIsTestnet: jest.fn(),
    };

    expect(
      alignGenericResponseNetwork(
        {isTestnet: () => false},
        mainnetResponse,
      ),
    ).toBe(mainnetResponse);
    expect(mainnetResponse.setIsTestnet).not.toHaveBeenCalled();

    expect(
      alignGenericResponseNetwork(
        {isTestnet: () => true},
        testnetResponse,
      ),
    ).toBe(testnetResponse);
    expect(testnetResponse.setIsTestnet).toHaveBeenCalledTimes(1);
  });

  it('allows only one delivery attempt until a failed attempt is cleared', () => {
    const singleFlight = createGenericRequestDeliverySingleFlight();

    expect(singleFlight.tryStart()).toBe(true);
    expect(singleFlight.tryStart()).toBe(false);

    singleFlight.clear();

    expect(singleFlight.tryStart()).toBe(true);
  });

  it.each([
    [
      'waits while request details are initializing',
      {
        autoDeliveryRequested: false,
        autoDeliveryStatus: 'idle',
        detailCount: 1,
        detailsProcessed: -1,
        inlineDeliveryInProgress: false,
      },
      GENERIC_REQUEST_COMPLETION_ACTIONS.WAIT,
    ],
    [
      'processes the next unhandled detail',
      {
        autoDeliveryRequested: false,
        autoDeliveryStatus: 'idle',
        detailCount: 2,
        detailsProcessed: 1,
        inlineDeliveryInProgress: false,
      },
      GENERIC_REQUEST_COMPLETION_ACTIONS.PROCESS_NEXT_DETAIL,
    ],
    [
      'runs automatic delivery after all details are handled',
      {
        autoDeliveryRequested: true,
        autoDeliveryStatus: 'idle',
        detailCount: 2,
        detailsProcessed: 2,
        inlineDeliveryInProgress: false,
      },
      GENERIC_REQUEST_COMPLETION_ACTIONS.RUN_AUTO_DELIVERY,
    ],
    [
      'waits while automatic delivery is already active',
      {
        autoDeliveryRequested: true,
        autoDeliveryStatus: 'loading',
        detailCount: 2,
        detailsProcessed: 2,
        inlineDeliveryInProgress: false,
      },
      GENERIC_REQUEST_COMPLETION_ACTIONS.WAIT,
    ],
    [
      'finishes without a delivery sheet when nothing is sent and no detail asked for one',
      {
        autoDeliveryRequested: false,
        autoDeliveryStatus: 'idle',
        detailCount: 2,
        detailsProcessed: 2,
        hasResponseDetails: false,
        inlineDeliveryInProgress: false,
      },
      GENERIC_REQUEST_COMPLETION_ACTIONS.COMPLETE_WITHOUT_RESPONSE,
    ],
    [
      'delivers a response even when no detail asked for delivery',
      {
        autoDeliveryRequested: false,
        autoDeliveryStatus: 'idle',
        detailCount: 2,
        detailsProcessed: 2,
        hasResponseDetails: true,
        inlineDeliveryInProgress: false,
      },
      GENERIC_REQUEST_COMPLETION_ACTIONS.RUN_AUTO_DELIVERY,
    ],
    [
      'waits while inline delivery is active',
      {
        autoDeliveryRequested: false,
        autoDeliveryStatus: 'idle',
        detailCount: 2,
        detailsProcessed: 2,
        inlineDeliveryInProgress: true,
      },
      GENERIC_REQUEST_COMPLETION_ACTIONS.WAIT,
    ],
  ])('%s', (_description, input, expectedAction) => {
    expect(getGenericRequestCompletionAction(input)).toBe(expectedAction);
  });
});
