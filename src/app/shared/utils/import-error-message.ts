import { TranslateService } from '@ngx-translate/core';

export interface ImportFailureLike {
  name: string;
  reason: string;
  errorCode?: string;
}

const IMPORT_ERROR_PREFIX = 'IMPORT_ERROR_';

function normalizeErrorCode(errorCode?: string): string | null {
  if (!errorCode) return null;

  if (errorCode.startsWith(IMPORT_ERROR_PREFIX)) {
    return errorCode.substring(IMPORT_ERROR_PREFIX.length);
  }

  return errorCode;
}

export function formatImportErrorMessage(
  translate: TranslateService,
  failure: ImportFailureLike
): string {
  const normalizedCode = normalizeErrorCode(failure.errorCode);
  if (!normalizedCode) {
    return failure.reason;
  }

  const params = { name: failure.name, reason: failure.reason };
  const commonKey = `COMMON.${IMPORT_ERROR_PREFIX}${normalizedCode}`;
  const commonMessage = translate.instant(commonKey, params);
  if (commonMessage !== commonKey) {
    return commonMessage;
  }

  // Backward compatibility with existing finance-scoped keys.
  const financeKey = `FINANCE.${IMPORT_ERROR_PREFIX}${normalizedCode}`;
  const financeMessage = translate.instant(financeKey, params);
  if (financeMessage !== financeKey) {
    return financeMessage;
  }

  return failure.reason;
}
