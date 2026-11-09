import {call} from 'redux-saga/effects';
import {createResourceLifecycle} from './resourceLifecycle';

export const createEndpointLifecycle = (getProvider, channel, closeErrorMessage, finishInitialization) =>
  createResourceLifecycle({
    channel,
    closeErrorMessage,
    finishInitialization,
    resourceKeyForAction: action =>
      `vrpc:${action.payload.systemId}:${action.payload.endpointAddress}`,
    *initializeResource(action, shouldInitialize) {
      if (shouldInitialize) {
        yield call(
          getProvider().initEndpoint,
          action.payload.systemId,
          action.payload.endpointAddress,
        );
      }
    },
    *deleteResource(action) {
      yield call(
        getProvider().deleteEndpoint,
        action.payload.systemId,
        action.payload.endpointAddress,
      );
    },
  });
