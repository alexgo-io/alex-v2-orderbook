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
(define-constant err-invalid-extra-data-type (err u3012))
(define-constant err-invalid-extra-data-length (err u3013))
(define-constant err-invalid-extra-data-key (err u3014))

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

(define-data-var sender-fee-id uint u1)

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

(define-private (hash-cancel-order (order-hash (buff 32)))
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
		maker-asset-data: (buff 256),
		taker-asset-data: (buff 256),
		maximum-fill: uint,
		expiration-height: uint,
		extra-data: (buff 256),
		salt: uint
		}
	)
	(signature (buff 65)))
	(let 
		(
			(order-hash (hash-order order))
			(cancel-hash (hash-cancel-order order-hash))
			(maker-pubkey (get maker-pubkey (try! (contract-call? .stxdx-registry user-from-id-or-fail (get maker order)))))
			(extra-data (try! (extra-data-to-tuple (get extra-data order))))
		)
		(try! (is-authorised-sender))	
		(asserts! 
			(or
				(is-eq type-order-fok (get type extra-data))
				(is-eq type-order-ioc (get type extra-data))
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
			order: { sender: uint, sender-fee: uint, maker: uint, maker-asset: uint, taker-asset: uint, maker-asset-data: (buff 256), taker-asset-data: (buff 256), maximum-fill: uint, expiration-height: uint, extra-data: (buff 256), salt: uint },
			signature: (buff 65)
		}
	))
	(cancel-order (get order one-cancel-order) (get signature one-cancel-order))
)

(define-public (cancel-order-many
	(cancel-order-list
		(list 200
			{ 
				order: { sender: uint, sender-fee: uint, maker: uint, maker-asset: uint, taker-asset: uint, maker-asset-data: (buff 256), taker-asset-data: (buff 256), maximum-fill: uint, expiration-height: uint, extra-data: (buff 256), salt: uint },
				signature: (buff 65)
			}		
		) 
	))
	(ok (map cancel-order-iter cancel-order-list))
)

(define-public (set-sender-fee-id (asset-id uint))
	(begin 
		(try! (is-contract-owner))
		(ok (var-set sender-fee-id asset-id))
	)
)

