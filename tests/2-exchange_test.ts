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

    const left_signature =
      '0xfa4d6088c45e08b69f7423fadc1dcdc512d9fb807da26c4d7b46c53d0bd078d1217e0318eba3a16d75ff932048733f130067e9ae68dc2d0d0d3b0b1dc1e2a8d200';
    const right_signature =
      '0x56664d2146c2ad1819acfcf241e5950a92bd44c5b37b8d2596800f000f3cc99129f3b06eab5ab5e4b97ca1a362d27e1a8fbb519ef889ae0f95f4206f516dfbb901';

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
    const receipt = block.receipts[0];
    const events = receipt.events as { contract_event: { value: string } }[];
    receipt.result.expectOk().expectTuple()['fillable'].expectUint(50e8);

    assertEquals(events[0].contract_event.value.expectTuple(), {
      amount: types.uint((14000 - 13300) * 50e8),
      'asset-id': types.uint(1),
      'recipient-id': types.uint(4),
      'sender-id': types.uint(2),
      type: types.ascii('internal_transfer'),
    });
    assertEquals(events[1].contract_event.value.expectTuple(), {
      amount: types.uint(14000 * 50e8 * 0.001),
      'asset-id': types.uint(1),
      'recipient-id': types.uint(1),
      'sender-id': types.uint(2),
      type: types.ascii('internal_transfer'),
    });
    assertEquals(events[2].contract_event.value.expectTuple(), {
      amount: types.uint((14700 - 14000) * 50e8),
      'asset-id': types.uint(1),
      'recipient-id': types.uint(4),
      'sender-id': types.uint(3),
      type: types.ascii('internal_transfer'),
    });
    assertEquals(events[3].contract_event.value.expectTuple(), {
      amount: types.uint(14000 * 50e8 * 0.001),
      'asset-id': types.uint(1),
      'recipient-id': types.uint(1),
      'sender-id': types.uint(3),
      type: types.ascii('internal_transfer'),
    });
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

    const left_order_hash =
      '0x06f59c338a001e4a5cf46456e2f0bc9aeb957030c52899c44bc51535112e0fec';
    const right_order_hash =
      '0xa20b772c3337141e4a9808709e5a16a91647c3a00151c04b8773f2d3143acb24';

    const left_signature =
      '0xfa4d6088c45e08b69f7423fadc1dcdc512d9fb807da26c4d7b46c53d0bd078d1217e0318eba3a16d75ff932048733f130067e9ae68dc2d0d0d3b0b1dc1e2a8d200';
    const right_signature =
      '0x56664d2146c2ad1819acfcf241e5950a92bd44c5b37b8d2596800f000f3cc99129f3b06eab5ab5e4b97ca1a362d27e1a8fbb519ef889ae0f95f4206f516dfbb901';

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
      ['fillable'].expectUint(50e8);

    const left_order_2 = perpOrderToTupleCV({
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
      'linked-maker-asset': 0,
      'linked-taker-asset': 0,
      'linked-stop': 0,
    });

    const right_order_2 = perpOrderToTupleCV({
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
    });

    // yarn generate-perpetual-hash "{ \"sender\": 1, \"sender-fee\": 0.001e8, \"maker\": 2, \"maker-asset\": 2, \"taker-asset\": 1, \"maker-asset-data\": 1, \"taker-asset-data\": 13650, \"maximum-fill\": 20e8, \"expiration-height\": 100, \"salt\": 3, \"risk\": false, \"stop\": 0, \"timestamp\": 2, \"type\": 0, \"linked-hash\": \"0x06f59c338a001e4a5cf46456e2f0bc9aeb957030c52899c44bc51535112e0fec\", \"linked-maker-data\": 0,\"linked-taker-data\": 0, \"linked-stop\": 0 }"
    const left_order_hash_2 =
      '0xb33ad49a5c65ee0ccc5bdbb203e67266a66be3f8b915860f0656b3f64b59537e';

    // yarn generate-perpetual-hash "{ \"sender\": 1, \"sender-fee\": 0.001e8, \"maker\": 3, \"maker-asset\": 1, \"taker-asset\": 2, \"maker-asset-data\": 13650, \"taker-asset-data\": 1, \"maximum-fill\": 100e8, \"expiration-height\": 100, \"salt\": 3, \"risk\": false, \"stop\": 0, \"timestamp\": 3, \"type\": 0, \"linked-hash\": \"0x\", \"linked-maker-data\": 1,\"linked-taker-data\": 12967, \"linked-stop\": 13300e8 }"
    const right_order_hash_2 =
      '0x8fb0e0600d591372bc99373e20eb390264818000a059b0df4f94081cd1842956';

    // yarn sign-order-hash 530d9f61984c888536871c6573073bdfc0058896dc1adfe9a6a10dfacadc209101 0xb33ad49a5c65ee0ccc5bdbb203e67266a66be3f8b915860f0656b3f64b59537e
    const left_signature_2 =
      '0x78388323bfe8ff72580b468a7b9fcc747777886a103477d1852f039f22cb0cd65d8d5da29677df47044e4f3aaa2682d8498e3de097b11812363b0b2d5b547f3601';

    // yarn sign-order-hash d655b2523bcd65e34889725c73064feb17ceb796831c0e111ba1a552b0f31b3901 0x8fb0e0600d591372bc99373e20eb390264818000a059b0df4f94081cd1842956
    const right_signature_2 =
      '0x7e88ca05e1e2c16a6b89edd80b1a91e01df341c29165ab4ccc221043714598fc44949786dd28e7cdd926a70d5b82cafbdb0762f9c89acdb6a104ed697f43483200';

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
    const receipt = block_2.receipts[0];
    const events = receipt.events as { contract_event: { value: string } }[];
    receipt.result.expectOk().expectTuple()['fillable'].expectUint(20e8);

    // console.log(receipt.events);
    assertEquals(events[0].contract_event.value.expectTuple(), {
      amount: types.uint((14000 - 13300) * 20e8 - (14000 - 13650) * 20e8),
      'asset-id': types.uint(1),
      'recipient-id': types.uint(2),
      'sender-id': types.uint(4),
      type: types.ascii('internal_transfer'),
    });
    assertEquals(events[1].contract_event.value.expectTuple(), {
      amount: types.uint(13650 * 20e8 * 0.001),
      'asset-id': types.uint(1),
      'recipient-id': types.uint(1),
      'sender-id': types.uint(2),
      type: types.ascii('internal_transfer'),
    });
    assertEquals(events[2].contract_event.value.expectTuple(), {
      amount: types.uint((13650 - 12967) * 20e8),
      'asset-id': types.uint(1),
      'recipient-id': types.uint(4),
      'sender-id': types.uint(3),
      type: types.ascii('internal_transfer'),
    });
    assertEquals(events[3].contract_event.value.expectTuple(), {
      amount: types.uint(13650 * 20e8 * 0.001),
      'asset-id': types.uint(1),
      'recipient-id': types.uint(1),
      'sender-id': types.uint(3),
      type: types.ascii('internal_transfer'),
    });
  },
});

