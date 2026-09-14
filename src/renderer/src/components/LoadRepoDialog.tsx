import React, { useState } from 'react';

import { parseGitHubUrl } from '@shared/repo';
import { useLoadRepo } from '../api/repoQueries';
import { DSButton, DSButtonVariant, DSField, DSInput, DSModal } from '../designKit';

import type { DSFieldControlProps } from '../designKit';

interface LoadRepoDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const TITLE = 'Load repo';
const SUBMIT_LABEL = 'Clone';
const CLONING_LABEL = 'Cloning…';
const CANCEL_LABEL = 'Cancel';
const URL_LABEL = 'GitHub URL';
export const URL_FIELD_ID = 'repo-url';
const URL_PLACEHOLDER = 'https://github.com/owner/repo';
const INVALID_URL = 'Paste a GitHub repository URL like https://github.com/owner/repo';
const HELP_TEXT = 'The office clones the repository into its data folder so the figures can work on it.';
const ENTER_KEY = 'Enter';

/** Paste a GitHub URL; main clones it and the status chip in the navbar follows along. */
export function LoadRepoDialog({ isOpen, onClose }: LoadRepoDialogProps): React.JSX.Element {
  const [url, setUrl] = useState('');
  const [validationError, setValidationError] = useState<string | undefined>(undefined);
  const loadRepo = useLoadRepo();

  const handleClose = (): void => {
    setUrl('');
    setValidationError(undefined);
    loadRepo.reset();
    onClose();
  };

  const handleSubmit = (): void => {
    if (loadRepo.isPending) return;
    if (parseGitHubUrl(url) === null) return setValidationError(INVALID_URL);
    setValidationError(undefined);
    loadRepo.mutate(url, { onSuccess: handleClose });
  };

  const handleUrlChange = (value: string): void => {
    setUrl(value);
    setValidationError(undefined);
    if (loadRepo.isError) loadRepo.reset();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === ENTER_KEY) handleSubmit();
  };

  const error = validationError ?? loadRepo.error?.message;
  const footer = (
    <>
      <DSButton onClick={handleClose}>{CANCEL_LABEL}</DSButton>
      <DSButton onClick={handleSubmit} variant={DSButtonVariant.Primary} isDisabled={loadRepo.isPending}>
        {loadRepo.isPending ? CLONING_LABEL : SUBMIT_LABEL}
      </DSButton>
    </>
  );

  return (
    <DSModal title={TITLE} isOpen={isOpen} onClose={handleClose} footer={footer}>
      <p className="dialog-help">{HELP_TEXT}</p>
      <DSField label={URL_LABEL} htmlFor={URL_FIELD_ID} error={error}>
        {(control: DSFieldControlProps): React.ReactNode => <DSInput {...control} value={url} onChange={handleUrlChange} onKeyDown={handleKeyDown} placeholder={URL_PLACEHOLDER} />}
      </DSField>
    </DSModal>
  );
}
