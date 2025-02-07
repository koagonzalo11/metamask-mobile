import { MessageParams } from '@metamask/signature-controller';
import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';

import ExtendedKeyringTypes from '../../../../constants/keyringTypes';
import Routes from '../../../../constants/navigation/Routes';
import { createNavigationDetails } from '../../../../util/navigation/navUtils';
import { getDeviceId } from '../../../../core/Ledger/Ledger';
import {
  getKeyringByAddress,
  isHardwareAccount,
} from '../../../../util/address';
import { LedgerMessageSignModalParams } from '../../../UI/LedgerModals/LedgerMessageSignModal';
import useApprovalRequest from './useApprovalRequest';

const createLedgerSignModelNav = async (
  onReject: () => Promise<void>,
  onConfirm: () => Promise<void>,
  messageParams: MessageParams,
  signType: string,
) => {
  const keyring = getKeyringByAddress(messageParams.from);
  if (!keyring) {
    throw new Error(`Keyring not found for address ${messageParams.from}`);
  }

  const onConfirmationComplete = async (confirmed: boolean) => {
    if (!confirmed) {
      await onReject();
    } else {
      await onConfirm();
    }
  };

  const deviceId = await getDeviceId();

  return createNavigationDetails<LedgerMessageSignModalParams>(
    Routes.LEDGER_MESSAGE_SIGN_MODAL,
  )({
    messageParams,
    onConfirmationComplete,
    type: signType,
    deviceId,
  });
};

export const useLedgerWallet = () => {
  const navigation = useNavigation();
  const { approvalRequest } = useApprovalRequest();
  const fromAddress = approvalRequest?.requestData?.from as string;
  const isLedgerAccount = isHardwareAccount(fromAddress, [
    ExtendedKeyringTypes.ledger,
  ]);

  const openLedgerSignModal = useCallback(
    async (onApprovalConfirm, onReject) => {
      navigation.navigate(
        ...(await createLedgerSignModelNav(
          onReject,
          onApprovalConfirm,
          approvalRequest?.requestData,
          approvalRequest?.type ?? '',
        )),
      );
    },
    [approvalRequest?.requestData, approvalRequest?.type, navigation],
  );

  return { isLedgerAccount, openLedgerSignModal };
};