// Clarinet.test({
//   name: 'Exchange - Perp: can match a liquidation order',
//   fn(chain: Chain, accounts: Map<string, Account>) {
//     const sender = accounts.get('wallet_1')!;

//     const results = prepareChainBasicTest(chain, accounts);
//     results.receipts.forEach((e: any) => {
//       e.result.expectOk();
//     });

//     // start with liteEvmSignature.
//     // the signature = Buffer.from(liteSignatureToStacksSignature(`${liteEvmSignature}`)).toString('hex')
//     const oracle_signature =
//       '0x71b534851bcd7584e7743043917606968cfc571c45e765d088aa07c2347b2c7918506ee6002b4014514523494367232c334d22a25167fcf8682a1f79ada700db01';

//     const pricePackage: PricePackage = {
//       timestamp: 1662540506183,
//       prices: [
//         {
//           symbol: 'BTC',
//           value: 18805.300000000003,
//         },
//       ],
//     };

//     const left_order = perpOrderToTupleCV({
//       sender: 1,
//       'sender-fee': 0.001e8,
//       maker: 2,
//       'maker-asset': 1,
//       'taker-asset': 2,
//       'maker-asset-data': 14000,
//       'taker-asset-data': 1,
//       'maximum-fill': 100e8,
//       'expiration-height': 100,
//       salt: 1,
//       risk: false,
//       stop: 0,
//       timestamp: 1,
//       type: 0,
//       'linked-hash': '0x',
//     });

