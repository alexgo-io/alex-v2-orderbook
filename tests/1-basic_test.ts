// deno-lint-ignore-file no-explicit-any
import {
  Account,
  assertEquals,
  Chain,
  Clarinet,
  contractNames,
  orderToTupleCV,
  perpOrderToTupleCV,
  prepareChainBasicTest,
  PricePackage,
  pricePackageToCV,
  Tx,
  types,
} from './includes.ts';

Clarinet.test({
  name: 'Core: can hash orders',
  fn(chain: Chain, accounts: Map<string, Account>) {
    const sender = accounts.get('wallet_1')!;

    const order = orderToTupleCV({
      sender: 1,
      'sender-fee': 1e8,
      maker: 2,
      'maker-asset': 1,
      'taker-asset': 2,
      'maker-asset-data': 14e8,
      'taker-asset-data': 1e8,
      'maximum-fill': 1000,
      'expiration-height': 100,
      salt: 1,
      risk: false,
      stop: 0,
      timestamp: 1,
      type: 0,
    });
    const response = chain.callReadOnlyFn(
      contractNames.exchange,
      'hash-order',
      [order],
      sender.address,
    );

    // yarn run generate-order-hash "{ \"sender\": 1, \"sender-fee\": 1e8, \"maker\": 2, \"maker-asset\": 1, \"taker-asset\": 2, \"maker-asset-data\": 14e8, \"taker-asset-data\": 1e8, \"maximum-fill\": 1000, \"expiration-height\": 100, \"salt\": 1, \"risk\": false, \"stop\": 0, \"timestamp\": 1, \"type\": 0 }"
    assertEquals(
      response.result,
      '0x4502a389f870dab8b80a00522540a3d4bf9b9cb1a09246caf70d93a1c1d5c9ac',
    );
  },
});

Clarinet.test({
  name: 'Core: can validate matching orders (signatures)',
  fn(chain: Chain, accounts: Map<string, Account>) {
    const sender = accounts.get('wallet_1')!;

    const results = prepareChainBasicTest(chain, accounts);
    results.receipts.forEach((e: any) => {
      e.result.expectOk();
    });

    const left_order = orderToTupleCV({
      sender: 1,
      'sender-fee': 1e8,
      maker: 2,
      'maker-asset': 1,
      'taker-asset': 2,
      'maker-asset-data': 14e8,
      'taker-asset-data': 1e8,
      'maximum-fill': 100,
      'expiration-height': 100,
      salt: 1,
      risk: false,
      stop: 0,
      timestamp: 1,
      type: 0,
    });

    const right_order = orderToTupleCV({
      sender: 1,
      'sender-fee': 1e8,
      maker: 3,
      'maker-asset': 2,
      'taker-asset': 1,
      'maker-asset-data': 1e8,
      'taker-asset-data': 14e8,
      'maximum-fill': 50,
      'expiration-height': 100,
      salt: 2,
      risk: false,
      stop: 0,
      timestamp: 2,
      type: 0,
    });
    // console.log(left_order, right_order);

    // yarn generate-order-hash "{ \"sender\": 1, \"sender-fee\": 1e8, \"maker\": 2, \"maker-asset\": 1, \"taker-asset\": 2, \"maker-asset-data\": 14e8, \"taker-asset-data\": 1e8, \"maximum-fill\": 100, \"expiration-height\": 100, \"salt\": 1, \"risk\": false, \"stop\": 0, \"timestamp\": 1, \"type\": 0 }"
    const left_order_hash =
      '0xa891215d95196515149eb214c5812b5b9b0f102edc7a8dae3f30940dbed1bd70';
    // yarn generate-order-hash "{ \"sender\": 1, \"sender-fee\": 1e8, \"maker\": 3, \"maker-asset\": 2, \"taker-asset\": 1, \"maker-asset-data\": 1e8, \"taker-asset-data\": 14e8, \"maximum-fill\": 50, \"expiration-height\": 100, \"salt\": 2, \"risk\": false, \"stop\": 0, \"timestamp\": 2, \"type\": 0 }"
    const right_order_hash =
      '0xad5faa9b4b22cd3a55e59b763e052674fb29c9334734f38146250239e25e15c6';

    // yarn sign-order-hash 530d9f61984c888536871c6573073bdfc0058896dc1adfe9a6a10dfacadc209101 0xa891215d95196515149eb214c5812b5b9b0f102edc7a8dae3f30940dbed1bd70
    const left_signature =
      '0x51b195c240eae83f7c42438a673c2338105851ab11d0ac6ded878d14981e9b7479b1a62a18af10b34a21acd0392cec7cfbb3b8ea19b355a7268e2526bddd66f401';
    // yarn sign-order-hash d655b2523bcd65e34889725c73064feb17ceb796831c0e111ba1a552b0f31b3901 0xad5faa9b4b22cd3a55e59b763e052674fb29c9334734f38146250239e25e15c6
    const right_signature =
      '0x5e3c2e1f8d414b3abef2891a9198fe278534a648e2e01d92af4c52b381cfe4b5756fd6a7e6111110bf6995463a73ab055863d9e131de34cb9a467c73918bb49600';

    const response = chain.callReadOnlyFn(
      contractNames.exchange,
      'validate-match',
      [
        left_order,
        right_order,
        left_signature,
        right_signature,
        types.none(),
        types.none(),
        types.none(),
      ],
      sender.address,
    );
    const response_tuple = response.result.expectOk().expectTuple();
    assertEquals(response_tuple, {
      fillable: types.uint(50),
      'left-order-fill': types.uint(0),
      'left-order-hash': left_order_hash,
      'right-order-fill': types.uint(0),
      'right-order-hash': right_order_hash,
      'left-order-make': types.uint(14e8),
      'right-order-make': types.uint(1e8),
    });
  },
});

