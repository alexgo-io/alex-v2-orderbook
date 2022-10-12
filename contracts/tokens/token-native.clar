(impl-trait .trait-ownable.ownable-trait)
(impl-trait .trait-sip-010.sip-010-trait)

(define-constant ERR-NOT-AUTHORIZED (err u1000))
(define-constant ERR-TRANSFER-FAILED (err u1001))

(define-fungible-token native-token)

(define-data-var contract-owner principal tx-sender)
(define-map approved-contracts principal bool)

(define-data-var token-name (string-ascii 32) "native-token")
(define-data-var token-symbol (string-ascii 10) "nToken")
(define-data-var token-uri (optional (string-utf8 256)) (some u"https://cdn.alexlab.co/metadata/native-token.json"))

(define-data-var token-decimals uint u8)
(define-data-var transferrable bool true)

(define-read-only (get-transferrable)
	(ok (var-get transferrable))
)

(define-public (set-transferrable (new-transferrable bool))
	(begin 
		(try! (check-is-owner))
		(ok (var-set transferrable new-transferrable))
	)
)

(define-read-only (get-contract-owner)
  (ok (var-get contract-owner))
)

(define-public (set-contract-owner (owner principal))
  (begin
    (try! (check-is-owner))
    (ok (var-set contract-owner owner))
  )
)

;; --- Authorisation check

(define-private (check-is-owner)
  (ok (asserts! (is-eq tx-sender (var-get contract-owner)) ERR-NOT-AUTHORIZED))
)

(define-private (check-is-approved)
  (ok (asserts! (default-to false (map-get? approved-contracts tx-sender)) ERR-NOT-AUTHORIZED))
)

;; Other

(define-public (set-name (new-name (string-ascii 32)))
	(begin
		(try! (check-is-owner))
		(ok (var-set token-name new-name))
	)
)

(define-public (set-symbol (new-symbol (string-ascii 10)))
	(begin
		(try! (check-is-owner))
		(ok (var-set token-symbol new-symbol))
	)
)

(define-public (set-decimals (new-decimals uint))
	(begin
		(try! (check-is-owner))
		(ok (var-set token-decimals new-decimals))
	)
)

(define-public (set-token-uri (new-uri (optional (string-utf8 256))))
	(begin
		(try! (check-is-owner))
		(ok (var-set token-uri new-uri))
	)
)

(define-public (add-approved-contract (new-approved-contract principal))
	(begin
		(try! (check-is-owner))
		(ok (map-set approved-contracts new-approved-contract true))
	)
)

(define-public (set-approved-contract (owner principal) (approved bool))
	(begin
		(try! (check-is-owner))
		(ok (map-set approved-contracts owner approved))
	)
)

;; --- Public functions

;; sip010-ft-trait

(define-public (transfer (amount uint) (sender principal) (recipient principal) (memo (optional (buff 34))))
    (begin
        (asserts! (var-get transferrable) ERR-TRANSFER-FAILED)
        (asserts! (is-eq sender tx-sender) ERR-NOT-AUTHORIZED)        
        (try! (ft-transfer? native-token amount sender recipient))
        (match memo to-print (print to-print) 0x)
        (ok true)
    )
)

(define-read-only (get-name)
	(ok (var-get token-name))
)

(define-read-only (get-symbol)
	(ok (var-get token-symbol))
)

(define-read-only (get-decimals)
	(ok (var-get token-decimals))
)

(define-read-only (get-balance (who principal))
	(ok (ft-get-balance native-token who))
)

(define-read-only (get-total-supply)
	(ok (ft-get-supply native-token))
)

(define-read-only (get-token-uri)
	(ok (var-get token-uri))
)

;; --- Protocol functions

(define-constant ONE_8 u100000000)

;; @desc mint
;; @restricted ContractOwner/Approved Contract
;; @params token-id
;; @params amount
;; @params recipient
;; @returns (response bool)
(define-public (mint (amount uint) (recipient principal))
	(begin		
		(asserts! (or (is-ok (check-is-approved)) (is-ok (check-is-owner))) ERR-NOT-AUTHORIZED)
		(ft-mint? native-token amount recipient)
	)
)

;; @desc burn
;; @restricted ContractOwner/Approved Contract
;; @params token-id
;; @params amount
;; @params sender
;; @returns (response bool)
(define-public (burn (amount uint) (sender principal))
	(begin
		(asserts! (or (is-ok (check-is-approved)) (is-ok (check-is-owner))) ERR-NOT-AUTHORIZED)
		(ft-burn? native-token amount sender)
	)
)

;; @desc pow-decimals
;; @returns uint
(define-private (pow-decimals)
  (pow u10 (unwrap-panic (get-decimals)))
)

