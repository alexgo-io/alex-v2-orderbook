// deno-lint-ignore-file no-explicit-any
import {
  Account,
  assertEquals,
  Chain,
  Clarinet,
  contractNames,
  orderToTuple,
  orderToTupleCV,
  perpOrderToTupleCV,
  prepareChainBasicTest,
  PricePackage,
  shiftPriceValue,
  Tx,
  types,
} from './includes.ts';

Clarinet.test({
  name: 'Exchange: can match two vanilla limit order',
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

    const left_signature =
      '0x51b195c240eae83f7c42438a673c2338105851ab11d0ac6ded878d14981e9b7479b1a62a18af10b34a21acd0392cec7cfbb3b8ea19b355a7268e2526bddd66f401';
    const right_signature =
      '0x5e3c2e1f8d414b3abef2891a9198fe278534a648e2e01d92af4c52b381cfe4b5756fd6a7e6111110bf6995463a73ab055863d9e131de34cb9a467c73918bb49600';

    const block = chain.mineBlock([
      Tx.contractCall(
        contractNames.sender_proxy,
        'match-orders',
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
      ),
    ]);
    block.receipts[0].result
      .expectOk()
      .expectTuple()
      ['fillable'].expectUint(50);
    // console.log(block.receipts[0].events);
  },
});

Clarinet.test({
  name: 'Exchange: can match two vanilla limit order through sender proxy',
  fn(chain: Chain, accounts: Map<string, Account>) {
    const sender = accounts.get('wallet_1')!;

    const results = prepareChainBasicTest(chain, accounts);
    results.receipts.forEach((e: any) => {
      e.result.expectOk();
    });

    const left_order = orderToTuple({
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

    const right_order = orderToTuple({
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

    const left_signature =
      '0x51b195c240eae83f7c42438a673c2338105851ab11d0ac6ded878d14981e9b7479b1a62a18af10b34a21acd0392cec7cfbb3b8ea19b355a7268e2526bddd66f401';
    const right_signature =
      '0x5e3c2e1f8d414b3abef2891a9198fe278534a648e2e01d92af4c52b381cfe4b5756fd6a7e6111110bf6995463a73ab055863d9e131de34cb9a467c73918bb49600';

    const block = chain.mineBlock([
      Tx.contractCall(
        contractNames.sender_proxy,
        'match-orders-many',
        [
          types.list([
            types.tuple({
              'left-order': left_order,
              'right-order': right_order,
              'left-signature': left_signature,
              'right-signature': right_signature,
              'left-oracle-data': types.none(),
              'right-oracle-data': types.none(),
              fill: types.none(),
            }),
          ]),
        ],
        sender.address,
      ),
    ]);
    block.receipts[0].result
      .expectOk()
      .expectList()[0]
      .expectOk()
      .expectTuple()
      .fillable.expectUint(50);
    // console.log(block.receipts[0].events);
  },
});

Clarinet.test({
  name: 'Exchange: can match sell market limit order',
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
      'maker-asset-data': 22855,
      'taker-asset-data': 1,
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
      'maker-asset-data': 1,
      'taker-asset-data': 1,
      'maximum-fill': 50,
      'expiration-height': 100,
      salt: 2,
      risk: false,
      stop: 0,
      timestamp: 2,
      type: 1,
    });

    // yarn generate-order-hash "{ \"sender\": 1, \"sender-fee\": 1e8, \"maker\": 2, \"maker-asset\": 1, \"taker-asset\": 2, \"maker-asset-data\": 22855, \"taker-asset-data\": 1, \"maximum-fill\": 100, \"expiration-height\": 100, \"salt\": 1, \"risk\": false, \"stop\": 0, \"timestamp\": 1, \"type\": 0 }"
    // yarn sign-order-hash 530d9f61984c888536871c6573073bdfc0058896dc1adfe9a6a10dfacadc209101 0x94dc395eab0640041348df411995f35527c70246ea4facc98b061c1613b5f8fb
    const left_signature =
      '0x727cab7e6c3695222ae18492ed8a47fe14ee180acf5f20c80cf59f1407e50ac21ba754fb31710a2d2be048812fb42b8c012780eb9df0a1cb0573ce8df54bdba601';
    // yarn generate-order-hash "{ \"sender\": 1, \"sender-fee\": 1e8, \"maker\": 3, \"maker-asset\": 2, \"taker-asset\": 1, \"maker-asset-data\": 1, \"taker-asset-data\": 1, \"maximum-fill\": 50, \"expiration-height\": 100, \"salt\": 2, \"risk\": false, \"stop\": 0, \"timestamp\": 2, \"type\": 1 }"
    // yarn sign-order-hash d655b2523bcd65e34889725c73064feb17ceb796831c0e111ba1a552b0f31b3901 0x49005ef87a3cd9ec603d717585dae4f026a7a3d0f54052aa312ea1c4c22820bc
    const right_signature =
      '0xd4e9bdcab5c652f3f27674c1426ee7a0691edebfd8f9b30ef19e6980113aeb022e94973d61bdea3e6055b31d5ee18c400e199a3c7f8f12a95fe1a149f532eb0300';

    const block = chain.mineBlock([
      Tx.contractCall(
        contractNames.sender_proxy,
        'match-orders',
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
      ),
    ]);
    block.receipts[0].result
      .expectOk()
      .expectTuple()
      ['left-order-make'].expectUint(22855);
  },
});

Clarinet.test({
  name: 'Exchange: can match buy market limit order',
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
      'maker-asset': 2,
      'taker-asset': 1,
      'maker-asset-data': 1,
      'taker-asset-data': 22808,
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
      'maker-asset': 1,
      'taker-asset': 2,
      'maker-asset-data': 22855,
      'taker-asset-data': 1,
      'maximum-fill': 50,
      'expiration-height': 100,
      salt: 2,
      risk: false,
      stop: 0,
      timestamp: 2,
      type: 2,
    });

    // yarn generate-order-hash "{ \"sender\": 1, \"sender-fee\": 1e8, \"maker\": 2, \"maker-asset\": 2, \"taker-asset\": 1, \"maker-asset-data\": 1, \"taker-asset-data\": 22808, \"maximum-fill\": 100, \"expiration-height\": 100, \"salt\": 1, \"risk\": false, \"stop\": 0, \"timestamp\": 1, \"type\": 0 }"
    // yarn sign-order-hash 530d9f61984c888536871c6573073bdfc0058896dc1adfe9a6a10dfacadc209101 0xb26072bb08ec119ac18aadc930c50bb1bc71161012674ff0c9c7e4b5dfe154d0
    const left_signature =
      '0xc09731b7f3a7a2bc4cdf9eabe79e8dd9494f561d65bd8fa176fa3742f54718584eb6d6bd2afd7ef5ec08741339d5943e48d4eb48bea924da0db0727b56c4b6fd00';
    // yarn generate-order-hash "{ \"sender\": 1, \"sender-fee\": 1e8, \"maker\": 3, \"maker-asset\": 1, \"taker-asset\": 2, \"maker-asset-data\": 22855, \"taker-asset-data\": 1, \"maximum-fill\": 50, \"expiration-height\": 100, \"salt\": 2, \"risk\": false, \"stop\": 0, \"timestamp\": 2, \"type\": 2 }"
    // yarn sign-order-hash d655b2523bcd65e34889725c73064feb17ceb796831c0e111ba1a552b0f31b3901 0x82a6ee06d550045eb2dc401a04c32bd99fef8cc16636a885984b0430b2352a57
    const right_signature =
      '0x7defeb8cfbf56eddbe428a424cb86c93d7ead145a6149546bedf11dd5563e3012e48895772a41e01ed6c1ac9b34d3f717293a3b39a04613044baf07d6317670901';

    const block = chain.mineBlock([
      Tx.contractCall(
        contractNames.sender_proxy,
        'match-orders',
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
      ),
    ]);
    block.receipts[0].result
      .expectOk()
      .expectTuple()
      ['right-order-make'].expectUint(22808);
  },
});

