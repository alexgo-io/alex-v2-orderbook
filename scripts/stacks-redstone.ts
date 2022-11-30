#!/usr/bin/env ts-node

// RedStone helper library for Stacks.
// It contains utility functions to convert data received from RedStone oracles
// into formats that can be used with Stacks. See the included signing script
// at `scripts/sign.ts` for an example at how to use this library. It should
// work for both the server and the client side.

import { keccak_256 } from '@noble/hashes/sha3';
import {
  bufferCV,
  BufferCV,
  listCV,
  ListCV,
  tupleCV,
  uintCV,
  UIntCV,
} from 'micro-stacks/clarity';
import {
  concatByteArrays,
  hexToBytes as hexToBytesMS,
} from 'micro-stacks/common';
import {
  compressPublicKey,
  serializePublicKey,
} from 'micro-stacks/transactions';
export interface ShortSinglePrice {
  symbol: string;
  value: any;
}
export interface PricePackage {
  prices: ShortSinglePrice[];
  timestamp: number;
}

// Buffer of "\x19Ethereum Signed Message:\n32"
export const ethPersonalSignPrefix = new Uint8Array([
  0x19, 0x45, 0x74, 0x68, 0x65, 0x72, 0x65, 0x75, 0x6d, 0x20, 0x53, 0x69, 0x67,
  0x6e, 0x65, 0x64, 0x20, 0x4d, 0x65, 0x73, 0x73, 0x61, 0x67, 0x65, 0x3a, 0x0a,
  0x33, 0x32,
]);

/**
 * Utility conversion function that can take both 0x prefixed
 * and unprefixed hex strings.
 * @param hex
 * @returns Uint8Array
 */
export function hexToBytes(hex: string): Uint8Array {
  return hexToBytesMS(hex.substring(0, 2) === '0x' ? hex.substring(2) : hex);
}

/**
 * Calculate a RedStone lite data hash. This hash is not the one
 * that is ultimately signed. Use liteDataHashPersonalSign instead.
 * @param liteByteString
 * @returns
 */
export function liteDataHash(liteByteString: Uint8Array): Uint8Array {
  return keccak_256(liteByteString);
}

/**
 * Calculate the signable lite data hash by prefixing it with the
 * Ethereum personalSign prefix and hashing it. This is needed
 * because lite data hashes are signed using PersonalSign.
 * @param liteDataHash
 * @returns
 */
export function liteDataHashPersonalSign(liteDataHash: Uint8Array): Uint8Array {
  return keccak_256(concatByteArrays([ethPersonalSignPrefix, liteDataHash]));
}

/**
 * Compresses a public key, to be used on the signerPubkey property
 * of a PricePackage object.
 * @param pubKey
 * @returns Uint8Array
 */
export function compressRedstonePubkey(pubKey: Uint8Array): Uint8Array {
  if (pubKey.length === 33) return pubKey;
  else if (pubKey.length === 64) pubKey = new Uint8Array([0x04, ...pubKey]);
  return serializePublicKey(compressPublicKey(pubKey));
}

/**
 * Converts a lite signature to the format expected by Stacks. It merely
 * subtracts 27 from the recovery byte and returns it as a Uint8Array.
 * @param liteSignature
 * @returns Uint8Array
 */
export function liteSignatureToStacksSignature(
  liteSignature: Uint8Array | string,
) {
  if (typeof liteSignature === 'string')
    liteSignature = hexToBytes(liteSignature);
  if (liteSignature.byteLength !== 65)
    throw new Error(
      `Invalid liteSignature, expected 65 bytes got ${liteSignature.byteLength}`,
    );
  let converted = new Uint8Array(liteSignature);
  if (converted[64] > 3) converted[64] -= 27; // subtract from V
  return converted;
}

/**
 * Shifts the price value according to RedStone serialisation.
 * @param value
 * @returns shifted value
 */
export function shiftPriceValue(value: number) {
  return Math.round(value * 10 ** 8);
}

/**
 * Turns a string into a Uint8Array
 * @param input
 * @returns Uint8Array
 */
export function stringToUint8Array(input: string) {
  let codePoints: number[] = [];
  for (let i = 0; i < input.length; ++i) codePoints.push(input.charCodeAt(i));
  return new Uint8Array(codePoints);
}

/**
 * Converts a RedStone PricePackage object into a Clarity Tuple.
 * @param pricePackage
 * @returns Object
 */
export function pricePackageToCV(pricePackage: PricePackage): {
  timestamp: UIntCV;
  prices: ListCV;
} {
  return {
    timestamp: uintCV(pricePackage.timestamp),
    prices: listCV(
      pricePackage.prices.map((entry: ShortSinglePrice) =>
        tupleCV({
          symbol: bufferCV(stringToUint8Array(entry.symbol)),
          value: uintCV(shiftPriceValue(entry.value)),
        }),
      ),
    ),
  };
}

/**
 * Wrap a RedStone lite signature in a Clarity Buffer. It will also
 * convert the signature to the expected format if it detects it
 * has not been converted using liteSignatureToStacksSignature yet.
 * @param liteSignature
 * @returns BufferCV
 */
export function liteSignatureToBufferCV(
  liteSignature: Uint8Array | string,
): BufferCV {
  if (typeof liteSignature === 'string')
    liteSignature = hexToBytes(liteSignature);
  if (liteSignature.byteLength !== 65)
    throw new Error(
      `Invalid liteSignature, expected 65 bytes got ${liteSignature.byteLength}`,
    );
  if (liteSignature[64] > 3)
    liteSignature = liteSignatureToStacksSignature(liteSignature);
  return bufferCV(liteSignature);
}

console.log(
  Buffer.from(
    compressRedstonePubkey(
      hexToBytes(
        '0x04009dd87eb41d96ce8ad94aa22ea8b0ba4ac20c45e42f71726d6b180f93c3f298e333ae7591fe1c9d88234575639be9e81e35ba2fe5ad2c2260f07db49ccb9d0d',
      ),
    ),
  ).toString('hex'),
);

console.log(
  Buffer.from(
    liteSignatureToStacksSignature(
      '0x71b534851bcd7584e7743043917606968cfc571c45e765d088aa07c2347b2c7918506ee6002b4014514523494367232c334d22a25167fcf8682a1f79ada700db1c',
    ),
  ).toString('hex'),
);