;; @desc fixed-to-decimals
;; @params amount
;; @returns uint
(define-read-only (fixed-to-decimals (amount uint))
  (/ (* amount (pow-decimals)) ONE_8)
)

;; @desc decimals-to-fixed 
;; @params amount
;; @returns uint
(define-private (decimals-to-fixed (amount uint))
  (/ (* amount ONE_8) (pow-decimals))
)

;; @desc get-total-supply-fixed
;; @params token-id
;; @returns (response uint)
(define-read-only (get-total-supply-fixed)
  (ok (decimals-to-fixed (unwrap-panic (get-total-supply))))
)

;; @desc get-balance-fixed
;; @params token-id
;; @params who
;; @returns (response uint)
(define-read-only (get-balance-fixed (account principal))
  (ok (decimals-to-fixed (unwrap-panic (get-balance account))))
)

;; @desc transfer-fixed
;; @params token-id
;; @params amount
;; @params sender
;; @params recipient
;; @returns (response bool)
(define-public (transfer-fixed (amount uint) (sender principal) (recipient principal) (memo (optional (buff 34))))
  (transfer (fixed-to-decimals amount) sender recipient memo)
)

;; @desc mint-fixed
;; @params token-id
;; @params amount
;; @params recipient
;; @returns (response bool)
(define-public (mint-fixed (amount uint) (recipient principal))
  (mint (fixed-to-decimals amount) recipient)
)

;; @desc burn-fixed
;; @params token-id
;; @params amount
;; @params sender
;; @returns (response bool)
(define-public (burn-fixed (amount uint) (sender principal))
  (burn (fixed-to-decimals amount) sender)
)

(define-private (mint-fixed-many-iter (item {amount: uint, recipient: principal}))
	(mint-fixed (get amount item) (get recipient item))
)

(define-public (mint-fixed-many (recipients (list 200 {amount: uint, recipient: principal})))
	(begin
		(asserts! (or (is-ok (check-is-approved)) (is-ok (check-is-owner))) ERR-NOT-AUTHORIZED)
		(ok (map mint-fixed-many-iter recipients))
	)
)

;; staking

(define-constant ERR-INVALID-AMOUNT (err u2000))
(define-constant ERR-STAKING-NOT-ACTIVATED (err u2001))

(define-constant MAX_UINT u340282366920938463463374607431768211455)

(define-map stakers 
    principal
    {
        staked-in-fixed: uint,
        base-height-in-fixed: uint,
		locked-in-fixed: uint
    }
)
(define-data-var rewards-emission-per-height uint u0)
(define-data-var vepower-emission-per-height uint u0)
(define-data-var activation-height uint MAX_UINT)
(define-data-var total-staked-in-fixed uint u0)
(define-data-var total-locked-in-fixed uint u0)

(define-map approved-lockers principal bool)

(define-public (set-approved-locker (address principal) (approved bool))
	(begin 
		(try! (check-is-owner))
		(ok (map-set approved-lockers address approved))
	)
)

(define-private (check-is-approved-locker)
  (ok (asserts! (default-to false (map-get? approved-lockers tx-sender)) ERR-NOT-AUTHORIZED))
)

(define-public (lock-staked (address principal) (amount-in-fixed uint))
	(let 
		(
			(staker (get-staker-or-default address))
		) 
		(try! (check-is-approved-locker))
		(asserts! (<= amount-in-fixed (- (get staked-in-fixed staker) (get locked-in-fixed staker))) ERR-INVALID-AMOUNT)
		(map-set stakers 
			address
			{
				staked-in-fixed: (get staked-in-fixed staker),
				base-height-in-fixed: (get base-height-in-fixed staker),
				locked-in-fixed: (+ (get locked-in-fixed staker) amount-in-fixed)
			}
		)
		(var-set total-locked-in-fixed (+ (var-get total-locked-in-fixed) amount-in-fixed))
		(ok (+ (get locked-in-fixed staker) amount-in-fixed))
	)
)

(define-public (unlock-staked (address principal) (amount-in-fixed uint))
	(let 
		(
			(staker (get-staker-or-default address))
		) 
		(try! (check-is-approved-locker))
		(asserts! (<= amount-in-fixed (get locked-in-fixed staker)) ERR-INVALID-AMOUNT)
		(map-set stakers 
			address
			{
				staked-in-fixed: (get staked-in-fixed staker),
				base-height-in-fixed: (get base-height-in-fixed staker),
				locked-in-fixed: (- (get locked-in-fixed staker) amount-in-fixed)
			}
		)
		(var-set total-locked-in-fixed (- (var-get total-locked-in-fixed) amount-in-fixed))
		(ok (- (get locked-in-fixed staker) amount-in-fixed))
	)
)

