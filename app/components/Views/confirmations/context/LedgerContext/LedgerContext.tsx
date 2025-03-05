import React, {
  ReactElement,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

import ExtendedKeyringTypes from '../../../../../constants/keyringTypes';
import { getDeviceId } from '../../../../../core/Ledger/Ledger';
import {
  getKeyringByAddress,
  isHardwareAccount,
} from '../../../../../util/address';
import useApprovalRequest from '../../hooks/useApprovalRequest';
import LedgerSignModal from '../../components/Confirm/LedgerSignModal';
import { RootState } from '../../../../../reducers';
import { useSelector } from 'react-redux';
import { iEventGroup, RPCStageTypes } from '../../../../../reducers/rpcEvents';
import { useNavigation } from '@react-navigation/native';

export interface LedgerContextType {
  deviceId?: string;
  isLedgerAccount: boolean;
  ledgerSigningInProgress: boolean;
  openLedgerSignModal: () => void;
  closeLedgerSignModal: () => void;
}

export const LedgerContext = createContext<LedgerContextType>({
  deviceId: undefined,
  isLedgerAccount: false,
  ledgerSigningInProgress: false,
  openLedgerSignModal: () => undefined,
  closeLedgerSignModal: () => undefined,
});

export const LedgerContextProvider: React.FC<{
  children: ReactElement[] | ReactElement;
}> = ({ children }) => {
  const navigation = useNavigation();
  const { approvalRequest } = useApprovalRequest();
  const fromAddress = approvalRequest?.requestData?.from as string;
  const isLedgerAccount =
    isHardwareAccount(fromAddress, [ExtendedKeyringTypes.ledger]) ?? false;
  const [ledgerSigningInProgress, setLedgerSigningInProgress] =
    useState(isLedgerAccount);
  const [ledgerSignModalOpen, setLedgerSignModalOpen] = useState(false);
  const [deviceId, setDeviceId] = useState<string>();
  const { signingEvent }: iEventGroup = useSelector(
    (state: RootState) => state.rpcEvents,
  );

  useEffect(() => {
    navigation.addListener('beforeRemove', () => setLedgerSignModalOpen(false));
    return () =>
      navigation.removeListener('beforeRemove', () =>
        setLedgerSignModalOpen(false),
      );
  }, [setLedgerSignModalOpen, navigation]);

  useEffect(() => {
    console.log(
      '======================= RECEIVED EVENT =================',
      signingEvent,
    );
    //Close the modal when the signMessageStage is complete or error, error will return the error message to the user
    if (
      signingEvent.eventStage === RPCStageTypes.COMPLETE ||
      signingEvent.eventStage === RPCStageTypes.ERROR
    ) {
      console.log(
        '======================= RECEIVED EVENT =================',
        signingEvent,
      );
      setLedgerSignModalOpen(false);
    }
  }, [signingEvent, signingEvent.eventStage, setLedgerSignModalOpen]);

  const openLedgerSignModal = useCallback(() => {
    setLedgerSigningInProgress(false);
    setLedgerSignModalOpen(true);
  }, []);

  const closeLedgerSignModal = useCallback(() => {
    setLedgerSignModalOpen(false);
  }, [setLedgerSignModalOpen]);

  useEffect(() => {
    if (!isLedgerAccount) {
      return;
    }

    let isMounted = true;
    const keyring = getKeyringByAddress(fromAddress);
    if (!keyring) {
      throw new Error(`Keyring not found for address ${fromAddress}`);
    }

    (async () => {
      const id = await getDeviceId();
      if (isMounted) {
        setDeviceId(id);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [fromAddress, isLedgerAccount, setDeviceId]);

  return (
    <LedgerContext.Provider
      value={{
        deviceId,
        isLedgerAccount,
        ledgerSigningInProgress,
        openLedgerSignModal,
        closeLedgerSignModal,
      }}
    >
      {children}
      {ledgerSignModalOpen && <LedgerSignModal />}
    </LedgerContext.Provider>
  );
};

export const useLedgerContext = () => {
  const context = useContext(LedgerContext);
  if (!context) {
    throw new Error(
      'useLedgerContext must be used within an LedgerContextProvider',
    );
  }
  return context;
};
