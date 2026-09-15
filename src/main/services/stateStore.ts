import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import { createLogger } from '../../shared/logger';
import { parseSnapshot } from '../../shared/persistence';
import { ServiceError } from '../../shared/response';
import { StateErrorCode } from '../../shared/persistence';

import type { LoadStateResult, Snapshot } from '../../shared/persistence';

const logger = createLogger('state-store');
const BACKUP_SUFFIX = '.bak';
const TEMP_SUFFIX = '.tmp';
const JSON_INDENT = 2;
const FILE_ENCODING = 'utf8';
const MISSING_FILE_CODE = 'ENOENT';
const CORRUPT_WARNING_PREFIX = 'Saved office state could not be read and was moved to ';
const CORRUPT_WARNING_SUFFIX = '. Starting fresh.';

function isMissingFile(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: unknown }).code === MISSING_FILE_CODE;
}

/** Reads and writes the one JSON file the office lives in. Writes go through a temp file so a crash never leaves half a file. */
export class StateStore {
  private readonly filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  /** The saved snapshot, null on first start; a corrupt file is moved aside and reported as a warning. */
  async load(): Promise<LoadStateResult> {
    let text: string;
    try {
      text = await readFile(this.filePath, FILE_ENCODING);
    } catch (error: unknown) {
      if (isMissingFile(error)) return { snapshot: null, warning: null };
      throw error;
    }
    const snapshot = this.parse(text);
    if (snapshot !== null) return { snapshot, warning: null };
    const backupPath = `${this.filePath}${BACKUP_SUFFIX}`;
    await rename(this.filePath, backupPath);
    logger.warn('state file unreadable, moved aside', { backupPath });
    return { snapshot: null, warning: `${CORRUPT_WARNING_PREFIX}${backupPath}${CORRUPT_WARNING_SUFFIX}` };
  }

  async save(snapshot: Snapshot): Promise<void> {
    const tempPath = `${this.filePath}${TEMP_SUFFIX}`;
    try {
      await mkdir(dirname(this.filePath), { recursive: true });
      await writeFile(tempPath, JSON.stringify(snapshot, null, JSON_INDENT), FILE_ENCODING);
      await rename(tempPath, this.filePath);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new ServiceError(StateErrorCode.WriteFailed, message);
    }
  }

  private parse(text: string): Snapshot | null {
    try {
      return parseSnapshot(JSON.parse(text));
    } catch {
      return null;
    }
  }
}