Clarinet.test({
  name: 'Core: oracle can recover signer',
  fn(chain: Chain, accounts: Map<string, Account>) {
    const sender = accounts.get('wallet_1')!;

    //Buffer.from(liteSignatureToStacksSignature('0x71b534851bcd7584e7743043917606968cfc571c45e765d088aa07c2347b2c7918506ee6002b4014514523494367232c334d22a25167fcf8682a1f79ada700db1c')).toString('hex')
    const signature =
      '0x71b534851bcd7584e7743043917606968cfc571c45e765d088aa07c2347b2c7918506ee6002b4014514523494367232c334d22a25167fcf8682a1f79ada700db01';

    const pricePackage: PricePackage = {
      timestamp: 1662540506183,
      prices: [
        {
          symbol: 'BTC',
          value: 18805.300000000003,
        },
      ],
    };
    const packageCV = pricePackageToCV(pricePackage);

    const response = chain.callReadOnlyFn(
      contractNames.oracle,
      'recover-signer',
      [packageCV.timestamp, packageCV.prices, signature],
      sender.address,
    );

    assertEquals(
      response.result.expectOk(),
      '0x03009dd87eb41d96ce8ad94aa22ea8b0ba4ac20c45e42f71726d6b180f93c3f298',
    );
  },
});

Clarinet.test({
  name: 'Core: can cancel orders',
  fn(chain: Chain, accounts: Map<string, Account>) {
    const sender = accounts.get('wallet_1')!;

    const results = prepareChainBasicTest(chain, accounts);
    results.receipts.forEach((e: any) => {
      e.result.expectOk();
    });

    const order = orderToTupleCV({
      sender: 1,
      'sender-fee': 1e8,
      maker: 2,
      'maker-asset': 1,
      'taker-asset': 2,
      'maker-asset-data': 14e8,
      'taker-asset-data': 1e8,
      'maximum-fill': 1000,
      'expiration-height': 100,
      salt: 1,
      risk: false,
      stop: 0,
      timestamp: 1,
      type: 0,
    });
    const response = chain.callReadOnlyFn(
      contractNames.exchange,
      'hash-order',
      [order],
      sender.address,
    );

    // yarn run generate-order-hash "{ \"sender\": 1, \"sender-fee\": 1e8, \"maker\": 2, \"maker-asset\": 1, \"taker-asset\": 2, \"maker-asset-data\": 14e8, \"taker-asset-data\": 1e8, \"maximum-fill\": 1000, \"expiration-height\": 100, \"salt\": 1, \"risk\": false, \"stop\": 0, \"timestamp\": 1, \"type\": 0 }"
    const order_hash =
      '0x4502a389f870dab8b80a00522540a3d4bf9b9cb1a09246caf70d93a1c1d5c9ac';
    assertEquals(response.result, order_hash);

    // const cancel_order = cancelToTupleCV({ hash: order_hash, cancel: true });
    const response_cancel = chain.callReadOnlyFn(
      contractNames.exchange,
      'hash-cancel-order',
      [order_hash],
      sender.address,
    );

    // yarn run generate-cancel-hash "{ \"hash\": \"0x4502a389f870dab8b80a00522540a3d4bf9b9cb1a09246caf70d93a1c1d5c9ac\", \"cancel\": true }"
    assertEquals(
      response_cancel.result,
      '0x7c6a9fb22d1c8b494d1dc7204e5ea2979de1a9eacda028d6f038a2a2ad7b4ff5',
    );

    // yarn sign-order-hash 530d9f61984c888536871c6573073bdfc0058896dc1adfe9a6a10dfacadc209101 0x7c6a9fb22d1c8b494d1dc7204e5ea2979de1a9eacda028d6f038a2a2ad7b4ff5
    const cancel_signature =
      '0x7a8e332581fd571ecc2495ca65d5b5620f0c5bff3692bee9e4e6940ef8be72233dd025d94596bf0b28358823a4e0183403c997db9851a07be81054fd53bfb9d101';

    const block = chain.mineBlock([
      Tx.contractCall(
        contractNames.exchange,
        'cancel-order',
        [order, cancel_signature],
        sender.address,
      ),
    ]);
    block.receipts[0].result.expectOk();
    const response_fill = chain.callReadOnlyFn(
      contractNames.registry,
      'get-order-fill',
      [order_hash],
      sender.address,
    );
    response_fill.result.expectUint(1000);
  },
});

