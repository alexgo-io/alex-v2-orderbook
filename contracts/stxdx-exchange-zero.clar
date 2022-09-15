(impl-trait .trait-ownable.ownable-trait)

;; 3000-3999: core errors
(define-constant err-unauthorised-sender (err u3000))
(define-constant err-maker-asset-mismatch (err u3001))
(define-constant err-taker-asset-mismatch (err u3002))
(define-constant err-asset-data-mismatch (err u3003))
(define-constant err-left-order-expired (err u3005))
(define-constant err-right-order-expired (err u3006))
(define-constant err-left-authorisation-failed (err u3007))
(define-constant err-right-authorisation-failed (err u3008))
(define-constant err-maximum-fill-reached (err u3009))
(define-constant err-maker-not-tx-sender (err u3010))
(define-constant err-invalid-timestamp (err u3011))
(define-constant err-unknown-asset-id (err u3501))

;; 4000-4999: registry errors
(define-constant err-unauthorised-caller (err u4000))

;; 5000-5999: exchange errors
(define-constant err-asset-data-too-long (err u5003))
(define-constant err-sender-fee-payment-failed (err u5007))
(define-constant err-asset-contract-call-failed (err u5008))
(define-constant err-stop-not-triggered (err u5009))
(define-constant err-invalid-order-type (err u5010))
(define-constant err-cancel-authorisation-failed (err u5011))

;; 6000-6999: oracle errors
(define-constant err-untrusted-oracle (err u6000))
(define-constant err-no-oracle-data (err u6001))

(define-constant structured-data-prefix 0x534950303138)

(define-constant type-order-vanilla u0)
(define-constant type-order-fok u1)
(define-constant type-order-ioc u2)

(define-constant ONE_8 u100000000)

(define-data-var contract-owner principal tx-sender)
(define-map authorised-senders principal bool)

(define-map trusted-oracles (buff 33) bool)
(define-map oracle-symbols uint (buff 32))
(define-map triggered-orders (buff 32) bool)

(define-read-only (is-trusted-oracle (pubkey (buff 33)))
	(default-to false (map-get? trusted-oracles pubkey))
)

(define-read-only (is-order-triggered (order-hash (buff 32)))
	(default-to false (map-get? triggered-orders order-hash))
)

(define-constant serialized-key-cancel (serialize-tuple-key "cancel"))
(define-constant serialized-key-hash (serialize-tuple-key "hash"))
(define-constant serialized-cancel-header (concat type-id-tuple (uint32-to-buff-be u2)))

(define-read-only (hash-cancel-order (order-hash (buff 32)))
	(sha256
		(concat serialized-cancel-header

		(concat serialized-key-cancel
		(concat (serialize-bool true)

		(concat serialized-key-hash 
				(serialize-buff order-hash)
		))))
	)
)

(define-public (cancel-order 
	(order
		{
		sender: uint,
		sender-fee: uint,
		maker: uint,
		maker-asset: uint,
		taker-asset: uint,
		maker-asset-data: uint,
		taker-asset-data: uint,
		maximum-fill: uint,
		expiration-height: uint,
		salt: uint,
		risk: bool,
		stop: uint,
		timestamp: uint,
		type: uint
		}
	)
	(signature (buff 65)))
	(let 
		(
			(order-hash (hash-order order))
			(cancel-hash (hash-cancel-order order-hash))
			(maker-pubkey (get maker-pubkey (try! (contract-call? .stxdx-registry user-from-id-or-fail (get maker order)))))
		)
		(try! (is-authorised-sender))	
		(asserts! 
			(or
				(is-eq type-order-fok (get type order))
				(is-eq type-order-ioc (get type order))
				(is-eq (secp256k1-recover? (sha256 (concat structured-data-prefix (concat message-domain cancel-hash))) signature) (ok maker-pubkey))
			) 
			err-cancel-authorisation-failed
		)
		;; cancel means no more fill, so setting its fill to maximum-fill achieve it.
		(contract-call? .stxdx-registry set-order-fill order-hash (get maximum-fill order))	
	)
)