Clarinet.test({
  name: 'Exchange: can match stop-market order (risk mgmt)',
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
      'maker-asset-data': 18800,
      'taker-asset-data': 1,
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
      'maker-asset-data': 1,
      'taker-asset-data': 0,
      'maximum-fill': 50,
      'expiration-height': 100,
      salt: 2,
      risk: true,
      stop: 1900000000000,
      timestamp: 2,
      type: 2,
    });

    // there are multiple ways to fetch redstone price packages, one of which is to use their HTTP API: https://api.docs.redstone.finance/http-api/prices
    // for example, calling 'http GET https://api.redstone.finance/prices symbol==BTC provider==redstone' will return the latest oracle price of BTCUSD.
    // we need four data from the output, timestamp, symbol, value and signature.

    // start with liteEvmSignature.
    // the signature = Buffer.from(liteSignatureToStacksSignature(`${liteEvmSignature}`)).toString('hex')
    const oracle_signature =
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

    // yarn generate-order-hash "{ \"sender\": 1, \"sender-fee\": 1e8, \"maker\": 2, \"maker-asset\": 1, \"taker-asset\": 2, \"maker-asset-data\": 18800, \"taker-asset-data\": 1, \"maximum-fill\": 100, \"expiration-height\": 100, \"salt\": 1, \"risk\": false, \"stop\": 0, \"timestamp\": 1, \"type\": 0 }"
    // yarn sign-order-hash 530d9f61984c888536871c6573073bdfc0058896dc1adfe9a6a10dfacadc209101 0x940cf3994d264f0b02ececdc7411777de9f5085b1a1aaf9e80b252a763e5b1a9
    const left_signature =
      '0xb159661220043ddc527b4292e11eae39f1977d0b884ef583bd937050881e24ba7e8fc64c4588345f97bb74422ea3a0fb83ad56a34afe1b5afb9db86e51a7efa900';
    // yarn generate-order-hash "{ \"sender\": 1, \"sender-fee\": 1e8, \"maker\": 3, \"maker-asset\": 2, \"taker-asset\": 1, \"maker-asset-data\": 1, \"taker-asset-data\": 0, \"maximum-fill\": 50, \"expiration-height\": 100, \"salt\": 2, \"risk\": true, \"stop\": 1900000000000, \"timestamp\": 2, \"type\": 2 }"
    // yarn sign-order-hash d655b2523bcd65e34889725c73064feb17ceb796831c0e111ba1a552b0f31b3901 0x7bca76bc4c5afbb917131a1937ad2f2e992f8208c31f81052685b9ac60dcf1fa
    const right_signature =
      '0x8af0cdaffaf54c7cdf5fcaa9399719b4c6c7e16715e8a694c124fc9d0fe8c70615fca4cde6f577ba69d09b5244a11b10aaa385679502bfbbeaf9120a8426a57001';

    const block = chain.mineBlock([
      Tx.contractCall(
        contractNames.sender_proxy,
        'match-orders',
        [
          left_order,
          right_order,
          left_signature,
          right_signature,
          types.none(),
          types.some(
            types.tuple({
              timestamp: types.uint(pricePackage.timestamp),
              value: types.uint(shiftPriceValue(pricePackage.prices[0].value)),
              signature: oracle_signature,
            }),
          ),
          types.none(),
        ],
        sender.address,
      ),
    ]);
    block.receipts[0].result
      .expectOk()
      .expectTuple()
      ['left-order-make'].expectUint(18800);
  },
});

