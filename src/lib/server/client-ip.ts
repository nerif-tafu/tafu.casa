/**
 * adapter-node throws from getClientAddress() when ADDRESS_HEADER is configured
 * but the header is missing — which happens for anything reaching the pod
 * directly rather than through the proxy (health probes, port-forward).
 * Those requests share the 'unknown' bucket rather than breaking the request.
 */
export function safeClientAddress(getClientAddress: () => string): string {
  try {
    return getClientAddress();
  } catch {
    return 'unknown';
  }
}