(define-private (cancel-order-iter 
	(one-cancel-order
		{ 
			order: { sender: uint, sender-fee: uint, maker: uint, maker-asset: uint, taker-asset: uint, maker-asset-data: uint, taker-asset-data: uint, maximum-fill: uint, expiration-height: uint, salt: uint, risk: bool, stop: uint, timestamp: uint, type: uint },
			signature: (buff 65)
		}
	))
	(cancel-order (get order one-cancel-order) (get signature one-cancel-order))
)

(define-public (cancel-order-many
	(cancel-order-list
		(list 200
			{ 
				order: { sender: uint, sender-fee: uint, maker: uint, maker-asset: uint, taker-asset: uint, maker-asset-data: uint, taker-asset-data: uint, maximum-fill: uint, expiration-height: uint, salt: uint, risk: bool, stop: uint, timestamp: uint, type: uint },
				signature: (buff 65)
			}		
		) 
	))
	(ok (map cancel-order-iter cancel-order-list))
)

;; #[allow(unchecked_data)]
(define-public (set-trusted-oracle (pubkey (buff 33)) (trusted bool))
	(begin
		(try! (is-contract-owner))
		(ok (map-set trusted-oracles pubkey trusted))
	)
)

(define-read-only (get-oracle-symbol-or-fail (asset-id uint))
	(ok (unwrap! (map-get? oracle-symbols asset-id) err-unknown-asset-id))
)

(define-public (set-oracle-symbol (asset-id uint) (symbol (buff 32)))
	(begin 
		(try! (is-contract-owner))
		(ok (map-set oracle-symbols asset-id symbol))
	)
)

(define-public (remove-oracle-symbol (asset-id uint))
	(begin 
		(try! (is-contract-owner))
		(ok (map-delete oracle-symbols asset-id))
	)
)

(define-private (is-contract-owner)
	(ok (asserts! (is-eq (var-get contract-owner) tx-sender) err-unauthorised-caller))
)

(define-public (set-contract-owner (new-owner principal))
	(begin
		(try! (is-contract-owner))
		(ok (var-set contract-owner new-owner))
	)
)

(define-public (set-authorised-sender (authorised bool) (sender principal))
	(begin
		(try! (is-contract-owner))
		(ok (map-set authorised-senders sender authorised))
	)
)

(define-private (is-authorised-sender)
	(ok (asserts! (default-to false (map-get? authorised-senders contract-caller)) err-unauthorised-sender))
)

(define-read-only (get-contract-owner)
	(ok (var-get contract-owner))
)

(define-constant message-domain 0xa029c5596ed80a140feec731f59708a05a78dd104ebbc1dc95b8ff8785cc7549)

(define-private (validate-authorisation (fills uint) (maker principal) (maker-pubkey (buff 33)) (hash (buff 32)) (signature (buff 65)))
	(begin
		(or
			(> fills u0)
			(is-eq maker tx-sender)
			(and (is-eq (len signature) u0) (contract-call? .stxdx-registry get-order-approval maker hash))
			(is-eq (secp256k1-recover? (sha256 (concat structured-data-prefix (concat message-domain hash))) signature) (ok maker-pubkey))
		)
	)
)

(define-constant serialized-key-sender (serialize-tuple-key "sender"))
(define-constant serialized-key-sender-fee (serialize-tuple-key "sender-fee"))
(define-constant serialized-key-maker (serialize-tuple-key "maker"))
(define-constant serialized-key-maker-asset (serialize-tuple-key "maker-asset"))
(define-constant serialized-key-taker-asset (serialize-tuple-key "taker-asset"))
(define-constant serialized-key-maker-asset-data (serialize-tuple-key "maker-asset-data"))
(define-constant serialized-key-taker-asset-data (serialize-tuple-key "taker-asset-data"))
(define-constant serialized-key-maximum-fill (serialize-tuple-key "maximum-fill"))
(define-constant serialized-key-expiration-height (serialize-tuple-key "expiration-height"))
(define-constant serialized-key-salt (serialize-tuple-key "salt"))
(define-constant serialized-key-risk (serialize-tuple-key "risk"))
(define-constant serialized-key-stop (serialize-tuple-key "stop"))
(define-constant serialized-key-timestamp (serialize-tuple-key "timestamp"))
(define-constant serialized-key-type (serialize-tuple-key "type"))
(define-constant serialized-order-header (concat type-id-tuple (uint32-to-buff-be u14)))

