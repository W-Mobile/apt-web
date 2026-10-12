import '@testing-library/jest-dom';

// amplify_outputs.json in this repo points to the PRODUCTION backend. Tests
// must mock the *-api modules; as a safety net, any request a test makes to
// AWS (AppSync, Cognito, S3, API Gateway) fails instead of reaching it.
const AWS_HOST = /amazonaws\.com|amazoncognito\.com|amplifyapp\.com/i;

function blockedError(url: unknown): Error {
  return new Error(`Network access to AWS is blocked in tests (mock the api module instead): ${String(url)}`);
}

const originalFetch = globalThis.fetch;
globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  if (AWS_HOST.test(url)) return Promise.reject(blockedError(url));
  return originalFetch(input, init);
}) as typeof fetch;

if (typeof XMLHttpRequest !== 'undefined') {
  const originalOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (this: XMLHttpRequest, method: string, url: string | URL, ...rest: unknown[]) {
    if (AWS_HOST.test(String(url))) throw blockedError(url);
    return (originalOpen as (...args: unknown[]) => void).call(this, method, url, ...rest);
  } as typeof XMLHttpRequest.prototype.open;
}
