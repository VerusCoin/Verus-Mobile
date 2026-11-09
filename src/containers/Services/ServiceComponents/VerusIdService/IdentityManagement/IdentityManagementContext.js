import React, {createContext, useContext, useMemo, useState} from 'react';
import {captureIdentityUpdateContext} from '../../../../../utils/identityManagement/updateIdentity';

const ManagementContext = createContext(null);

// Transaction plans live only in this session's mounted flow. Routes carry
// public identity identifiers, never transaction hex or signing material.
export function IdentityManagementProvider({children}) {
  const context = useMemo(() => captureIdentityUpdateContext(), []);
  const [plan, setPlan] = useState(null);
  const [result, setResult] = useState(null);
  const [reloadVersion, setReloadVersion] = useState(0);
  return <ManagementContext.Provider value={{context, plan, setPlan, result, setResult, reloadVersion, setReloadVersion}}>
    {children}
  </ManagementContext.Provider>;
}

export const useIdentityManagement = () => useContext(ManagementContext);