(define-read-only (hash-order
	(order
		{
		sender: uint,
		sender-fee: uint,
		maker: uint,
		maker-asset: uint,
		taker-asset: uint,
		maker-asset-data: uint,
		taker-asset-data: uint,
		maximum-fill: uint,
		expiration-height: uint,
		salt: uint,
		risk: bool,
		stop: uint,
		timestamp: uint,
		type: uint
		}
	)
	)
	(sha256
		(concat serialized-order-header

		(concat serialized-key-expiration-height
		(concat (serialize-uint (get expiration-height order))

		(concat serialized-key-maker
		(concat (serialize-uint (get maker order))

		(concat serialized-key-maker-asset
		(concat (serialize-uint (get maker-asset order))

		(concat serialized-key-maker-asset-data
		(concat (serialize-uint (get maker-asset-data order))

		(concat serialized-key-maximum-fill
		(concat (serialize-uint (get maximum-fill order))

		(concat serialized-key-risk
		(concat (serialize-bool (get risk order))

		(concat serialized-key-salt
		(concat (serialize-uint (get salt order))

		(concat serialized-key-sender
		(concat (serialize-uint (get sender order))

		(concat serialized-key-sender-fee
		(concat (serialize-uint (get sender-fee order))	

		(concat serialized-key-stop 
		(concat (serialize-uint (get stop order))
		
		(concat serialized-key-taker-asset
		(concat (serialize-uint (get taker-asset order))

		(concat serialized-key-taker-asset-data
		(concat (serialize-uint (get taker-asset-data order))

		(concat serialized-key-timestamp
		(concat (serialize-uint (get timestamp order))

		(concat serialized-key-type
				(serialize-uint (get type order))

		))))))))))))))))))))))))))))
	)
)

