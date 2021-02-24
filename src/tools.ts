export function replaceProtocolInUrl(url: string, newProtocol: string) {
  const baseURL = new URL(url);

  const protocol = baseURL.protocol + '//';
  if (url.startsWith(protocol)) {
    const newUrl = newProtocol + url.substr(0 + protocol.length);
    return newUrl;
  }
}