Clarinet.test({
  name: 'Exchange: can match stop-market order (non risk mgmt)',
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
      'maker-asset-data': 18800,
      'taker-asset-data': 1,
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
      'maker-asset-data': 1,
      'taker-asset-data': 0,
      'maximum-fill': 50,
      'expiration-height': 100,
      salt: 2,
      risk: false,
      stop: 1880000000000,
      timestamp: 2,
      type: 2,
    });

    const oracle_signature =
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

    // yarn generate-order-hash "{ \"sender\": 1, \"sender-fee\": 1e8, \"maker\": 2, \"maker-asset\": 1, \"taker-asset\": 2, \"maker-asset-data\": 18800, \"taker-asset-data\": 1, \"maximum-fill\": 100, \"expiration-height\": 100, \"salt\": 1, \"risk\": false, \"stop\": 0, \"timestamp\": 1, \"type\": 0 }"
    // yarn sign-order-hash 530d9f61984c888536871c6573073bdfc0058896dc1adfe9a6a10dfacadc209101 0x940cf3994d264f0b02ececdc7411777de9f5085b1a1aaf9e80b252a763e5b1a9
    const left_signature =
      '0xb159661220043ddc527b4292e11eae39f1977d0b884ef583bd937050881e24ba7e8fc64c4588345f97bb74422ea3a0fb83ad56a34afe1b5afb9db86e51a7efa900';
    // yarn generate-order-hash "{ \"sender\": 1, \"sender-fee\": 1e8, \"maker\": 3, \"maker-asset\": 2, \"taker-asset\": 1, \"maker-asset-data\": 1, \"taker-asset-data\": 0, \"maximum-fill\": 50, \"expiration-height\": 100, \"salt\": 2, \"risk\": false, \"stop\": 1880000000000, \"timestamp\": 2, \"type\": 2 }"
    // yarn sign-order-hash d655b2523bcd65e34889725c73064feb17ceb796831c0e111ba1a552b0f31b3901 0xbf6d165f3ec6acdb11649050f2524fa4e429ba25bf4f7e784b5eddf8397ebf7f
    const right_signature =
      '0x9527b8dee469ac6bb4f93fbadc1232c251348f7f9c7f8fb448bda4248d18b87e3d63362e9655de40f5d33b029bcbcd9c38b813093a8db8074f310cb37020801501';

    const block = chain.mineBlock([
      Tx.contractCall(
        contractNames.sender_proxy,
        'match-orders',
        [
          left_order,
          right_order,
          left_signature,
          right_signature,
          types.none(),
          types.some(
            types.tuple({
              timestamp: types.uint(pricePackage.timestamp),
              value: types.uint(shiftPriceValue(pricePackage.prices[0].value)),
              signature: oracle_signature,
            }),
          ),
          types.none(),
        ],
        sender.address,
      ),
    ]);
    block.receipts[0].result
      .expectOk()
      .expectTuple()
      ['left-order-make'].expectUint(18800);
  },
});

Clarinet.test({
  name: 'Exchange: throws stop not triggered if oracle price >= stop price for a stop-market sell order (risk mgmt)',
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
      'maker-asset-data': 18800,
      'taker-asset-data': 1,
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
      'maker-asset-data': 1,
      'taker-asset-data': 0,
      'maximum-fill': 50,
      'expiration-height': 100,
      salt: 2,
      risk: true,
      stop: 1880000000000,
      timestamp: 2,
      type: 2,
    });

    // there are multiple ways to fetch redstone price packages, one of which is to use their HTTP API: https://api.docs.redstone.finance/http-api/prices
    // for example, calling 'http GET https://api.redstone.finance/prices symbol==BTC provider==redstone' will return the latest oracle price of BTCUSD.
    // we need four data from the output, timestamp, symbol, value and signature.

    // start with liteEvmSignature.
    // the signature = Buffer.from(liteSignatureToStacksSignature(`${liteEvmSignature}`)).toString('hex')
    const oracle_signature =
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

    // yarn generate-order-hash "{ \"sender\": 1, \"sender-fee\": 1e8, \"maker\": 2, \"maker-asset\": 1, \"taker-asset\": 2, \"maker-asset-data\": 18800, \"taker-asset-data\": 1, \"maximum-fill\": 100, \"expiration-height\": 100, \"salt\": 1, \"risk\": false, \"stop\": 0, \"timestamp\": 1, \"type\": 0 }"
    // yarn sign-order-hash 530d9f61984c888536871c6573073bdfc0058896dc1adfe9a6a10dfacadc209101 0x940cf3994d264f0b02ececdc7411777de9f5085b1a1aaf9e80b252a763e5b1a9
    const left_signature =
      '0xb159661220043ddc527b4292e11eae39f1977d0b884ef583bd937050881e24ba7e8fc64c4588345f97bb74422ea3a0fb83ad56a34afe1b5afb9db86e51a7efa900';
    // yarn generate-order-hash "{ \"sender\": 1, \"sender-fee\": 1e8, \"maker\": 3, \"maker-asset\": 2, \"taker-asset\": 1, \"maker-asset-data\": 1, \"taker-asset-data\": 0, \"maximum-fill\": 50, \"expiration-height\": 100, \"salt\": 2, \"risk\": true, \"stop\": 1880000000000, \"timestamp\": 2, \"type\": 2 }"
    // yarn sign-order-hash d655b2523bcd65e34889725c73064feb17ceb796831c0e111ba1a552b0f31b3901 0x0dfc99ee75c75fd846a6ce1d9ab01c98d59410bd8ddcfceb9fa371723b146060
    const right_signature =
      '0xd889b587a9afb737f7f3f1e7147b09f8bf7c7b74bc90e00deef90984acb2e9dc6907f8d26d41961105de57106ae466b57b0081bacd96acb185f1cbf9b73cc21c01';

    const block = chain.mineBlock([
      Tx.contractCall(
        contractNames.sender_proxy,
        'match-orders',
        [
          left_order,
          right_order,
          left_signature,
          right_signature,
          types.none(),
          types.some(
            types.tuple({
              timestamp: types.uint(pricePackage.timestamp),
              value: types.uint(shiftPriceValue(pricePackage.prices[0].value)),
              signature: oracle_signature,
            }),
          ),
          types.none(),
        ],
        sender.address,
      ),
    ]);
    block.receipts[0].result.expectErr().expectUint(5009);
  },
});