(define-read-only (validate-match
	(left-order
		{
		sender: uint,
		sender-fee: uint,
		maker: uint,
		maker-asset: uint,
		taker-asset: uint,
		maker-asset-data: uint,
		taker-asset-data: uint,
		maximum-fill: uint,
		expiration-height: uint,
		salt: uint,
		risk: bool,
		stop: uint,
		timestamp: uint,
		type: uint
		}
	)
	(right-order
		{
		sender: uint,
		sender-fee: uint,
		maker: uint,
		maker-asset: uint,
		taker-asset: uint,
		maker-asset-data: uint,
		taker-asset-data: uint,
		maximum-fill: uint,
		expiration-height: uint,
		salt: uint,
		risk: bool,
		stop: uint,
		timestamp: uint,
		type: uint
		}
	)
	(left-signature (buff 65))
	(right-signature (buff 65))	
	(left-oracle-data (optional { timestamp: uint, value: uint, signature: (buff 65) }))
	(right-oracle-data (optional { timestamp: uint, value: uint, signature: (buff 65) }))	
	(fill (optional uint))
	)
	(let
		(
			(users (try! (contract-call? .stxdx-registry get-two-users-from-id-or-fail (get maker left-order) (get maker right-order))))
			(left-user (get user-1 users))
			(right-user (get user-2 users))
			(left-order-hash (hash-order left-order))
			(right-order-hash (hash-order right-order))
			(order-fills (contract-call? .stxdx-registry get-two-order-fills left-order-hash right-order-hash))
			(left-order-fill (get order-1 order-fills))
			(right-order-fill (get order-2 order-fills))
			(fillable (min (- (get maximum-fill left-order) left-order-fill) (- (get maximum-fill right-order) right-order-fill)))
		)
		(try! (is-authorised-sender))
		;; there are more fills to do
		(match fill value (asserts! (>= fillable value) err-maximum-fill-reached) (asserts! (> fillable u0) err-maximum-fill-reached))		
		;; both orders are not expired
		(asserts! (< block-height (get expiration-height left-order)) err-left-order-expired)
		(asserts! (< block-height (get expiration-height right-order)) err-right-order-expired)				
		;; assets to be exchanged match
		(asserts! (is-eq (get maker-asset left-order) (get taker-asset right-order)) err-maker-asset-mismatch)
		(asserts! (is-eq (get taker-asset left-order) (get maker-asset right-order)) err-taker-asset-mismatch)
		;; left-order must be older than right-order
		(asserts! (<= (get timestamp left-order) (get timestamp right-order)) err-invalid-timestamp)
		;; one side matches and the taker of the other side is smaller than maker.
		;; so that maker gives at most maker-asset-data, and taker takes at least taker-asset-data
		(asserts! 
			(or 
				(and
					(is-eq (get maker-asset-data left-order) (get taker-asset-data right-order))
					(<= (get taker-asset-data left-order) (get maker-asset-data right-order))				
				)				
				(and
					(is-eq (get taker-asset-data left-order) (get maker-asset-data right-order))
					(>= (get maker-asset-data left-order) (get taker-asset-data right-order))
				)
			)
			err-asset-data-mismatch
		)
		;; stop limit order
		(if (or (is-eq (get stop left-order) u0) (is-order-triggered left-order-hash))
			true
			(let
				(
					(oracle-data (unwrap! left-oracle-data err-no-oracle-data))
					(is-buy (is-some (map-get? oracle-symbols (get taker-asset left-order))))
					(symbol (try! (get-oracle-symbol-or-fail (if is-buy (get taker-asset left-order) (get maker-asset left-order)))))
					(signer (try! (contract-call? .redstone-verify recover-signer (get timestamp oracle-data) (list {value: (get value oracle-data), symbol: symbol}) (get signature oracle-data))))
				)
				(asserts! (is-trusted-oracle signer) err-untrusted-oracle)
				(asserts! (<= (get timestamp left-order) (get timestamp oracle-data)) err-invalid-timestamp)				
				(if (get risk left-order) ;; it is risk-mgmt stop limit, i.e. buy on the way up (to hedge sell) or sell on the way down (to hedge buy)
					(asserts! (if is-buy (>= (get value oracle-data) (get stop left-order)) (<= (get value oracle-data) (get stop left-order))) err-stop-not-triggered)
					(asserts! (if is-buy (< (get value oracle-data) (get stop left-order)) (> (get value oracle-data) (get stop left-order))) err-stop-not-triggered)
				)				
			)
		)	
		(if (or (is-eq (get stop right-order) u0) (is-order-triggered right-order-hash))
			true
			(let
				(
					(oracle-data (unwrap! right-oracle-data err-no-oracle-data))
					(is-buy (is-some (map-get? oracle-symbols (get taker-asset right-order))))
					(symbol (try! (get-oracle-symbol-or-fail (if is-buy (get taker-asset right-order) (get maker-asset right-order)))))
					(signer (try! (contract-call? .redstone-verify recover-signer (get timestamp oracle-data) (list {value: (get value oracle-data), symbol: symbol}) (get signature oracle-data))))
				)
				(asserts! (is-trusted-oracle signer) err-untrusted-oracle)
				(asserts! (<= (get timestamp right-order) (get timestamp oracle-data)) err-invalid-timestamp)				
				(if (get risk right-order) ;; it is risk-mgmt stop limit, i.e. buy on the way up (to hedge sell) or sell on the way down (to hedge buy)
					(asserts! (if is-buy (>= (get value oracle-data) (get stop right-order)) (<= (get value oracle-data) (get stop right-order))) err-stop-not-triggered)
					(asserts! (if is-buy (< (get value oracle-data) (get stop right-order)) (> (get value oracle-data) (get stop right-order))) err-stop-not-triggered)
				)				
			)
		)		
	
		(asserts! (validate-authorisation left-order-fill (get maker left-user) (get maker-pubkey left-user) left-order-hash left-signature) err-left-authorisation-failed)
		(asserts! (validate-authorisation right-order-fill (get maker right-user) (get maker-pubkey right-user) right-order-hash right-signature) err-right-authorisation-failed)

		(ok
			{
			left-order-hash: left-order-hash,
			right-order-hash: right-order-hash,
			left-order-fill: left-order-fill,
			right-order-fill: right-order-fill,
			fillable: fillable,
			left-order-make: (get maker-asset-data left-order),
			right-order-make: (get taker-asset-data left-order),
			}
		)
	)
)