//     const left_linked = perpOrderToTupleCV({
//       sender: 1,
//       'sender-fee': 0.001e8,
//       maker: 2,
//       'maker-asset': 2,
//       'taker-asset': 1,
//       'maker-asset-data': 1,
//       'taker-asset-data': 13300, // 5% down
//       'maximum-fill': 100e8,
//       'expiration-height': 340282366920938463463374607431768211455n,
//       salt: 2,
//       risk: true,
//       stop: 18805e8, // 2.5% down
//       timestamp: 1,
//       type: 0,
//       'linked-hash':
//         '0x262f3a7c15a81ce06e8537ef37727ee0fec341240f11d36a0dc4d530884ac63e',
//     });

//     const right_order = perpOrderToTupleCV({
//       sender: 1,
//       'sender-fee': 0.001e8,
//       maker: 3,
//       'maker-asset': 2,
//       'taker-asset': 1,
//       'maker-asset-data': 1,
//       'taker-asset-data': 14000,
//       'maximum-fill': 50e8,
//       'expiration-height': 100,
//       salt: 2,
//       risk: false,
//       stop: 0,
//       timestamp: 2,
//       type: 0,
//       'linked-hash': '0x',
//     });

//     const right_linked = perpOrderToTupleCV({
//       sender: 1,
//       'sender-fee': 0.001e8,
//       maker: 3,
//       'maker-asset': 1,
//       'taker-asset': 2,
//       'maker-asset-data': 14700,
//       'taker-asset-data': 1,
//       'maximum-fill': 50e8,
//       'expiration-height': 340282366920938463463374607431768211455n,
//       salt: 3,
//       risk: true,
//       stop: 14350e8,
//       timestamp: 2,
//       type: 0,
//       'linked-hash':
//         '0x7dd31575a351d31538b0d9559a3f7f8411887058524397d82b07d3b870b9fcdf',
//     });

//     const left_signature =
//       '0xc3d183f2efa646b916f954dede095758fc5ac7cc4c9f1447666df90eb0b8dbf305e7c0ec62fd905a7e66188fe7e5fb814bee94c024781943f37d2bf25505e53700';

//     const right_signature =
//       '0x356799e2cdb405e1fbb9aefb460a055bbc5e7568afc880d21016a4c62a0a7241065565788bc2b694564f89a59a9991f797efc1315db52a344e23a791f0dcabf601';

//     const block = chain.mineBlock([
//       Tx.contractCall(
//         contractNames.sender_proxy,
//         'match-perp-orders',
//         [
//           types.tuple({ parent: left_order, linked: types.some(left_linked) }),
//           types.tuple({
//             parent: right_order,
//             linked: types.some(right_linked),
//           }),
//           left_signature,
//           right_signature,
//           types.none(),
//           types.none(),
//           types.none(),
//         ],
//         sender.address,
//       ),
//     ]);
//     block.receipts[0].result
//       .expectOk()
//       .expectTuple()
//       ['fillable'].expectUint(50e8);

//     // liquidation

//     const right_order_2 = perpOrderToTupleCV({
//       sender: 1,
//       'sender-fee': 0.001e8,
//       maker: 3,
//       'maker-asset': 1,
//       'taker-asset': 2,
//       'maker-asset-data': 13300, //left_linked_tuple['taker-asset-data'],
//       'taker-asset-data': 1,
//       'maximum-fill': 100e8,
//       'expiration-height': 100,
//       salt: 3,
//       risk: false,
//       stop: 0,
//       timestamp: 3,
//       type: 0,
//       'linked-hash': '0x',
//     });