(define-public (set-activation-height (height uint))
	(begin 
		(try! (check-is-owner))
		(ok (var-set activation-height height))
	)
)

(define-read-only (get-total-staked-in-fixed)
	(var-get total-staked-in-fixed)
)

(define-read-only (get-staker-or-default (address principal))
	(default-to 
		{ staked-in-fixed: u0, base-height-in-fixed: (- (* block-height ONE_8) ONE_8), locked-in-fixed: u0 }
		(map-get? stakers address)
	)
)

(define-public (stake (amount-in-fixed uint))
	(let 
		( 
			(staker (get-staker-or-default tx-sender))
			(updated-base 
				(div-down
					(+ (mul-down amount-in-fixed (* block-height ONE_8)) (mul-down (get staked-in-fixed staker) (get base-height-in-fixed staker)))
					(+ amount-in-fixed (get staked-in-fixed staker))
				)
			)
			(updated-staked (+ (get staked-in-fixed staker) amount-in-fixed))			
		)
		(asserts! (>= (unwrap-panic (get-balance-fixed tx-sender)) amount-in-fixed) ERR-INVALID-AMOUNT)
		(asserts! (> block-height (var-get activation-height)) ERR-STAKING-NOT-ACTIVATED)
		(map-set stakers tx-sender { staked-in-fixed: updated-staked, base-height-in-fixed: updated-base, locked-in-fixed: (get locked-in-fixed staker) })
		(var-set total-staked-in-fixed (+ (var-get total-staked-in-fixed) amount-in-fixed))
		(ok { staked-in-fixed: updated-staked, base-height-in-fixed: updated-base })	
	)
)

(define-public (unstake (amount-in-fixed uint))
	(let 
		(
			(staker (get-staker-or-default tx-sender))
		) 
		(asserts! (>= (- (get staked-in-fixed staker) (get locked-in-fixed staker)) amount-in-fixed) ERR-INVALID-AMOUNT)
		(try! (claim))
		(map-set stakers tx-sender { staked-in-fixed: (- (get staked-in-fixed staker) amount-in-fixed), base-height-in-fixed: (get base-height-in-fixed staker), locked-in-fixed: (get locked-in-fixed staker) })
		(var-set total-staked-in-fixed (- (var-get total-staked-in-fixed) amount-in-fixed))
		(ok (- (get staked-in-fixed staker) amount-in-fixed))
	)
)

;; claim accrued rewards from, and including, base-height-in-fixed to, but excluding, current block-height
(define-public (claim)
	(let 
		(
			(staker (get-staker-or-default tx-sender))
			(mint-basis (mul-down (get staked-in-fixed staker) (- (* block-height ONE_8) ONE_8 (get base-height-in-fixed staker))))
			(rewards-to-mint (mul-down mint-basis (var-get rewards-emission-per-height)))
			(vepower-to-mint (mul-down mint-basis (var-get vepower-emission-per-height)))
		)
		(and (> rewards-to-mint u0) (as-contract (try! (mint-fixed rewards-to-mint tx-sender))))
		(and (> vepower-to-mint u0) (as-contract (try! (contract-call? .token-vepower mint-fixed vepower-to-mint tx-sender))))
		(map-set stakers tx-sender { staked-in-fixed: (get staked-in-fixed staker), base-height-in-fixed: (* block-height ONE_8), locked-in-fixed: (get locked-in-fixed staker) })
		(ok { rewards: rewards-to-mint, vepower: vepower-to-mint }) 
	)
)

;; rewards emission is expressed as % of staked-in-fixed
(define-public (set-rewards-emission-per-height (amount-in-fixed uint))
	(begin 
		(try! (check-is-owner))
		(ok (var-set rewards-emission-per-height amount-in-fixed))
	)
)

(define-read-only (get-rewards-emission-per-height)
	(var-get rewards-emission-per-height)
)

;; vepower emission is expressed as % of staked-in-fixed
(define-public (set-vepower-emission-per-height (amount-in-fixed uint))
	(begin 
		(try! (check-is-owner))
		(ok (var-set vepower-emission-per-height amount-in-fixed))
	)
)

(define-read-only (get-vepower-emission-per-height)
	(var-get vepower-emission-per-height)
)

(define-private (mul-down (a uint) (b uint))
    (/ (* a b) ONE_8)
)

(define-private (div-down (a uint) (b uint))
  (if (is-eq a u0)
    u0
    (/ (* a ONE_8) b)
  )
)

;; contract initialisation
;; (set-contract-owner .executor-dao)