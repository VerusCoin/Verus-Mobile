// DEPRECATED, TODO: Remove

import {
  SET_ACTIVE_IDENTITY,
  STORE_IDENTITIES,
  SET_IDENTITIES,
  ADD_NEW_IDENTITY_NAME,
  ADD_NEW_IDENTITY,
  CHANGE_ACTIVE_IDENTITY,
  DESELECT_ACTIVE_IDENTITY,
  SET_NEW_ACTIVE_IDENTITY,
} from '../../utils/constants/storeType';

export const storeIdentities = () => ({
  type: STORE_IDENTITIES,
  payload: {},
});

export const setActiveIdentity = (identityId) => ({
  type: SET_ACTIVE_IDENTITY,
  payload: { identityId },
});

export const setIdentities = (identities) => ({
  type: SET_IDENTITIES,
  payload: { identities },
});

export const addNewIdentityName = (identityName) => ({
  type: ADD_NEW_IDENTITY_NAME,
  payload: { identityName },
});

export const addNewIdentity = (identity) => ({
  type: ADD_NEW_IDENTITY,
  payload: { identity },
});

export const changeActiveIdentity = (newActiveIdentityId) => ({
  type: CHANGE_ACTIVE_IDENTITY,
  payload: { newActiveIdentityId },
});

export const deselectActiveIdentity = (activeIdentityId) => ({
  type: DESELECT_ACTIVE_IDENTITY,
  payload: { activeIdentityId },
});

export const setNewActiveIdentity = (newActiveIdentityId) => ({
  type: SET_NEW_ACTIVE_IDENTITY,
  payload: { newActiveIdentityId },
});
