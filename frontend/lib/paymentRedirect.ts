const PAYMENT_RETURN_PATH_KEY = 'payment:returnPath';
const DEFAULT_PAYMENT_RETURN_PATH = '/user/bookings';

const isBrowser = () => typeof window !== 'undefined';

export function savePaymentReturnPath(path?: string) {
  if (!isBrowser()) return;

  const nextPath = path || `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (!nextPath.startsWith('/')) return;

  window.sessionStorage.setItem(PAYMENT_RETURN_PATH_KEY, nextPath);
}

export function getPaymentReturnPath() {
  if (!isBrowser()) return DEFAULT_PAYMENT_RETURN_PATH;

  const savedPath = window.sessionStorage.getItem(PAYMENT_RETURN_PATH_KEY);
  if (!savedPath || !savedPath.startsWith('/')) {
    return DEFAULT_PAYMENT_RETURN_PATH;
  }

  return savedPath;
}

export function clearPaymentReturnPath() {
  if (!isBrowser()) return;
  window.sessionStorage.removeItem(PAYMENT_RETURN_PATH_KEY);
}

export function appendPaymentResult(path: string, result: 'success' | 'failed') {
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}payment=${result}`;
}
