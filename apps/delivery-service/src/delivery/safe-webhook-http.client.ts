import { Injectable } from '@nestjs/common';
import { lookup } from 'node:dns/promises';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { BlockList, isIP } from 'node:net';

export interface WebhookHttpResponse {
  statusCode: number;
  body: string;
}

const blockedAddresses = new BlockList();

for (const [address, prefix] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
] as const) {
  blockedAddresses.addSubnet(address, prefix, 'ipv4');
}

blockedAddresses.addAddress('::', 'ipv6');
blockedAddresses.addAddress('::1', 'ipv6');

for (const [address, prefix] of [
  ['64:ff9b::', 96],
  ['64:ff9b:1::', 48],
  ['100::', 64],
  ['2001::', 32],
  ['2001:2::', 48],
  ['2001:db8::', 32],
  ['2001:10::', 28],
  ['2001:20::', 28],
  ['2002::', 16],
  ['fc00::', 7],
  ['fec0::', 10],
  ['fe80::', 10],
  ['ff00::', 8],
] as const) {
  blockedAddresses.addSubnet(address, prefix, 'ipv6');
}

export function assertPublicAddress(
  address: string,
  family = isIP(address),
): void {
  if (
    family === 0 ||
    blockedAddresses.check(address, family === 4 ? 'ipv4' : 'ipv6')
  ) {
    throw new Error('Webhook target resolves to a non-public address');
  }
}

@Injectable()
export class SafeWebhookHttpClient {
  async post(
    target: string,
    headers: Record<string, string>,
    body: string,
  ): Promise<WebhookHttpResponse> {
    if (target.length > 2048) throw new Error('Webhook URL is too long');

    const url = new URL(target);
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error('Webhook URL must use HTTP or HTTPS');
    }
    if (url.username || url.password) {
      throw new Error('Webhook URL credentials are not allowed');
    }

    const hostname = url.hostname.replace(/^\[|\]$/g, '').replace(/\.$/, '');
    const literalFamily = isIP(hostname);
    if (
      (literalFamily === 0 && !hostname.includes('.')) ||
      hostname === 'localhost' ||
      hostname.endsWith('.localhost') ||
      hostname.endsWith('.local')
    ) {
      throw new Error('Webhook target hostname is not public');
    }

    const addresses = literalFamily
      ? [{ address: hostname, family: literalFamily }]
      : await lookup(hostname, { all: true, order: 'verbatim' });
    if (addresses.length === 0) {
      throw new Error('Webhook target hostname did not resolve');
    }
    for (const address of addresses) {
      assertPublicAddress(address.address, address.family);
    }

    const selected = addresses[0];
    const request = url.protocol === 'https:' ? httpsRequest : httpRequest;

    return new Promise<WebhookHttpResponse>((resolve, reject) => {
      let settled = false;
      const finish = (result: WebhookHttpResponse) => {
        if (settled) return;
        settled = true;
        resolve(result);
      };
      const req = request(
        url,
        {
          method: 'POST',
          headers,
          agent: false,
          lookup: (_hostname, _options, callback) =>
            callback(null, selected.address, selected.family),
        },
        (response) => {
          const chunks: Buffer[] = [];
          let size = 0;
          response.on('data', (chunk: Buffer | string) => {
            if (settled) return;
            const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
            const remaining = 5000 - size;
            if (remaining > 0) {
              chunks.push(buffer.subarray(0, remaining));
              size += Math.min(buffer.length, remaining);
            }
            if (size >= 5000) {
              finish({
                statusCode: response.statusCode ?? 0,
                body: Buffer.concat(chunks).toString('utf8'),
              });
              response.destroy();
            }
          });
          response.on('end', () =>
            finish({
              statusCode: response.statusCode ?? 0,
              body: Buffer.concat(chunks).toString('utf8'),
            }),
          );
          response.on('error', (error) => {
            if (!settled) reject(error);
          });
        },
      );
      req.setTimeout(5000, () =>
        req.destroy(new Error('Webhook request timed out')),
      );
      req.on('error', (error) => {
        if (!settled) reject(error);
      });
      req.end(body);
    });
  }
}
