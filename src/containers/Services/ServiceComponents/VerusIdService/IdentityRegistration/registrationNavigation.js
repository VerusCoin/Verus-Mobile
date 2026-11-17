import {createContext, useContext} from 'react';

export const RegistrationExitContext = createContext(null);
export const useRegistrationExit = navigation => useContext(RegistrationExitContext) ||
  (() => navigation.getParent().goBack());
