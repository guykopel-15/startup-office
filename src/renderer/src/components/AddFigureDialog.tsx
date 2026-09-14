import { DSButton, DSButtonVariant, DSModal } from '../designKit';
import { AddFigureFields } from './AddFigureFields';
import { FigurePreview } from './FigurePreview';
import { useAddFigureForm } from './useAddFigureForm';

import type React from 'react';

interface AddFigureDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const TITLE = 'Add figure';
const SUBMIT_LABEL = 'Add to office';
const CANCEL_LABEL = 'Cancel';

/** Collects a new employee and seats them through the figures store. */
export function AddFigureDialog({ isOpen, onClose }: AddFigureDialogProps): React.JSX.Element {
  const form = useAddFigureForm();

  const handleClose = (): void => {
    form.reset();
    onClose();
  };

  const handleSubmit = (): void => {
    if (form.submit()) onClose();
  };

  const footer = (
    <>
      <DSButton onClick={handleClose}>{CANCEL_LABEL}</DSButton>
      <DSButton onClick={handleSubmit} variant={DSButtonVariant.Primary}>
        {SUBMIT_LABEL}
      </DSButton>
    </>
  );

  return (
    <DSModal title={TITLE} isOpen={isOpen} onClose={handleClose} footer={footer}>
      <div className="add-figure">
        <div className="add-figure__preview">
          <FigurePreview look={form.values.look} />
        </div>
        <AddFigureFields form={form} />
      </div>
    </DSModal>
  );
}