Clarinet.test({
  name: 'Exchange: throws stop not triggered if oracle price <= stop price for a stop-market sell order (non risk mgmt)',
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
      'maker-asset-data': 18800,
      'taker-asset-data': 1,
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
      'maker-asset-data': 1,
      'taker-asset-data': 0,
      'maximum-fill': 50,
      'expiration-height': 100,
      salt: 2,
      risk: false,
      stop: 1900000000000,
      timestamp: 2,
      type: 2,
    });

    // there are multiple ways to fetch redstone price packages, one of which is to use their HTTP API: https://api.docs.redstone.finance/http-api/prices
    // for example, calling 'http GET https://api.redstone.finance/prices symbol==BTC provider==redstone' will return the latest oracle price of BTCUSD.
    // we need four data from the output, timestamp, symbol, value and signature.

    // start with liteEvmSignature.
    // the signature = Buffer.from(liteSignatureToStacksSignature(`${liteEvmSignature}`)).toString('hex')
    const oracle_signature =
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

    // yarn generate-order-hash "{ \"sender\": 1, \"sender-fee\": 1e8, \"maker\": 2, \"maker-asset\": 1, \"taker-asset\": 2, \"maker-asset-data\": 18800, \"taker-asset-data\": 1, \"maximum-fill\": 100, \"expiration-height\": 100, \"salt\": 1, \"risk\": false, \"stop\": 0, \"timestamp\": 1, \"type\": 0 }"
    // yarn sign-order-hash 530d9f61984c888536871c6573073bdfc0058896dc1adfe9a6a10dfacadc209101 0x940cf3994d264f0b02ececdc7411777de9f5085b1a1aaf9e80b252a763e5b1a9
    const left_signature =
      '0xb159661220043ddc527b4292e11eae39f1977d0b884ef583bd937050881e24ba7e8fc64c4588345f97bb74422ea3a0fb83ad56a34afe1b5afb9db86e51a7efa900';
    // yarn generate-order-hash "{ \"sender\": 1, \"sender-fee\": 1e8, \"maker\": 3, \"maker-asset\": 2, \"taker-asset\": 1, \"maker-asset-data\": 1, \"taker-asset-data\": 0, \"maximum-fill\": 50, \"expiration-height\": 100, \"salt\": 2, \"risk\": false, \"stop\": 1900000000000, \"timestamp\": 2, \"type\": 2 }"
    // yarn sign-order-hash d655b2523bcd65e34889725c73064feb17ceb796831c0e111ba1a552b0f31b3901 0x1685f89eb6986952f644d5877e25956f77f9be798eaf140c3c0f428a889ec71e
    const right_signature =
      '0x2e234fc183ad019ed63dcab084ea843c46ac53e824fefd2f499ef755b3e2f5b1427db6ba963c6a2dddf9bebdf9d3fcf9a9cf4a9436dff86d68e27596aa19512500';

    const block = chain.mineBlock([
      Tx.contractCall(
        contractNames.sender_proxy,
        'match-orders',
        [
          left_order,
          right_order,
          left_signature,
          right_signature,
          types.none(),
          types.some(
            types.tuple({
              timestamp: types.uint(pricePackage.timestamp),
              value: types.uint(shiftPriceValue(pricePackage.prices[0].value)),
              signature: oracle_signature,
            }),
          ),
          types.none(),
        ],
        sender.address,
      ),
    ]);
    block.receipts[0].result.expectErr().expectUint(5009);
  },
});

