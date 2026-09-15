import React, { useEffect } from 'react';

import { FloorSetupStep } from '@shared/floors';
import { DSButton, DSButtonVariant, DSModal } from '../designKit';
import { NewFloorForm } from './NewFloorForm';
import { NewFloorProgress } from './NewFloorProgress';
import { useNewFloor } from './useNewFloor';

interface NewFloorDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const TITLE = 'New floor';
const SUBMIT_LABEL = 'Create floor';
const CANCEL_LABEL = 'Cancel';
const CLOSE_LABEL = 'Close';
const CLOSE_AFTER_READY_MS = 700;

/** Collects a repository for a new floor, then shows the setup progress until the floor is ready. */
export function NewFloorDialog({ isOpen, onClose }: NewFloorDialogProps): React.JSX.Element {
  const form = useNewFloor();
  const step = form.floor?.setup.step;
  const isDone = step === FloorSetupStep.Ready || step === FloorSetupStep.Error;

  const handleClose = (): void => {
    form.reset();
    onClose();
  };

  useEffect((): (() => void) | undefined => {
    if (step !== FloorSetupStep.Ready) return undefined;
    const timer = setTimeout(handleClose, CLOSE_AFTER_READY_MS);
    return (): void => clearTimeout(timer);
    // handleClose is recreated every render; the step is the only trigger that matters here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const formFooter = (
    <>
      <DSButton onClick={handleClose}>{CANCEL_LABEL}</DSButton>
      <DSButton onClick={form.submit} variant={DSButtonVariant.Primary}>
        {SUBMIT_LABEL}
      </DSButton>
    </>
  );
  const progressFooter = isDone ? <DSButton onClick={handleClose}>{CLOSE_LABEL}</DSButton> : undefined;

  return (
    <DSModal title={form.floor === null ? TITLE : form.floor.name} isOpen={isOpen} onClose={handleClose} footer={form.floor === null ? formFooter : progressFooter}>
      {form.floor === null ? <NewFloorForm form={form} /> : <NewFloorProgress floor={form.floor} />}
    </DSModal>
  );
}
