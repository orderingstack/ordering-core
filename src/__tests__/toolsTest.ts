import { replaceProtocolInUrl } from '../tools';

test('replaceProtocolInUrl', () => {
  const url = 'https://ordering.3e.pl/abc/123';
  const newUrl = replaceProtocolInUrl(url, 'wss://');
  expect(newUrl).toBe('wss://ordering.3e.pl/abc/123');
});