Clarinet.test({
  name: 'Exchange - Perp: can match two orders',
  fn(chain: Chain, accounts: Map<string, Account>) {
    const sender = accounts.get('wallet_1')!;

    const results = prepareChainBasicTest(chain, accounts);
    results.receipts.forEach((e: any) => {
      e.result.expectOk();
    });

    const left_order_tuple = {
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
    };

    const right_order_tuple = {
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
    };

    const left_order = perpOrderToTupleCV(left_order_tuple);
    const right_order = perpOrderToTupleCV(right_order_tuple);

    const left_signature =
      '0xfa4d6088c45e08b69f7423fadc1dcdc512d9fb807da26c4d7b46c53d0bd078d1217e0318eba3a16d75ff932048733f130067e9ae68dc2d0d0d3b0b1dc1e2a8d200';
    const right_signature =
      '0x56664d2146c2ad1819acfcf241e5950a92bd44c5b37b8d2596800f000f3cc99129f3b06eab5ab5e4b97ca1a362d27e1a8fbb519ef889ae0f95f4206f516dfbb901';

    const order_fill = Math.min(
      left_order_tuple['maximum-fill'],
      right_order_tuple['maximum-fill'],
    );

    const block = chain.mineBlock([
      Tx.contractCall(
        contractNames.sender_proxy,
        'match-perp-orders',
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
      ),
    ]);
    block.receipts[0].result
      .expectOk()
      .expectTuple()
      ['fillable'].expectUint(order_fill);

    assertEquals(
      block.receipts[0].events[0].contract_event.value.expectTuple(),
      {
        amount: types.uint(
          (left_order_tuple['maker-asset-data'] -
            left_order_tuple['linked-taker-data']) *
            order_fill,
        ),
        'asset-id': types.uint(1),
        'recipient-id': types.uint(4),
        'sender-id': types.uint(left_order_tuple['maker']),
        type: types.ascii('internal_transfer'),
      },
    );
    assertEquals(
      block.receipts[0].events[1].contract_event.value.expectTuple(),
      {
        amount: types.uint(
          (left_order_tuple['maker-asset-data'] *
            order_fill *
            left_order_tuple['sender-fee']) /
            1e8,
        ),
        'asset-id': types.uint(1),
        'recipient-id': types.uint(left_order_tuple['sender']),
        'sender-id': types.uint(left_order_tuple['maker']),
        type: types.ascii('internal_transfer'),
      },
    );
    assertEquals(
      block.receipts[0].events[2].contract_event.value.expectTuple(),
      {
        amount: types.uint(
          (right_order_tuple['linked-maker-data'] -
            right_order_tuple['taker-asset-data']) *
            order_fill,
        ),
        'asset-id': types.uint(1),
        'recipient-id': types.uint(4),
        'sender-id': types.uint(right_order_tuple['maker']),
        type: types.ascii('internal_transfer'),
      },
    );
    assertEquals(
      block.receipts[0].events[3].contract_event.value.expectTuple(),
      {
        amount: types.uint(
          (right_order_tuple['taker-asset-data'] *
            order_fill *
            right_order_tuple['sender-fee']) /
            1e8,
        ),
        'asset-id': types.uint(1),
        'recipient-id': types.uint(right_order_tuple['sender']),
        'sender-id': types.uint(right_order_tuple['maker']),
        type: types.ascii('internal_transfer'),
      },
    );
  },
});

