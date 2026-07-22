import { assertPublicAddress } from './safe-webhook-http.client.js';

describe('safe webhook address policy', () => {
  it.each([
    '127.0.0.1',
    '10.0.0.1',
    '100.64.0.1',
    '169.254.169.254',
    '192.168.1.1',
    '::1',
    'fc00::1',
    'fe80::1',
    '::ffff:127.0.0.1',
  ])('rejects non-public address %s', (address) => {
    expect(() => assertPublicAddress(address)).toThrow('non-public address');
  });

  it.each(['8.8.8.8', '2606:4700:4700::1111'])(
    'allows public address %s',
    (address) => {
      expect(() => assertPublicAddress(address)).not.toThrow();
    },
  );
});