Clarinet.test({
  name: 'Core: sender can cancel FOK/IOC orders without signature',
  fn(chain: Chain, accounts: Map<string, Account>) {
    const sender = accounts.get('wallet_1')!;

    const results = prepareChainBasicTest(chain, accounts);
    results.receipts.forEach((e: any) => {
      e.result.expectOk();
    });

    const order = orderToTupleCV({
      sender: 1,
      'sender-fee': 1e8,
      maker: 2,
      'maker-asset': 1,
      'taker-asset': 2,
      'maker-asset-data': 14e8,
      'taker-asset-data': 1e8,
      'maximum-fill': 1000,
      'expiration-height': 100,
      salt: 1,
      risk: false,
      stop: 0,
      timestamp: 1,
      type: 2,
    });
    const response = chain.callReadOnlyFn(
      contractNames.exchange,
      'hash-order',
      [order],
      sender.address,
    );

    // yarn run generate-order-hash "{ \"sender\": 1, \"sender-fee\": 1e8, \"maker\": 2, \"maker-asset\": 1, \"taker-asset\": 2, \"maker-asset-data\": 14e8, \"taker-asset-data\": 1e8, \"maximum-fill\": 1000, \"expiration-height\": 100, \"salt\": 1, \"risk\": false, \"stop\": 0, \"timestamp\": 1, \"type\": 2 }"
    const order_hash =
      '0x26f51026214cfae79589cf3eed9aab3c9fff9065b910a6e9f8856f75594a6002';
    assertEquals(response.result, order_hash);

    const block = chain.mineBlock([
      Tx.contractCall(
        contractNames.exchange,
        'cancel-order',
        [order, '0x'],
        sender.address,
      ),
    ]);
    block.receipts[0].result.expectOk();
    const response_fill = chain.callReadOnlyFn(
      contractNames.registry,
      'get-order-fill',
      [order_hash],
      sender.address,
    );
    response_fill.result.expectUint(1000);
  },
});

Clarinet.test({
  name: 'Core - Perp: can hash orders',
  fn(chain: Chain, accounts: Map<string, Account>) {
    const sender = accounts.get('wallet_1')!;

    const order = perpOrderToTupleCV({
      sender: 1,
      'sender-fee': 0.001e8,
      maker: 2,
      'maker-asset': 1,
      'taker-asset': 2,
      'maker-asset-data': 14000,
      'taker-asset-data': 1,
      'maximum-fill': 100e8,
      'expiration-height': 100,
      salt: 1,
      risk: false,
      stop: 0,
      timestamp: 1,
      type: 0,
      'linked-hash': '0x',
      'linked-maker-data': 1,
      'linked-taker-data': 13300, // 5% down
      'linked-stop': 13650e8, // 2.5% down
    });
    const response = chain.callReadOnlyFn(
      contractNames.perpetual,
      'hash-order',
      [order],
      sender.address,
    );

    // yarn generate-perpetual-hash "{ \"sender\": 1, \"sender-fee\": 0.001e8, \"maker\": 2, \"maker-asset\": 1, \"taker-asset\": 2, \"maker-asset-data\": 14000, \"taker-asset-data\": 1, \"maximum-fill\": 100e8, \"expiration-height\": 100, \"salt\": 1, \"risk\": false, \"stop\": 0, \"timestamp\": 1, \"type\": 0, \"linked-hash\": \"0x\", \"linked-maker-data\": 1,\"linked-taker-data\": 13300, \"linked-stop\": 13650e8 }"
    assertEquals(
      response.result,
      '0x06f59c338a001e4a5cf46456e2f0bc9aeb957030c52899c44bc51535112e0fec',
    );
  },
});

