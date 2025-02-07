import { useCallback } from 'react';

import PPOMUtil from '../../../../lib/ppom/ppom-util';
import { MetaMetricsEvents } from '../../../hooks/useMetrics';
import { isSignatureRequest } from '../utils/confirm';
import { useQRHardwareContext } from '../context/QRHardwareContext/QRHardwareContext';
import useApprovalRequest from './useApprovalRequest';
import { useLedgerWallet } from './useLedgerWallet';
import { useSignatureMetrics } from './useSignatureMetrics';

export const useConfirmActions = () => {
  const {
    onConfirm: onRequestConfirm,
    onReject: onRequestReject,
    approvalRequest,
  } = useApprovalRequest();
  const { captureSignatureMetrics } = useSignatureMetrics();
  const {
    cancelQRScanRequestIfPresent,
    isQRSigningInProgress,
    setScannerVisible,
  } = useQRHardwareContext();
  const { isLedgerAccount, openLedgerSignModal } = useLedgerWallet();

  const isSignatureReq =
    approvalRequest?.type && isSignatureRequest(approvalRequest?.type);

  const onReject = useCallback(async () => {
    // eslint-disable-next-line
    console.log('=================== INTO REJECT ===============');
    await cancelQRScanRequestIfPresent();
    onRequestReject();
    if (isSignatureReq) {
      captureSignatureMetrics(MetaMetricsEvents.SIGNATURE_REJECTED);
      PPOMUtil.clearSignatureSecurityAlertResponse();
    }
  }, [
    cancelQRScanRequestIfPresent,
    captureSignatureMetrics,
    onRequestReject,
    isSignatureReq,
  ]);

  const onApprovalConfirm = useCallback(async () => {
    // eslint-disable-next-line
    console.log('=================== INTO CONFIRM ===============');
    await onRequestConfirm({
      waitForResult: true,
      deleteAfterResult: true,
      handleErrors: false,
    });
    if (isSignatureReq) {
      captureSignatureMetrics(MetaMetricsEvents.SIGNATURE_APPROVED);
      PPOMUtil.clearSignatureSecurityAlertResponse();
    }
  }, [captureSignatureMetrics, onRequestConfirm, isSignatureReq]);

  const onConfirm = useCallback(async () => {
    if (isLedgerAccount) {
      // eslint-disable-next-line
      console.log('=================== LEDGER CONFIRM ===============');
      await openLedgerSignModal(onApprovalConfirm, onReject);
      return;
    }
    if (isQRSigningInProgress) {
      setScannerVisible(true);
      return;
    }
    await onApprovalConfirm();
  }, [
    isLedgerAccount,
    isQRSigningInProgress,
    onApprovalConfirm,
    openLedgerSignModal,
    setScannerVisible,
    onReject,
  ]);

  return { onConfirm, onReject };
};