Clarinet.test({
  name: 'Exchange - Perp: can match a partial close-out order',
  fn(chain: Chain, accounts: Map<string, Account>) {
    const sender = accounts.get('wallet_1')!;

    const results = prepareChainBasicTest(chain, accounts);
    results.receipts.forEach((e: any) => {
      e.result.expectOk();
    });

    const left_order_tuple = {
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
    };

    const right_order_tuple = {
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
    };

    const left_order = perpOrderToTupleCV(left_order_tuple);
    const right_order = perpOrderToTupleCV(right_order_tuple);

    const left_order_hash =
      '0x06f59c338a001e4a5cf46456e2f0bc9aeb957030c52899c44bc51535112e0fec';
    // const right_order_hash =
    //   '0xa20b772c3337141e4a9808709e5a16a91647c3a00151c04b8773f2d3143acb24';

    const left_signature =
      '0xfa4d6088c45e08b69f7423fadc1dcdc512d9fb807da26c4d7b46c53d0bd078d1217e0318eba3a16d75ff932048733f130067e9ae68dc2d0d0d3b0b1dc1e2a8d200';
    const right_signature =
      '0x56664d2146c2ad1819acfcf241e5950a92bd44c5b37b8d2596800f000f3cc99129f3b06eab5ab5e4b97ca1a362d27e1a8fbb519ef889ae0f95f4206f516dfbb901';

    const order_fill = Math.min(
      left_order_tuple['maximum-fill'],
      right_order_tuple['maximum-fill'],
    );

    const block = chain.mineBlock([
      Tx.contractCall(
        contractNames.sender_proxy,
        'match-perp-orders',
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
      ),
    ]);
    block.receipts[0].result
      .expectOk()
      .expectTuple()
      ['fillable'].expectUint(order_fill);

    const left_order_2_tuple = {
      sender: 1,
      'sender-fee': 0.001e8,
      maker: 2,
      'maker-asset': 2,
      'taker-asset': 1,
      'maker-asset-data': 1,
      'taker-asset-data': 13650,
      'maximum-fill': 20e8,
      'expiration-height': 100,
      salt: 3,
      risk: false,
      stop: 0,
      timestamp: 2,
      type: 0,
      'linked-hash': left_order_hash,
      'linked-maker-data': 0,
      'linked-taker-data': 0,
      'linked-stop': 0,
    };

    const right_order_2_tuple = {
      sender: 1,
      'sender-fee': 0.001e8,
      maker: 3,
      'maker-asset': 1,
      'taker-asset': 2,
      'maker-asset-data': 13650,
      'taker-asset-data': 1,
      'maximum-fill': 100e8,
      'expiration-height': 100,
      salt: 3,
      risk: false,
      stop: 0,
      timestamp: 3,
      type: 0,
      'linked-hash': '0x',
      'linked-maker-data': 1,
      'linked-taker-data': 12967,
      'linked-stop': 13300e8,
    };

    const left_order_2 = perpOrderToTupleCV(left_order_2_tuple);
    const right_order_2 = perpOrderToTupleCV(right_order_2_tuple);

    // yarn generate-perpetual-hash "{ \"sender\": 1, \"sender-fee\": 0.001e8, \"maker\": 2, \"maker-asset\": 2, \"taker-asset\": 1, \"maker-asset-data\": 1, \"taker-asset-data\": 13650, \"maximum-fill\": 20e8, \"expiration-height\": 100, \"salt\": 3, \"risk\": false, \"stop\": 0, \"timestamp\": 2, \"type\": 0, \"linked-hash\": \"0x06f59c338a001e4a5cf46456e2f0bc9aeb957030c52899c44bc51535112e0fec\", \"linked-maker-data\": 0,\"linked-taker-data\": 0, \"linked-stop\": 0 }"
    // const left_order_hash_2 =
    //   '0xb33ad49a5c65ee0ccc5bdbb203e67266a66be3f8b915860f0656b3f64b59537e';

    // yarn generate-perpetual-hash "{ \"sender\": 1, \"sender-fee\": 0.001e8, \"maker\": 3, \"maker-asset\": 1, \"taker-asset\": 2, \"maker-asset-data\": 13650, \"taker-asset-data\": 1, \"maximum-fill\": 100e8, \"expiration-height\": 100, \"salt\": 3, \"risk\": false, \"stop\": 0, \"timestamp\": 3, \"type\": 0, \"linked-hash\": \"0x\", \"linked-maker-data\": 1,\"linked-taker-data\": 12967, \"linked-stop\": 13300e8 }"
    // const right_order_hash_2 =
    //   '0x8fb0e0600d591372bc99373e20eb390264818000a059b0df4f94081cd1842956';

    // yarn sign-order-hash 530d9f61984c888536871c6573073bdfc0058896dc1adfe9a6a10dfacadc209101 0xb33ad49a5c65ee0ccc5bdbb203e67266a66be3f8b915860f0656b3f64b59537e
    const left_signature_2 =
      '0x78388323bfe8ff72580b468a7b9fcc747777886a103477d1852f039f22cb0cd65d8d5da29677df47044e4f3aaa2682d8498e3de097b11812363b0b2d5b547f3601';

    // yarn sign-order-hash d655b2523bcd65e34889725c73064feb17ceb796831c0e111ba1a552b0f31b3901 0x8fb0e0600d591372bc99373e20eb390264818000a059b0df4f94081cd1842956
    const right_signature_2 =
      '0x7e88ca05e1e2c16a6b89edd80b1a91e01df341c29165ab4ccc221043714598fc44949786dd28e7cdd926a70d5b82cafbdb0762f9c89acdb6a104ed697f43483200';

    const closed_fill = Math.min(
      order_fill,
      left_order_2_tuple['maximum-fill'],
      right_order_2_tuple['maximum-fill'],
    );

    const block_2 = chain.mineBlock([
      Tx.contractCall(
        contractNames.sender_proxy,
        'match-perp-orders',
        [
          left_order_2,
          right_order_2,
          left_signature_2,
          right_signature_2,
          types.none(),
          types.none(),
          types.none(),
        ],
        sender.address,
      ),
    ]);
    block_2.receipts[0].result
      .expectOk()
      .expectTuple()
      ['fillable'].expectUint(closed_fill);

    const margin =
      (left_order_tuple['maker-asset-data'] -
        left_order_tuple['linked-taker-data']) *
      closed_fill;
    const positionPnL =
      (left_order_2_tuple['taker-asset-data'] -
        left_order_tuple['maker-asset-data']) *
      closed_fill;
    const fee =
      (left_order_2_tuple['taker-asset-data'] *
        closed_fill *
        left_order_2_tuple['sender-fee']) /
      1e8;
    assertEquals(
      block_2.receipts[0].events[0].contract_event.value.expectTuple(),
      {
        amount: types.uint(margin + positionPnL - fee),
        'asset-id': types.uint(1),
        'recipient-id': types.uint(left_order_2_tuple['maker']),
        'sender-id': types.uint(4),
        type: types.ascii('internal_transfer'),
      },
    );
    assertEquals(
      block_2.receipts[0].events[1].contract_event.value.expectTuple(),
      {
        amount: types.uint(fee),
        'asset-id': types.uint(1),
        'recipient-id': types.uint(left_order_2_tuple['sender']),
        'sender-id': types.uint(4),
        type: types.ascii('internal_transfer'),
      },
    );
    assertEquals(
      block_2.receipts[0].events[2].contract_event.value.expectTuple(),
      {
        amount: types.uint(
          (right_order_2_tuple['maker-asset-data'] -
            right_order_2_tuple['linked-taker-data']) *
            closed_fill,
        ),
        'asset-id': types.uint(1),
        'recipient-id': types.uint(4),
        'sender-id': types.uint(right_order_2_tuple['maker']),
        type: types.ascii('internal_transfer'),
      },
    );
    assertEquals(
      block_2.receipts[0].events[3].contract_event.value.expectTuple(),
      {
        amount: types.uint(
          (right_order_2_tuple['maker-asset-data'] *
            closed_fill *
            right_order_2_tuple['sender-fee']) /
            1e8,
        ),
        'asset-id': types.uint(1),
        'recipient-id': types.uint(right_order_2_tuple['sender']),
        'sender-id': types.uint(right_order_2_tuple['maker']),
        type: types.ascii('internal_transfer'),
      },
    );
  },
});