Clarinet.test({
  name: 'Core - Perp: can validate matching orders (signatures)',
  fn(chain: Chain, accounts: Map<string, Account>) {
    const sender = accounts.get('wallet_1')!;

    const results = prepareChainBasicTest(chain, accounts);
    results.receipts.forEach((e: any) => {
      e.result.expectOk();
    });

    const left_order = perpOrderToTupleCV({
      sender: 1,
      'sender-fee': 0.001e8,
      maker: 2,
      'maker-asset': 1,
      'taker-asset': 2,
      'maker-asset-data': 14000,
      'taker-asset-data': 1,
      'maximum-fill': 100e8,
      'expiration-height': 100,
      salt: 1,
      risk: false,
      stop: 0,
      timestamp: 1,
      type: 0,
      'linked-hash': '0x',
      'linked-maker-data': 1,
      'linked-taker-data': 13300, // 5% down
      'linked-stop': 13650e8, // 2.5% down
    });

    const right_order = perpOrderToTupleCV({
      sender: 1,
      'sender-fee': 0.001e8,
      maker: 3,
      'maker-asset': 2,
      'taker-asset': 1,
      'maker-asset-data': 1,
      'taker-asset-data': 14000,
      'maximum-fill': 50e8,
      'expiration-height': 100,
      salt: 2,
      risk: false,
      stop: 0,
      timestamp: 2,
      type: 0,
      'linked-hash': '0x',
      'linked-maker-data': 14700,
      'linked-taker-data': 1,
      'linked-stop': 14350e8,
    });

    // yarn generate-perpetual-hash "{ \"sender\": 1, \"sender-fee\": 0.001e8, \"maker\": 2, \"maker-asset\": 1, \"taker-asset\": 2, \"maker-asset-data\": 14000, \"taker-asset-data\": 1, \"maximum-fill\": 100e8, \"expiration-height\": 100, \"salt\": 1, \"risk\": false, \"stop\": 0, \"timestamp\": 1, \"type\": 0, \"linked-hash\": \"0x\", \"linked-maker-data\": 1,\"linked-taker-data\": 13300, \"linked-stop\": 13650e8 }"
    const left_order_hash =
      '0x06f59c338a001e4a5cf46456e2f0bc9aeb957030c52899c44bc51535112e0fec';
    // yarn generate-perpetual-hash "{ \"sender\": 1, \"sender-fee\": 0.001e8, \"maker\": 3, \"maker-asset\": 2, \"taker-asset\": 1, \"maker-asset-data\": 1, \"taker-asset-data\": 14000, \"maximum-fill\": 50e8, \"expiration-height\": 100, \"salt\": 2, \"risk\": false, \"stop\": 0, \"timestamp\": 2, \"type\": 0, \"linked-hash\": \"0x\", \"linked-maker-data\": 14700,\"linked-taker-data\": 1, \"linked-stop\": 14350e8 }"
    const right_order_hash =
      '0xa20b772c3337141e4a9808709e5a16a91647c3a00151c04b8773f2d3143acb24';

    // yarn sign-order-hash 530d9f61984c888536871c6573073bdfc0058896dc1adfe9a6a10dfacadc209101 0x06f59c338a001e4a5cf46456e2f0bc9aeb957030c52899c44bc51535112e0fec
    const left_signature =
      '0xfa4d6088c45e08b69f7423fadc1dcdc512d9fb807da26c4d7b46c53d0bd078d1217e0318eba3a16d75ff932048733f130067e9ae68dc2d0d0d3b0b1dc1e2a8d200';
    // yarn sign-order-hash d655b2523bcd65e34889725c73064feb17ceb796831c0e111ba1a552b0f31b3901 0xa20b772c3337141e4a9808709e5a16a91647c3a00151c04b8773f2d3143acb24
    const right_signature =
      '0x56664d2146c2ad1819acfcf241e5950a92bd44c5b37b8d2596800f000f3cc99129f3b06eab5ab5e4b97ca1a362d27e1a8fbb519ef889ae0f95f4206f516dfbb901';

    const response = chain.callReadOnlyFn(
      contractNames.perpetual,
      'validate-match',
      [
        left_order,
        right_order,
        left_signature,
        right_signature,
        types.none(),
        types.none(),
        types.none(),
      ],
      sender.address,
    );
    // console.log(response.result);
    const response_tuple = response.result.expectOk().expectTuple();
    assertEquals(response_tuple, {
      'left-buy': types.bool(true),
      fillable: types.uint(50e8),
      'left-order-fill': types.uint(0),
      'left-order-hash': left_order_hash,
      'right-order-fill': types.uint(0),
      'right-order-hash': right_order_hash,
      'left-order-make': types.uint(14000),
      'right-order-make': types.uint(1),
    });
  },
});