(define-read-only (get-sender-fee-id)
	(var-get sender-fee-id)
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
(define-constant serialized-key-extra-data (serialize-tuple-key "extra-data"))
(define-constant serialized-key-salt (serialize-tuple-key "salt"))
(define-constant serialized-order-header (concat type-id-tuple (uint32-to-buff-be u11)))

(define-read-only (hash-order
	(order
		{
		sender: uint,
		sender-fee: uint,
		maker: uint,
		maker-asset: uint,
		taker-asset: uint,
		maker-asset-data: (buff 256),
		taker-asset-data: (buff 256),
		maximum-fill: uint,
		expiration-height: uint,
		extra-data: (buff 256),
		salt: uint
		}
	)
	)
	(sha256
		(concat serialized-order-header

		(concat serialized-key-expiration-height
		(concat (serialize-uint (get expiration-height order))

		(concat serialized-key-extra-data
		(concat (serialize-buff (get extra-data order))

		(concat serialized-key-maker
		(concat (serialize-uint (get maker order))

		(concat serialized-key-maker-asset
		(concat (serialize-uint (get maker-asset order))

		(concat serialized-key-maker-asset-data
		(concat (serialize-buff (get maker-asset-data order))

		(concat serialized-key-maximum-fill
		(concat (serialize-uint (get maximum-fill order))

		(concat serialized-key-salt
		(concat (serialize-uint (get salt order))

		(concat serialized-key-sender
		(concat (serialize-uint (get sender order))

		(concat serialized-key-sender-fee
		(concat (serialize-uint (get sender-fee order))	
		
		(concat serialized-key-taker-asset
		(concat (serialize-uint (get taker-asset order))

		(concat serialized-key-taker-asset-data
		 		(serialize-buff (get taker-asset-data order))

		))))))))))))))))))))))
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
		maker-asset-data: (buff 256),
		taker-asset-data: (buff 256),
		maximum-fill: uint,
		expiration-height: uint,
		extra-data: (buff 256),
		salt: uint
		}
	)
	(right-order
		{
		sender: uint,
		sender-fee: uint,
		maker: uint,
		maker-asset: uint,
		taker-asset: uint,
		maker-asset-data: (buff 256),
		taker-asset-data: (buff 256),
		maximum-fill: uint,
		expiration-height: uint,
		extra-data: (buff 256),
		salt: uint
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
			(left-maker-asset-amount (try! (asset-data-to-uint (get maker-asset-data left-order))))
			(left-taker-asset-amount (try! (asset-data-to-uint (get taker-asset-data left-order))))
			(right-maker-asset-amount (try! (asset-data-to-uint (get maker-asset-data right-order))))
			(right-taker-asset-amount (try! (asset-data-to-uint (get taker-asset-data right-order))))
			(left-extra-data (try! (extra-data-to-tuple (get extra-data left-order))))
			(right-extra-data (try! (extra-data-to-tuple (get extra-data right-order))))
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
		(asserts! (< (get time left-extra-data) (get time right-extra-data)) err-invalid-timestamp)
		;; one side matches and the taker of the other side is smaller than maker.
		;; so that maker gives at most maker-asset-data, and taker takes at least taker-asset-data
		(asserts! 
			(or 
				(and ;; both maker and taker are vanilla limit orders
					(is-eq left-maker-asset-amount right-taker-asset-amount)
					(is-eq left-taker-asset-amount right-maker-asset-amount)				
				)				
				(and ;; taker (right-order) is a market-limit buyer (has to be either FOK or IOC)
					(is-eq left-maker-asset-amount right-taker-asset-amount)
					(< left-taker-asset-amount right-maker-asset-amount)
					(or (is-eq (get type right-extra-data) type-order-fok) (is-eq (get type right-extra-data) type-order-ioc))
			 	)
				(and ;; taker (right-order) is a market-limit seller (has to be either FOK or IOC)
					(is-eq left-taker-asset-amount right-maker-asset-amount)
					(> left-maker-asset-amount right-taker-asset-amount)
					(or (is-eq (get type right-extra-data) type-order-fok) (is-eq (get type right-extra-data) type-order-ioc))
				)
			)
			err-asset-data-mismatch
		)
		;; stop limit order
		(if (or (is-eq (get stop left-extra-data) u0) (is-order-triggered left-order-hash))
			true
			(let
				(
					(oracle-data (unwrap! left-oracle-data err-no-oracle-data))
					(is-buy (is-some (map-get? oracle-symbols (get taker-asset left-order))))
					(symbol (try! (get-oracle-symbol-or-fail (if is-buy (get taker-asset left-order) (get maker-asset left-order)))))
					(signer (try! (contract-call? .redstone-verify recover-signer (get timestamp oracle-data) (list {value: (get value oracle-data), symbol: symbol}) (get signature oracle-data))))
				)
				(asserts! (is-trusted-oracle signer) err-untrusted-oracle)
				(asserts! (< (get time left-extra-data) (get timestamp oracle-data)) err-invalid-timestamp)				
				(if (get risk left-extra-data) ;; it is risk-mgmt stop limit, i.e. buy on the way up (to hedge sell) or sell on the way down (to hedge buy)
					(begin
						(asserts! (if is-buy (>= (get value oracle-data) (get stop left-extra-data)) (<= (get value oracle-data) (get stop left-extra-data))) err-stop-not-triggered)
						(asserts! (or (is-eq (get type left-extra-data) type-order-fok) (is-eq (get type left-extra-data) type-order-ioc)) err-invalid-order-type)
					)
					(asserts! (if is-buy (< (get value oracle-data) (get stop left-extra-data)) (> (get value oracle-data) (get stop left-extra-data))) err-stop-not-triggered)
				)				
			)
		)	
		(if (or (is-eq (get stop right-extra-data) u0) (is-order-triggered right-order-hash))
			true
			(let
				(
					(oracle-data (unwrap! right-oracle-data err-no-oracle-data))
					(is-buy (is-some (map-get? oracle-symbols (get taker-asset right-order))))
					(symbol (try! (get-oracle-symbol-or-fail (if is-buy (get taker-asset right-order) (get maker-asset right-order)))))
					(signer (try! (contract-call? .redstone-verify recover-signer (get timestamp oracle-data) (list {value: (get value oracle-data), symbol: symbol}) (get signature oracle-data))))
				)
				(asserts! (is-trusted-oracle signer) err-untrusted-oracle)
				(asserts! (< (get time right-extra-data) (get timestamp oracle-data)) err-invalid-timestamp)				
				(if (get risk right-extra-data) ;; it is risk-mgmt stop limit, i.e. buy on the way up (to hedge sell) or sell on the way down (to hedge buy)
					(begin
						(asserts! (if is-buy (>= (get value oracle-data) (get stop right-extra-data)) (<= (get value oracle-data) (get stop right-extra-data))) err-stop-not-triggered)
						(asserts! (or (is-eq (get type right-extra-data) type-order-fok) (is-eq (get type right-extra-data) type-order-ioc)) err-invalid-order-type)
					)
					(asserts! (if is-buy (< (get value oracle-data) (get stop right-extra-data)) (> (get value oracle-data) (get stop right-extra-data))) err-stop-not-triggered)
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
			left-order-make: left-maker-asset-amount,
			right-order-make: left-taker-asset-amount,
			left-extra-data: left-extra-data,
			right-extra-data: right-extra-data
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
		maker-asset-data: (buff 256),
		taker-asset-data: (buff 256),
		maximum-fill: uint,
		expiration-height: uint,
		extra-data: (buff 256),
		salt: uint,
		}
	)
	)
	(begin
		(asserts! (is-eq (try! (contract-call? .stxdx-registry user-maker-from-id-or-fail (get maker order))) tx-sender) err-maker-not-tx-sender)
		(contract-call? .stxdx-registry set-order-approval (hash-order order) true)
	)
)

(define-private (asset-data-to-uint (asset-data (buff 256)))
	(match (as-max-len? asset-data u16) bytes (ok (contract-call? .stxdx-utils buff-to-uint bytes)) err-asset-data-too-long)
)

(define-private (settle-order
	(order
		{
		sender: uint,
		sender-fee: uint,
		maker: uint,
		maker-asset: uint,
		taker-asset: uint,
		maker-asset-data: (buff 256),
		taker-asset-data: (buff 256),
		maximum-fill: uint,
		expiration-height: uint,
		extra-data: (buff 256),
		salt: uint
		}
	)
	(amount uint)
	(taker uint)
	)
	(begin
		(as-contract (unwrap! (contract-call? .stxdx-wallet-zero transfer amount (get maker order) taker (get maker-asset order)) err-asset-contract-call-failed))
		(and
			(> (get sender-fee order) u0)
			(as-contract (unwrap! (contract-call? .stxdx-wallet-zero transfer (get sender-fee order) (get maker order) (get sender order) (var-get sender-fee-id)) err-sender-fee-payment-failed))
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
		maker-asset-data: (buff 256),
		taker-asset-data: (buff 256),
		maximum-fill: uint,
		expiration-height: uint,
		extra-data: (buff 256),
		salt: uint
		}
	)
	(right-order
		{
		sender: uint,
		sender-fee: uint,
		maker: uint,
		maker-asset: uint,
		taker-asset: uint,
		maker-asset-data: (buff 256),
		taker-asset-data: (buff 256),
		maximum-fill: uint,
		expiration-height: uint,
		extra-data: (buff 256),
		salt: uint
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
			(left-extra-data (get left-extra-data validation-data))
			(right-extra-data (get right-extra-data validation-data))
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

;; Exports a tuple of the following type (size in bracket):
;; {
;; risk (4): bool (1),
;; stop (4): uint (16)
;; time (4): uint (16),
;; type (4): uint (16),
;; }
(define-read-only (extra-data-to-tuple (extra-data (buff 256)))
	(begin
		(asserts! (is-eq (element-at extra-data u0) (some type-id-tuple)) err-invalid-extra-data-type)
		;; 4 key-value pairs
		(asserts! (is-eq (element-at extra-data u1) (some 0x00)) err-invalid-extra-data-type)
		(asserts! (is-eq (element-at extra-data u2) (some 0x00)) err-invalid-extra-data-type)
		(asserts! (is-eq (element-at extra-data u3) (some 0x00)) err-invalid-extra-data-type)
		(asserts! (is-eq (element-at extra-data u4) (some 0x04)) err-invalid-extra-data-type)

		;; key 'risk'
		(asserts! (is-eq (element-at extra-data u5) (some 0x04)) err-invalid-extra-data-type)
		(asserts! (is-eq (element-at extra-data u6) (some (string-ascii-to-byte "r"))) err-invalid-extra-data-key)
		(asserts! (is-eq (element-at extra-data u7) (some (string-ascii-to-byte "i"))) err-invalid-extra-data-key)
		(asserts! (is-eq (element-at extra-data u8) (some (string-ascii-to-byte "s"))) err-invalid-extra-data-key)
		(asserts! (is-eq (element-at extra-data u9) (some (string-ascii-to-byte "k"))) err-invalid-extra-data-key)
		;; value true/false => mapped below directly	

		;; key 'stop'
		(asserts! (is-eq (element-at extra-data u11) (some 0x04)) err-invalid-extra-data-type)
		(asserts! (is-eq (element-at extra-data u12) (some (string-ascii-to-byte "s"))) err-invalid-extra-data-key)
		(asserts! (is-eq (element-at extra-data u13) (some (string-ascii-to-byte "t"))) err-invalid-extra-data-key)
		(asserts! (is-eq (element-at extra-data u14) (some (string-ascii-to-byte "o"))) err-invalid-extra-data-key)
		(asserts! (is-eq (element-at extra-data u15) (some (string-ascii-to-byte "p"))) err-invalid-extra-data-key)
		;; value uint
		(asserts! (is-eq (element-at extra-data u16) (some type-id-uint)) err-invalid-extra-data-type)				

		;; key 'time'
		(asserts! (is-eq (element-at extra-data u33) (some 0x04)) err-invalid-extra-data-type)
		(asserts! (is-eq (element-at extra-data u34) (some (string-ascii-to-byte "t"))) err-invalid-extra-data-key)
		(asserts! (is-eq (element-at extra-data u35) (some (string-ascii-to-byte "i"))) err-invalid-extra-data-key)
		(asserts! (is-eq (element-at extra-data u36) (some (string-ascii-to-byte "m"))) err-invalid-extra-data-key)
		(asserts! (is-eq (element-at extra-data u37) (some (string-ascii-to-byte "e"))) err-invalid-extra-data-key)
		;; value uint
		(asserts! (is-eq (element-at extra-data u38) (some type-id-uint)) err-invalid-extra-data-type)

		;; key 'type'
		(asserts! (is-eq (element-at extra-data u55) (some 0x04)) err-invalid-extra-data-type)
		(asserts! (is-eq (element-at extra-data u56) (some (string-ascii-to-byte "t"))) err-invalid-extra-data-key)
		(asserts! (is-eq (element-at extra-data u57) (some (string-ascii-to-byte "y"))) err-invalid-extra-data-key)
		(asserts! (is-eq (element-at extra-data u58) (some (string-ascii-to-byte "p"))) err-invalid-extra-data-key)
		(asserts! (is-eq (element-at extra-data u59) (some (string-ascii-to-byte "e"))) err-invalid-extra-data-key)
		;; value uint
		(asserts! (is-eq (element-at extra-data u60) (some type-id-uint)) err-invalid-extra-data-type)

		(ok {
			risk: (is-eq (element-at extra-data u10) (some type-id-true)),
			stop:
				(+
					(match (element-at extra-data u17) byte (* (byte-to-uint byte) u1329227995784915872903807060280344576) u0)
					(match (element-at extra-data u18) byte (* (byte-to-uint byte) u5192296858534827628530496329220096) u0)
					(match (element-at extra-data u19) byte (* (byte-to-uint byte) u20282409603651670423947251286016) u0)
					(match (element-at extra-data u20) byte (* (byte-to-uint byte) u79228162514264337593543950336) u0)
					(match (element-at extra-data u21) byte (* (byte-to-uint byte) u309485009821345068724781056) u0)
					(match (element-at extra-data u22) byte (* (byte-to-uint byte) u1208925819614629174706176) u0)
					(match (element-at extra-data u23) byte (* (byte-to-uint byte) u4722366482869645213696) u0)					
					(match (element-at extra-data u24) byte (* (byte-to-uint byte) u18446744073709551616) u0)
					(match (element-at extra-data u25) byte (* (byte-to-uint byte) u72057594037927936) u0)
					(match (element-at extra-data u26) byte (* (byte-to-uint byte) u281474976710656) u0)
					(match (element-at extra-data u27) byte (* (byte-to-uint byte) u1099511627776) u0)
					(match (element-at extra-data u28) byte (* (byte-to-uint byte) u4294967296) u0)
					(match (element-at extra-data u29) byte (* (byte-to-uint byte) u16777216) u0)
					(match (element-at extra-data u30) byte (* (byte-to-uint byte) u65536) u0)
					(match (element-at extra-data u31) byte (* (byte-to-uint byte) u256) u0)
					(match (element-at extra-data u32) byte (byte-to-uint byte) u0)
				),					
			time:
				(+
					(match (element-at extra-data u39) byte (* (byte-to-uint byte) u1329227995784915872903807060280344576) u0)
					(match (element-at extra-data u40) byte (* (byte-to-uint byte) u5192296858534827628530496329220096) u0)
					(match (element-at extra-data u41) byte (* (byte-to-uint byte) u20282409603651670423947251286016) u0)
					(match (element-at extra-data u42) byte (* (byte-to-uint byte) u79228162514264337593543950336) u0)
					(match (element-at extra-data u43) byte (* (byte-to-uint byte) u309485009821345068724781056) u0)
					(match (element-at extra-data u44) byte (* (byte-to-uint byte) u1208925819614629174706176) u0)
					(match (element-at extra-data u45) byte (* (byte-to-uint byte) u4722366482869645213696) u0)	
					(match (element-at extra-data u46) byte (* (byte-to-uint byte) u18446744073709551616) u0)
					(match (element-at extra-data u47) byte (* (byte-to-uint byte) u72057594037927936) u0)
					(match (element-at extra-data u48) byte (* (byte-to-uint byte) u281474976710656) u0)
					(match (element-at extra-data u49) byte (* (byte-to-uint byte) u1099511627776) u0)
					(match (element-at extra-data u50) byte (* (byte-to-uint byte) u4294967296) u0)
					(match (element-at extra-data u51) byte (* (byte-to-uint byte) u16777216) u0)
					(match (element-at extra-data u52) byte (* (byte-to-uint byte) u65536) u0)
					(match (element-at extra-data u53) byte (* (byte-to-uint byte) u256) u0)
					(match (element-at extra-data u54) byte (byte-to-uint byte) u0)
				),						
			type:
				(+
					(match (element-at extra-data u61) byte (* (byte-to-uint byte) u1329227995784915872903807060280344576) u0)
					(match (element-at extra-data u62) byte (* (byte-to-uint byte) u5192296858534827628530496329220096) u0)
					(match (element-at extra-data u63) byte (* (byte-to-uint byte) u20282409603651670423947251286016) u0)
					(match (element-at extra-data u64) byte (* (byte-to-uint byte) u79228162514264337593543950336) u0)
					(match (element-at extra-data u65) byte (* (byte-to-uint byte) u309485009821345068724781056) u0)
					(match (element-at extra-data u66) byte (* (byte-to-uint byte) u1208925819614629174706176) u0)
					(match (element-at extra-data u67) byte (* (byte-to-uint byte) u4722366482869645213696) u0)	
					(match (element-at extra-data u68) byte (* (byte-to-uint byte) u18446744073709551616) u0)
					(match (element-at extra-data u69) byte (* (byte-to-uint byte) u72057594037927936) u0)
					(match (element-at extra-data u70) byte (* (byte-to-uint byte) u281474976710656) u0)
					(match (element-at extra-data u71) byte (* (byte-to-uint byte) u1099511627776) u0)
					(match (element-at extra-data u72) byte (* (byte-to-uint byte) u4294967296) u0)
					(match (element-at extra-data u73) byte (* (byte-to-uint byte) u16777216) u0)
					(match (element-at extra-data u74) byte (* (byte-to-uint byte) u65536) u0)
					(match (element-at extra-data u75) byte (* (byte-to-uint byte) u256) u0)
					(match (element-at extra-data u76) byte (byte-to-uint byte) u0)
				),			
			
		})
	)
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
