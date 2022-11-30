#!/usr/bin/env ts-node

// These are helper scripts to make development a little bit easier.
// DO NOT USE REAL SEED PHRASES OR PRIVATE KEYS.

import { StacksMocknet } from '@stacks/network';
import {
  ClarityValue,
  createStacksPrivateKey,
  serializeCV,
  signWithKey,
  StacksPrivateKey,
  stringAsciiCV,
  tupleCV,
  uintCV,
} from '@stacks/transactions';
import { createHash } from 'crypto';

const structuredDataPrefix = Buffer.from([0x53, 0x49, 0x50, 0x30, 0x31, 0x38]);

function sha256(data: Uint8Array): Buffer {
  return createHash('sha256').update(data).digest();
}

function structuredDataHash(structuredData: ClarityValue): Buffer {
  return sha256(serializeCV(structuredData));
}

const domainHash = structuredDataHash(
  tupleCV({
    name: stringAsciiCV('STXDX Protocol'),
    version: stringAsciiCV('0.0.1'),
    'chain-id': uintCV(new StacksMocknet().chainId),
  }),
);

function signStructuredData(
  privateKey: StacksPrivateKey,
  structuredData: ClarityValue,
) {
  const messageHash = structuredDataHash(structuredData);
  const input = sha256(
    Buffer.concat([structuredDataPrefix, domainHash, messageHash]),
  );
  const data = signWithKey(privateKey, input.toString('hex')).data;
  return Buffer.from(data.slice(2) + data.slice(0, 2), 'hex');
}

if (process.argv.length !== 4) {
  console.log(`Usage: ts-node sign-order-hash <private key> <order hash>`);
  process.exit(0);
}

function toBuffer(input: string) {
  return Buffer.from(
    input.length >= 2 && input[1] === 'x' ? input.slice(2) : input,
    'hex',
  );
}

const private_key = process.argv[2];
const hash = process.argv[3];

const stacksPrivateKey = createStacksPrivateKey(toBuffer(private_key));

function signOrderHash(private_key: StacksPrivateKey, hash: Buffer) {
  const message = createHash('sha256')
    .update(Buffer.concat([structuredDataPrefix, domainHash, hash]))
    .digest();
  const data = signWithKey(private_key, message.toString('hex')).data;
  return Buffer.from(data.slice(2) + data.slice(0, 2), 'hex');
}

// console.log(structuredDataPrefix.toString('hex'));
// console.log(domainHash.toString('hex'));
// console.log(hash);

const signature = signOrderHash(stacksPrivateKey, toBuffer(hash));

console.log('0x' + signature.toString('hex'));