(define-public (approve-order
	(order
		{
		sender: uint,
		sender-fee: uint,
		maker: uint,
		maker-asset: uint,
		taker-asset: uint,
		maker-asset-data: uint,
		taker-asset-data: uint,
		maximum-fill: uint,
		expiration-height: uint,
		salt: uint,
		risk: bool,
		stop: uint,
		timestamp: uint,
		type: uint
		}
	)
	)
	(begin
		(asserts! (is-eq (try! (contract-call? .stxdx-registry user-maker-from-id-or-fail (get maker order))) tx-sender) err-maker-not-tx-sender)
		(contract-call? .stxdx-registry set-order-approval (hash-order order) true)
	)
)

(define-private (settle-order
	(order
		{
		sender: uint,
		sender-fee: uint,
		maker: uint,
		maker-asset: uint,
		taker-asset: uint,
		maker-asset-data: uint,
		taker-asset-data: uint,
		maximum-fill: uint,
		expiration-height: uint,
		salt: uint,
		risk: bool,
		stop: uint,
		timestamp: uint,
		type: uint
		}
	)
	(amount uint)
	(taker uint)
	)
	(begin
		(as-contract (unwrap! (contract-call? .stxdx-wallet-zero transfer amount (get maker order) taker (get maker-asset order)) err-asset-contract-call-failed))
		(and
			(> (get sender-fee order) u0)
			(as-contract (unwrap! (contract-call? .stxdx-wallet-zero transfer (mul-down (get sender-fee order) amount) (get maker order) (get sender order) (get maker-asset order)) err-sender-fee-payment-failed))
		)
		(ok true)
	)
)

(define-public (match-orders
	(left-order
		{
		sender: uint,
		sender-fee: uint,
		maker: uint,
		maker-asset: uint,
		taker-asset: uint,
		maker-asset-data: uint,
		taker-asset-data: uint,
		maximum-fill: uint,
		expiration-height: uint,
		salt: uint,
		risk: bool,
		stop: uint,
		timestamp: uint,
		type: uint
		}
	)
	(right-order
		{
		sender: uint,
		sender-fee: uint,
		maker: uint,
		maker-asset: uint,
		taker-asset: uint,
		maker-asset-data: uint,
		taker-asset-data: uint,
		maximum-fill: uint,
		expiration-height: uint,
		salt: uint,
		risk: bool,
		stop: uint,
		timestamp: uint,
		type: uint
		}
	)
	(left-signature (buff 65))
	(right-signature (buff 65))
	(left-oracle-data (optional { timestamp: uint, value: uint, signature: (buff 65) }))
	(right-oracle-data (optional { timestamp: uint, value: uint, signature: (buff 65) }))
	(fill (optional uint))
	)
	(let
		(
			(validation-data (try! (validate-match left-order right-order left-signature right-signature left-oracle-data right-oracle-data fill)))
			(fillable (match fill value value (get fillable validation-data)))
			(left-order-make (get left-order-make validation-data))
			(right-order-make (get right-order-make validation-data))
		)
		(map-set triggered-orders (get left-order-hash validation-data) true)
		(map-set triggered-orders (get right-order-hash validation-data) true)
		(try! (settle-order left-order (* fillable left-order-make) (get maker right-order)))
		(try! (settle-order right-order (* fillable right-order-make) (get maker left-order)))

		(try! (contract-call? .stxdx-registry set-two-order-fills (get left-order-hash validation-data) (+ (get left-order-fill validation-data) fillable) (get right-order-hash validation-data) (+ (get right-order-fill validation-data) fillable)))
		(ok 
			{ 
			fillable: fillable, 
			left-order-make: left-order-make, 
			right-order-make: right-order-make,
			left-sender-fee: (get sender-fee left-order),
			right-sender-fee: (get sender-fee right-order)
			}
		)
	)
)

(define-private (min (a uint) (b uint))
	(if (< a b) a b)
)

;; Everything below this point can be removed to optimise later.

(define-read-only (serialize-tuple-key (key (string-ascii 128)))
	(concat
		(unwrap-panic (element-at byte-list (len key)))
		(string-ascii-to-buff key)
	)
)

(define-read-only (serialize-bool (value bool))
	(if value type-id-true type-id-false)
)

(define-read-only (serialize-uint (value uint))
	(concat type-id-uint (uint128-to-buff-be value))
)

(define-read-only (serialize-buff (value (buff 256)))
	(concat
		type-id-buff
	(concat
		(uint32-to-buff-be (len value))
		value
	))
)

