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
const URL_PLACEHOLDER = 'https://github.com/owner/repo';
const INVALID_URL = 'Paste a GitHub repository URL like https://github.com/owner/repo';
const HELP_TEXT = 'The office clones the repository into its data folder. Every figure then reads the part that matches its job.';

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
    if (parseGitHubUrl(url) === null) return setValidationError(INVALID_URL);
    setValidationError(undefined);
    loadRepo.mutate(url, { onSuccess: handleClose });
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
      <DSField label="GitHub URL" htmlFor="repo-url" error={error}>
        {(control: DSFieldControlProps): React.ReactNode => <DSInput {...control} value={url} onChange={setUrl} placeholder={URL_PLACEHOLDER} />}
      </DSField>
    </DSModal>
  );
}