//     const right_linked_2 = perpOrderToTupleCV({
//       sender: 1,
//       'sender-fee': 0.001e8,
//       maker: 3,
//       'maker-asset': 2,
//       'taker-asset': 1,
//       'maker-asset-data': 1,
//       'taker-asset-data': 12635, //left_linked_tuple['taker-asset-data'] * 0.95,
//       'maximum-fill': 100e8,
//       'expiration-height': 340282366920938463463374607431768211455n,
//       salt: 4,
//       risk: true,
//       stop: 12967.5e8, //left_linked_tuple['taker-asset-data'] * 0.975 * 1e8,
//       timestamp: 3,
//       type: 0,
//       'linked-hash':
//         '0x2f82e07a614eb092b0ce6d75768f1c94c5ac2b7651c1cd08fe595861d4985fab',
//     });

//     // yarn generate-perpetual-hash "{ \"sender\": 1, \"sender-fee\": 0.001e8, \"maker\": 3, \"maker-asset\": 1, \"taker-asset\": 2, \"maker-asset-data\": 13300, \"taker-asset-data\": 1, \"maximum-fill\": 100e8, \"expiration-height\": 100, \"salt\": 3, \"risk\": false, \"stop\": 0, \"timestamp\": 3, \"type\": 0, \"linked-hash\": \"0x\" }"
//     const right_order_hash_2 =
//       '0x038bc03e0ce72cfb5e9ab20e4e6a4b63dcd55b61a11a8dda75be660ba540fa0f';

//     // yarn sign-order-hash d655b2523bcd65e34889725c73064feb17ceb796831c0e111ba1a552b0f31b3901 0x038bc03e0ce72cfb5e9ab20e4e6a4b63dcd55b61a11a8dda75be660ba540fa0f
//     const right_signature_2 =
//       '0x75b4825bc417bcfd813a03e9badef85c90888911a0212cf0a4c32936aa92e49227a95d1831f577b436691401ad5b6cebd42c938ac5f494cfa27606504028305001';

//     const block_2 = chain.mineBlock([
//       Tx.contractCall(
//         contractNames.sender_proxy,
//         'match-perp-orders',
//         [
//           types.tuple({ parent: left_linked, linked: types.none() }),
//           types.tuple({
//             parent: right_order_2,
//             linked: types.some(right_linked_2),
//           }),
//           '0x', //left_signature_2,
//           right_signature_2,
//           types.none(),
//           types.none(),
//           types.none(),
//         ],
//         sender.address,
//       ),
//     ]);
//     block_2.receipts[0].result
//       .expectOk()
//       .expectTuple()
//       ['fillable'].expectUint(20e8);

//     // console.log(block_2.receipts[0].events);
//     assertEquals(
//       block_2.receipts[0].events[0].contract_event.value.expectTuple(),
//       {
//         amount: types.uint((14000 - 13300) * 20e8 - (14000 - 13650) * 20e8),
//         'asset-id': types.uint(1),
//         'recipient-id': types.uint(2),
//         'sender-id': types.uint(4),
//         type: types.ascii('internal_transfer'),
//       },
//     );
//     assertEquals(
//       block_2.receipts[0].events[1].contract_event.value.expectTuple(),
//       {
//         amount: types.uint(13650 * 20e8 * 0.001),
//         'asset-id': types.uint(1),
//         'recipient-id': types.uint(1),
//         'sender-id': types.uint(2),
//         type: types.ascii('internal_transfer'),
//       },
//     );
//     assertEquals(
//       block_2.receipts[0].events[2].contract_event.value.expectTuple(),
//       {
//         amount: types.uint((13650 - 12967) * 20e8),
//         'asset-id': types.uint(1),
//         'recipient-id': types.uint(4),
//         'sender-id': types.uint(3),
//         type: types.ascii('internal_transfer'),
//       },
//     );
//     assertEquals(
//       block_2.receipts[0].events[3].contract_event.value.expectTuple(),
//       {
//         amount: types.uint(13650 * 20e8 * 0.001),
//         'asset-id': types.uint(1),
//         'recipient-id': types.uint(1),
//         'sender-id': types.uint(3),
//         type: types.ascii('internal_transfer'),
//       },
//     );
//   },
// });