(define-read-only (byte-to-uint (byte (buff 1)))
	(unwrap-panic (index-of byte-list byte))
)

(define-read-only (uint-to-byte (n uint))
	(unwrap-panic (element-at byte-list (mod n u255)))
)

(define-read-only (uint128-to-buff-be (n uint))
	(concat (unwrap-panic (element-at byte-list (mod (/ n u1329227995784915872903807060280344576) u256)))
		(concat (unwrap-panic (element-at byte-list (mod (/ n u5192296858534827628530496329220096) u256)))
		(concat (unwrap-panic (element-at byte-list (mod (/ n u20282409603651670423947251286016) u256)))
		(concat (unwrap-panic (element-at byte-list (mod (/ n u79228162514264337593543950336) u256)))
		(concat (unwrap-panic (element-at byte-list (mod (/ n u309485009821345068724781056) u256)))
		(concat (unwrap-panic (element-at byte-list (mod (/ n u1208925819614629174706176) u256)))
		(concat (unwrap-panic (element-at byte-list (mod (/ n u4722366482869645213696) u256)))
		(concat (unwrap-panic (element-at byte-list (mod (/ n u18446744073709551616) u256)))
		(concat (unwrap-panic (element-at byte-list (mod (/ n u72057594037927936) u256)))
		(concat (unwrap-panic (element-at byte-list (mod (/ n u281474976710656) u256)))
		(concat (unwrap-panic (element-at byte-list (mod (/ n u1099511627776) u256)))
		(concat (unwrap-panic (element-at byte-list (mod (/ n u4294967296) u256)))
		(concat (unwrap-panic (element-at byte-list (mod (/ n u16777216) u256)))
		(concat (unwrap-panic (element-at byte-list (mod (/ n u65536) u256)))
		(concat (unwrap-panic (element-at byte-list (mod (/ n u256) u256)))
						(unwrap-panic (element-at byte-list (mod n u256)))
		)))))))))))))))
)

(define-read-only (uint32-to-buff-be (n uint))
	(concat (unwrap-panic (element-at byte-list (mod (/ n u16777216) u256)))
		(concat (unwrap-panic (element-at byte-list (mod (/ n u65536) u256)))
		(concat (unwrap-panic (element-at byte-list (mod (/ n u256) u256)))
						(unwrap-panic (element-at byte-list (mod n u256))
		))))
)

(define-private (string-ascii-to-buff-iter (c (string-ascii 1)) (a (buff 128)))
	(unwrap-panic (as-max-len? (concat a (string-ascii-to-byte c)) u128))
)

(define-read-only (string-ascii-to-buff (str (string-ascii 128)))
	(fold string-ascii-to-buff-iter str 0x)
)

(define-private (string-ascii-to-byte (c (string-ascii 1)))
	(unwrap-panic (element-at byte-list (unwrap-panic (index-of ascii-list c))))
)

(define-read-only (mul-down (a uint) (b uint))
    (/ (* a b) ONE_8)
)

(define-constant type-id-uint 0x01)
(define-constant type-id-true 0x03)
(define-constant type-id-false 0x04)
(define-constant type-id-buff 0x02)
(define-constant type-id-none 0x09)
(define-constant type-id-some 0x0a)
(define-constant type-id-tuple 0x0c)
(define-constant byte-list 0x000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f202122232425262728292a2b2c2d2e2f303132333435363738393a3b3c3d3e3f404142434445464748494a4b4c4d4e4f505152535455565758595a5b5c5d5e5f606162636465666768696a6b6c6d6e6f707172737475767778797a7b7c7d7e7f808182838485868788898a8b8c8d8e8f909192939495969798999a9b9c9d9e9fa0a1a2a3a4a5a6a7a8a9aaabacadaeafb0b1b2b3b4b5b6b7b8b9babbbcbdbebfc0c1c2c3c4c5c6c7c8c9cacbcccdcecfd0d1d2d3d4d5d6d7d8d9dadbdcdddedfe0e1e2e3e4e5e6e7e8e9eaebecedeeeff0f1f2f3f4f5f6f7f8f9fafbfcfdfeff)
(define-constant ascii-list "//////////////////////////////// !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////")


;; (register-asset .age000-governance-token)
