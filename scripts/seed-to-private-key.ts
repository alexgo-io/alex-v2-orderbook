#!/usr/bin/env ts-node

// These are helper scripts to make development a little bit easier.
// DO NOT USE REAL SEED PHRASES OR PRIVATE KEYS.

import { ChainID, TransactionVersion } from '@stacks/common';
import { Wallet } from '@stacks/keychain';
import { pubKeyfromPrivKey } from '@stacks/transactions';

if (process.argv.length !== 3) {
  console.log(`Usage: ts-node seed-to-private-key "<seed phrase>"`);
  process.exit(0);
}

Wallet.restore('', process.argv[2], ChainID.Testnet).then(wallet => {
  const signer = wallet.getSigner();
  console.log('Seed phrase:     ' + process.argv[2]);
  console.log('private key:     ' + signer.getSTXPrivateKey().toString('hex'));
  console.log(
    'Mainnet address: ' + signer.getSTXAddress(TransactionVersion.Mainnet),
  );
  console.log(
    'Testnet address: ' + signer.getSTXAddress(TransactionVersion.Testnet),
  );
  const pubkey = pubKeyfromPrivKey(signer.getSTXPrivateKey()).data;
  console.log(
    'Public key:      ' +
      Buffer.from(pubkey, pubkey.byteOffset, pubkey.byteLength).toString('hex'),
  );
});