Clarinet.test({
  name: 'Exchange - Perp: can match a liquidation order',
  fn(chain: Chain, accounts: Map<string, Account>) {
    const sender = accounts.get('wallet_1')!;

    const results = prepareChainBasicTest(chain, accounts);
    results.receipts.forEach((e: any) => {
      e.result.expectOk();
    });

    const left_order_tuple = {
      sender: 1,
      'sender-fee': 0.001e8,
      maker: 2,
      'maker-asset': 1,
      'taker-asset': 2,
      'maker-asset-data': 19292,
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
      'linked-taker-data': 18327, // 5% down
      'linked-stop': 18810e8, // 2.5% down
    };

    const right_order_tuple = {
      sender: 1,
      'sender-fee': 0.001e8,
      maker: 3,
      'maker-asset': 2,
      'taker-asset': 1,
      'maker-asset-data': 1,
      'taker-asset-data': 19292,
      'maximum-fill': 50e8,
      'expiration-height': 100,
      salt: 2,
      risk: false,
      stop: 0,
      timestamp: 2,
      type: 0,
      'linked-hash': '0x',
      'linked-maker-data': 20256,
      'linked-taker-data': 1,
      'linked-stop': 19774e8,
    };

    const left_order = perpOrderToTupleCV(left_order_tuple);
    const right_order = perpOrderToTupleCV(right_order_tuple);

    const order_fill = Math.min(
      left_order_tuple['maximum-fill'],
      right_order_tuple['maximum-fill'],
    );

    // yarn generate-perpetual-hash "{ \"sender\": 1, \"sender-fee\": 0.001e8, \"maker\": 2, \"maker-asset\": 1, \"taker-asset\": 2, \"maker-asset-data\": 19292, \"taker-asset-data\": 1, \"maximum-fill\": 100e8, \"expiration-height\": 100, \"salt\": 1, \"risk\": false, \"stop\": 0, \"timestamp\": 1, \"type\": 0, \"linked-hash\": \"0x\", \"linked-maker-data\": 1,\"linked-taker-data\": 18327, \"linked-stop\": 18810e8 }"
    // const left_order_hash =
    //   '0x2a2f10c29965ccb817b1b3738042cadc765b3da4aef6f9c3ed14f31309bb4a07';
    // yarn generate-perpetual-hash "{ \"sender\": 1, \"sender-fee\": 0.001e8, \"maker\": 3, \"maker-asset\": 2, \"taker-asset\": 1, \"maker-asset-data\": 1, \"taker-asset-data\": 19292, \"maximum-fill\": 50e8, \"expiration-height\": 100, \"salt\": 2, \"risk\": false, \"stop\": 0, \"timestamp\": 2, \"type\": 0, \"linked-hash\": \"0x\", \"linked-maker-data\": 20256,\"linked-taker-data\": 1, \"linked-stop\": 19774e8 }"
    // const right_order_hash =
    //   '0xa1a75fe60c955a96d66eb803d5b362b318ec6501e370fddeb84b41fa45706801';

    // yarn sign-order-hash 530d9f61984c888536871c6573073bdfc0058896dc1adfe9a6a10dfacadc209101 0x2a2f10c29965ccb817b1b3738042cadc765b3da4aef6f9c3ed14f31309bb4a07
    const left_signature =
      '0x339330215ec53278e43b7198d77af695945820123eb9ff7faf13f5d9f07fc50066aee36028c02b617378b83481c127f514b0d7744fcef196b898582d967db51500';
    // yarn sign-order-hash d655b2523bcd65e34889725c73064feb17ceb796831c0e111ba1a552b0f31b3901 0xa1a75fe60c955a96d66eb803d5b362b318ec6501e370fddeb84b41fa45706801
    const right_signature =
      '0xc0c4468935d23e66b1c007da317b208845d4cd49779e750fb3347486708c29370754b4872532bfff271f3d1c6eb5a66754f0412ffb5c4d317d94ed000e7623ca00';

    const block = chain.mineBlock([
      Tx.contractCall(
        contractNames.sender_proxy,
        'match-perp-orders',
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
      ),
    ]);
    block.receipts[0].result
      .expectOk()
      .expectTuple()
      ['fillable'].expectUint(order_fill);

    assertEquals(
      block.receipts[0].events[0].contract_event.value.expectTuple(),
      {
        amount: types.uint(
          (left_order_tuple['maker-asset-data'] -
            left_order_tuple['linked-taker-data']) *
            order_fill,
        ),
        'asset-id': types.uint(1),
        'recipient-id': types.uint(4),
        'sender-id': types.uint(left_order_tuple['maker']),
        type: types.ascii('internal_transfer'),
      },
    );
    assertEquals(
      block.receipts[0].events[1].contract_event.value.expectTuple(),
      {
        amount: types.uint(
          (left_order_tuple['maker-asset-data'] *
            order_fill *
            left_order_tuple['sender-fee']) /
            1e8,
        ),
        'asset-id': types.uint(1),
        'recipient-id': types.uint(left_order_tuple['sender']),
        'sender-id': types.uint(left_order_tuple['maker']),
        type: types.ascii('internal_transfer'),
      },
    );
    assertEquals(
      block.receipts[0].events[2].contract_event.value.expectTuple(),
      {
        amount: types.uint(
          (right_order_tuple['linked-maker-data'] -
            right_order_tuple['taker-asset-data']) *
            order_fill,
        ),
        'asset-id': types.uint(1),
        'recipient-id': types.uint(4),
        'sender-id': types.uint(right_order_tuple['maker']),
        type: types.ascii('internal_transfer'),
      },
    );
    assertEquals(
      block.receipts[0].events[3].contract_event.value.expectTuple(),
      {
        amount: types.uint(
          (right_order_tuple['taker-asset-data'] *
            order_fill *
            right_order_tuple['sender-fee']) /
            1e8,
        ),
        'asset-id': types.uint(1),
        'recipient-id': types.uint(right_order_tuple['sender']),
        'sender-id': types.uint(right_order_tuple['maker']),
        type: types.ascii('internal_transfer'),
      },
    );

    // liquidation

    const liquidation_order_tuple = {
      sender: left_order_tuple['sender'],
      'sender-fee': left_order_tuple['sender-fee'],
      maker: left_order_tuple['maker'],
      'maker-asset': left_order_tuple['taker-asset'],
      'taker-asset': left_order_tuple['maker-asset'],
      'maker-asset-data': left_order_tuple['linked-maker-data'],
      'taker-asset-data': left_order_tuple['linked-taker-data'],
      'maximum-fill': left_order_tuple['maximum-fill'],
      'expiration-height': '340282366920938463463374607431768211455',
      salt: left_order_tuple['salt'],
      risk: true,
      stop: left_order_tuple['linked-stop'],
      timestamp: left_order_tuple['timestamp'],
      type: 0,
      'linked-hash':
        '0x2a2f10c29965ccb817b1b3738042cadc765b3da4aef6f9c3ed14f31309bb4a07',
      'linked-maker-data': 0,
      'linked-taker-data': 0,
      'linked-stop': 0,
    };

    const liquidation_matched_tuple = {
      sender: 1,
      'sender-fee': 0.001e8,
      maker: 3,
      'maker-asset': 1,
      'taker-asset': 2,
      'maker-asset-data': 18327,
      'taker-asset-data': 1,
      'maximum-fill': 100e8,
      'expiration-height': 100,
      salt: 3,
      risk: false,
      stop: 0,
      timestamp: 3,
      type: 0,
      'linked-hash': '0x',
      'linked-maker-data': 1,
      'linked-taker-data': 17411,
      'linked-stop': 17869e8,
    };

    const liquidation_order = perpOrderToTupleCV(liquidation_order_tuple);
    const liquidation_matched = perpOrderToTupleCV(liquidation_matched_tuple);

    // yarn generate-perpetual-hash "{ \"sender\": 1, \"sender-fee\": 0.001e8, \"maker\": 3, \"maker-asset\": 1, \"taker-asset\": 2, \"maker-asset-data\": 18327, \"taker-asset-data\": 1, \"maximum-fill\": 100e8, \"expiration-height\": 100, \"salt\": 3, \"risk\": false, \"stop\": 0, \"timestamp\": 3, \"type\": 0, \"linked-hash\": \"0x\", \"linked-maker-data\": 1,\"linked-taker-data\": 17411, \"linked-stop\": 17869e8 }"
    // const liquidation_matched_hash =
    //   '0x45a5bc9b6144edec2045388478fab509c585cdccde8391ee42de1778b3927e94';

    // yarn sign-order-hash d655b2523bcd65e34889725c73064feb17ceb796831c0e111ba1a552b0f31b3901 0x45a5bc9b6144edec2045388478fab509c585cdccde8391ee42de1778b3927e94
    const liquidation_matched_signature =
      '0x0530b742d41822166b76f52caec87e85d900eaaef18a9e8b1f236588e70df7c506b9f989f9ae968766127f16ff19115c79686b5a33db9b2d314fc8e55eab0a1001';

    // start with liteEvmSignature.
    // the signature = Buffer.from(liteSignatureToStacksSignature(`${liteEvmSignature}`)).toString('hex')
    const oracle_signature =
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

    const liquidated_fill = Math.min(
      order_fill,
      liquidation_order_tuple['maximum-fill'],
      liquidation_matched_tuple['maximum-fill'],
    );

    const block_2 = chain.mineBlock([
      Tx.contractCall(
        contractNames.sender_proxy,
        'match-perp-orders',
        [
          liquidation_matched,
          liquidation_order,
          liquidation_matched_signature,
          '0x',
          types.none(),
          types.some(
            types.tuple({
              timestamp: types.uint(pricePackage.timestamp),
              value: types.uint(shiftPriceValue(pricePackage.prices[0].value)),
              signature: oracle_signature,
            }),
          ),
          types.none(),
        ],
        sender.address,
      ),
    ]);
    block_2.receipts[0].result
      .expectOk()
      .expectTuple()
      ['fillable'].expectUint(liquidated_fill);

    const liquidatedMargin =
      (left_order_tuple['maker-asset-data'] -
        left_order_tuple['linked-taker-data']) *
      liquidated_fill;
    const liquidatedPnL =
      (liquidation_order_tuple['taker-asset-data'] -
        left_order_tuple['maker-asset-data']) *
      liquidated_fill;
    const liquidatedFee =
      (liquidation_order_tuple['taker-asset-data'] *
        liquidated_fill *
        liquidation_order_tuple['sender-fee']) /
      1e8;
    // console.log(block_2.receipts[0].events);
    assertEquals(liquidatedMargin, -liquidatedPnL); // no settlement required and no fee to liquidator

    // assertEquals(
    //   block_2.receipts[0].events[2].contract_event.value.expectTuple(),
    //   {
    //     amount: types.uint(liquidatedMargin + liquidatedPnL - liquidatedFee),
    //     'asset-id': types.uint(1),
    //     'recipient-id': types.uint(liquidation_order_tuple['maker']),
    //     'sender-id': types.uint(4),
    //     type: types.ascii('internal_transfer'),
    //   },
    // );
    // assertEquals(
    //   block_2.receipts[0].events[3].contract_event.value.expectTuple(),
    //   {
    //     amount: types.uint(liquidatedFee),
    //     'asset-id': types.uint(1),
    //     'recipient-id': types.uint(liquidation_order_tuple['sender']),
    //     'sender-id': types.uint(4),
    //     type: types.ascii('internal_transfer'),
    //   },
    // );
    assertEquals(
      block_2.receipts[0].events[0].contract_event.value.expectTuple(),
      {
        amount: types.uint(
          (liquidation_matched_tuple['maker-asset-data'] -
            liquidation_matched_tuple['linked-taker-data']) *
            liquidated_fill,
        ),
        'asset-id': types.uint(1),
        'recipient-id': types.uint(4),
        'sender-id': types.uint(liquidation_matched_tuple['maker']),
        type: types.ascii('internal_transfer'),
      },
    );
    assertEquals(
      block_2.receipts[0].events[1].contract_event.value.expectTuple(),
      {
        amount: types.uint(
          (liquidation_matched_tuple['maker-asset-data'] *
            liquidated_fill *
            liquidation_matched_tuple['sender-fee']) /
            1e8,
        ),
        'asset-id': types.uint(1),
        'recipient-id': types.uint(liquidation_matched_tuple['sender']),
        'sender-id': types.uint(liquidation_matched_tuple['maker']),
        type: types.ascii('internal_transfer'),
      },
    );
  },
});
