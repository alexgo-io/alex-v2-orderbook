(impl-trait .trait-ownable.ownable-trait)
(use-trait sip010-trait .trait-sip-010.sip-010-trait)

(define-constant ERR-NOT-AUTHORIZED (err u1000))
(define-constant ERR-INVALID-AMOUNT (err u1001))
(define-constant ERR-STAKING-NOT-ACTIVATED (err u1002))
(define-constant ERR-TOKEN-NOT-AUTHORIZED (err u1003))

(define-constant ONE_8 u100000000)
(define-constant MAX_UINT u340282366920938463463374607431768211455)

(define-data-var contract-owner principal tx-sender)

(define-read-only (get-contract-owner)
  (ok (var-get contract-owner))
)

(define-public (set-contract-owner (owner principal))
  (begin
    (try! (check-is-owner))
    (ok (var-set contract-owner owner))
  )
)

(define-private (check-is-owner)
  (ok (asserts! (is-eq tx-sender (var-get contract-owner)) ERR-NOT-AUTHORIZED))
)

(define-data-var escrowed-token principal .token-escrowed)
(define-data-var native-token principal .token-native)
(define-data-var vepower-token principal .token-vepower)

;; TODO: getter/setter for token vars

(define-data-var activation-height uint MAX_UINT)
(define-data-var total-staked-in-fixed uint u0)

(define-map stakers 
    {
        address: principal,
        token: principal
    }
    {
        staked-in-fixed: uint,
        base-height-in-fixed: uint,
		rewards-to-claim: uint,
		vepower-to-claim: uint
    }
)
;; rewards emission is expressed as % of staked-in-fixed
(define-map rewards-emission-per-height principal uint)
;; vepower emission is expressed as % of staked-in-fixed
(define-map vepower-emission-per-height principal uint)

(define-read-only (get-rewards-emission-per-height-or-default (token principal))
    (default-to u0 (map-get? rewards-emission-per-height token))
)
(define-public (set-rewards-emission-per-height (token principal) (amount uint))
    (begin 
        (try! (check-is-owner))
        (ok (map-set rewards-emission-per-height token amount))
    )
)

(define-read-only (get-vepower-emission-per-height-or-default (token principal))
    (default-to u0 (map-get? vepower-emission-per-height token))
)
(define-public (set-vepower-emission-per-height (token principal) (amount uint))
    (begin 
        (try! (check-is-owner))
        (ok (map-set vepower-emission-per-height token amount))
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

(define-read-only (get-staker-or-default (token principal) (address principal))
	(default-to 
		{ staked-in-fixed: u0, base-height-in-fixed: (- (* block-height ONE_8) ONE_8), rewards-to-claim: u0, vepower-to-claim: u0 }
		(map-get? stakers { address: address, token: token } )
	)
)

(define-public (stake (token-trait <sip010-trait>) (amount-in-fixed uint))
	(let 
		( 
            (token (contract-of token-trait))
			(staker (update-claimable token tx-sender))
			(updated-base 
				(div-down
					(+ (mul-down amount-in-fixed (* block-height ONE_8)) (mul-down (get staked-in-fixed staker) (get base-height-in-fixed staker)))
					(+ amount-in-fixed (get staked-in-fixed staker))
				)
			)
		)
        (asserts! (or (is-eq token (var-get escrowed-token)) (is-eq token (var-get native-token))) ERR-TOKEN-NOT-AUTHORIZED)
		(asserts! (>= (unwrap-panic (contract-call? token-trait get-balance-fixed tx-sender)) amount-in-fixed) ERR-INVALID-AMOUNT)
		(asserts! (> block-height (var-get activation-height)) ERR-STAKING-NOT-ACTIVATED)
        (and (> amount-in-fixed u0) (try! (contract-call? token-trait transfer-fixed amount-in-fixed tx-sender (as-contract tx-sender) none)))
		(update-escrowed-to-convert tx-sender)        
		(map-set stakers 
			{
                address: tx-sender,
                token: token 
            }
			{ 
				staked-in-fixed: (+ (get staked-in-fixed staker) amount-in-fixed), 
				base-height-in-fixed: updated-base,
                rewards-to-claim: (get rewards-to-claim staker),
                vepower-to-claim: (get vepower-to-claim staker)
			}
		)
		(var-set total-staked-in-fixed (+ (var-get total-staked-in-fixed) amount-in-fixed))
		(ok
			{ 
				staked-in-fixed: (+ (get staked-in-fixed staker) amount-in-fixed), 
				base-height-in-fixed: updated-base,
                rewards-to-claim: (get rewards-to-claim staker),
                vepower-to-claim: (get vepower-to-claim staker)
			}
        )        
	)
)

(define-public (unstake (token-trait <sip010-trait>) (amount-in-fixed uint))
	(let 
		(
            (sender tx-sender)
            (token (contract-of token-trait))            
			(staker (update-claimable token sender))
		) 
        (asserts! (or (is-eq token (var-get escrowed-token)) (is-eq token (var-get native-token))) ERR-TOKEN-NOT-AUTHORIZED)
		(asserts! (>= (get staked-in-fixed staker) amount-in-fixed) ERR-INVALID-AMOUNT)	
        (and (> amount-in-fixed u0) (as-contract (try! (contract-call? token-trait transfer-fixed amount-in-fixed tx-sender sender none))))
		(update-escrowed-to-convert sender)
		(map-set stakers 
			{
                address: sender,
                token: token 
            }
			{ 
				staked-in-fixed: (- (get staked-in-fixed staker) amount-in-fixed), 
				base-height-in-fixed: (get base-height-in-fixed staker),
				rewards-to-claim: (get rewards-to-claim staker),
				vepower-to-claim: (get vepower-to-claim staker)
			}
		)
		(var-set total-staked-in-fixed (- (var-get total-staked-in-fixed) amount-in-fixed))
		(ok
			{ 
				staked-in-fixed: (- (get staked-in-fixed staker) amount-in-fixed), 
				base-height-in-fixed: (get base-height-in-fixed staker),
				rewards-to-claim: (get rewards-to-claim staker),
				vepower-to-claim: (get vepower-to-claim staker)
			}
        )        
	)
)

(define-private (update-claimable (token principal) (address principal))
	(let 
		(
			(staker (get-staker-or-default token address))
			(claim-basis (mul-down (get staked-in-fixed staker) (- (* block-height ONE_8) ONE_8 (get base-height-in-fixed staker))))
			(rewards-to-claim (mul-down claim-basis (get-rewards-emission-per-height-or-default token)))
			(vepower-to-claim (mul-down claim-basis (get-vepower-emission-per-height-or-default token)))
		)
		(map-set stakers 
			{
                address: address,
                token: token 
            }
			{ 
				staked-in-fixed: (get staked-in-fixed staker), 
				base-height-in-fixed: (* block-height ONE_8),
				rewards-to-claim: (+ (get rewards-to-claim staker) rewards-to-claim),
				vepower-to-claim: (+ (get vepower-to-claim staker) vepower-to-claim) 
			}
		)
		
        { 
			staked-in-fixed: (get staked-in-fixed staker), 
			base-height-in-fixed: (* block-height ONE_8),
			rewards-to-claim: (+ (get rewards-to-claim staker) rewards-to-claim),
			vepower-to-claim: (+ (get vepower-to-claim staker) vepower-to-claim) 
		}					
	)
)

;; claim accrued rewards
(define-public (claim (token principal) (escrowed-token-trait <sip010-trait>) (vepower-token-trait <sip010-trait>))
	(let 
		(
			(staker (get-staker-or-default token tx-sender))
		)
        (asserts! (or (is-eq token (var-get escrowed-token)) (is-eq token (var-get native-token))) ERR-TOKEN-NOT-AUTHORIZED)
        (asserts! (is-eq (contract-of escrowed-token-trait) (var-get escrowed-token)) ERR-TOKEN-NOT-AUTHORIZED)
        (asserts! (is-eq (contract-of vepower-token-trait) (var-get vepower-token)) ERR-TOKEN-NOT-AUTHORIZED)
		(and (> (get rewards-to-claim staker) u0) (as-contract (try! (contract-call? escrowed-token-trait mint-fixed (get rewards-to-claim staker) tx-sender))))
		(and (> (get vepower-to-claim staker) u0) (as-contract (try! (contract-call? vepower-token-trait mint-fixed (get vepower-to-claim staker) tx-sender))))
		(map-set stakers 
            {
			    address: tx-sender,
                token: token
            }
			{ 
				staked-in-fixed: (get staked-in-fixed staker), 
				base-height-in-fixed: (get base-height-in-fixed staker),
				rewards-to-claim: u0,
				vepower-to-claim: u0 
			}
		)
		(ok { rewards: (get rewards-to-claim staker), vepower: (get vepower-to-claim staker) }) 
	)
)

;; locking

(define-map lockers
    principal
    {
        locked-in-fixed: uint,
        base-height-in-fixed: uint,
        escrowed-to-convert: uint
    }
)
(define-data-var total-locked-in-fixed uint u0)
(define-data-var conversion-per-height uint u0)

(define-read-only (get-conversion-per-height)
	(var-get conversion-per-height)
)

;; vepower emission is expressed as % of staked-in-fixed
(define-public (set-conversion-per-height (amount-in-fixed uint))
	(begin 
		(try! (check-is-owner))
		(ok (var-set conversion-per-height amount-in-fixed))
	)
)

(define-read-only (get-locker-or-default (address principal))
	(default-to 
		{ locked-in-fixed: u0, base-height-in-fixed: (- (* block-height ONE_8) ONE_8), escrowed-to-convert: u0 }
		(map-get? lockers address)
	)
)

(define-public (lock (escrowed-token-trait <sip010-trait>) (amount-in-fixed uint))
	(let 
		( 
			(locker (update-escrowed-to-convert tx-sender))
			(updated-base 
				(div-down
					(+ (mul-down amount-in-fixed (* block-height ONE_8)) (mul-down (get locked-in-fixed locker) (get base-height-in-fixed locker)))
					(+ amount-in-fixed (get locked-in-fixed locker))
				)
			)
			(updated-locked (+ (get locked-in-fixed locker) amount-in-fixed))
		)
        (asserts! (is-eq (contract-of escrowed-token-trait) (var-get escrowed-token)) ERR-TOKEN-NOT-AUTHORIZED)
		(asserts! (>= (unwrap-panic (contract-call? escrowed-token-trait get-balance-fixed tx-sender)) amount-in-fixed) ERR-INVALID-AMOUNT)
		(asserts! (> block-height (var-get activation-height)) ERR-STAKING-NOT-ACTIVATED)		
        (and (> amount-in-fixed u0) (try! (contract-call? escrowed-token-trait transfer-fixed amount-in-fixed tx-sender (as-contract tx-sender) none)))
		(map-set lockers 
            tx-sender 
            { 
                locked-in-fixed: updated-locked, 
                base-height-in-fixed: updated-base, 
                escrowed-to-convert: (get escrowed-to-convert locker) 
            }
        )
		(var-set total-locked-in-fixed (+ (var-get total-locked-in-fixed) amount-in-fixed))
		(ok 
            { 
                locked-in-fixed: updated-locked, 
                base-height-in-fixed: updated-base, 
                escrowed-to-convert: (get escrowed-to-convert locker) 
            }
        )        	
	)
)

(define-public (unlock (escrowed-token-trait <sip010-trait>) (amount-in-fixed uint))
	(let 
		(
            (sender tx-sender)
			(locker (update-escrowed-to-convert sender))
		) 
        (asserts! (is-eq (contract-of escrowed-token-trait) (var-get escrowed-token)) ERR-TOKEN-NOT-AUTHORIZED)
		(asserts! (>= (get locked-in-fixed locker) amount-in-fixed) ERR-INVALID-AMOUNT)
        (and (> amount-in-fixed u0) (as-contract (try! (contract-call? escrowed-token-trait transfer-fixed amount-in-fixed tx-sender sender none))))
		(map-set lockers 
			sender
			{
				locked-in-fixed: (- (get locked-in-fixed locker) amount-in-fixed),
				base-height-in-fixed: (get base-height-in-fixed locker),
                escrowed-to-convert: (get escrowed-to-convert locker)
			}
		)
		(var-set total-locked-in-fixed (- (var-get total-locked-in-fixed) amount-in-fixed))
		(ok
			{
				locked-in-fixed: (- (get locked-in-fixed locker) amount-in-fixed),
				base-height-in-fixed: (get base-height-in-fixed locker),
                escrowed-to-convert: (get escrowed-to-convert locker)
			}
        )        
	)
)

(define-private (update-escrowed-to-convert (address principal))
	(let 
		(
			(escrowed-staker (get-staker-or-default (var-get escrowed-token) address))
			(native-staker (get-staker-or-default (var-get native-token) address))
			(total-staked (+ (get staked-in-fixed native-staker) (get staked-in-fixed escrowed-staker)))
			(locker (get-locker-or-default address))
			(eligible-amount (if (<= (get locked-in-fixed locker) total-staked) (get locked-in-fixed locker) total-staked))
			(escrowed-to-convert (mul-down (var-get conversion-per-height) (mul-down eligible-amount (- (* block-height ONE_8) ONE_8 (get base-height-in-fixed locker)))))
		)
		(map-set lockers 
			address
			{
				locked-in-fixed: (get locked-in-fixed locker),
				base-height-in-fixed: (* block-height ONE_8),
                escrowed-to-convert: (+ (get escrowed-to-convert locker) escrowed-to-convert)
			}
		)

		{
			locked-in-fixed: (get locked-in-fixed locker),
			base-height-in-fixed: (* block-height ONE_8),
               escrowed-to-convert: (+ (get escrowed-to-convert locker) escrowed-to-convert)
		}        
	)
)

;; claim accrued rewards from, and including, base-height-in-fixed to, but excluding, current block-height
(define-public (convert (escrowed-token-trait <sip010-trait>) (native-token-trait <sip010-trait>))
	(let 
		(
			(sender tx-sender)
			(locker (get-locker-or-default sender))
		)
        (asserts! (is-eq (contract-of escrowed-token-trait) (var-get escrowed-token)) ERR-TOKEN-NOT-AUTHORIZED)
        (asserts! (is-eq (contract-of native-token-trait) (var-get native-token)) ERR-TOKEN-NOT-AUTHORIZED)        
		(and (> (get escrowed-to-convert locker) u0) (as-contract (try! (contract-call? escrowed-token-trait burn-fixed (get escrowed-to-convert locker) sender))))
		(and (> (get escrowed-to-convert locker) u0) (as-contract (try! (contract-call? native-token-trait mint-fixed (get escrowed-to-convert locker) sender))))
		(map-set lockers 
			sender
			{
				locked-in-fixed: (get locked-in-fixed locker),
				base-height-in-fixed: (get base-height-in-fixed locker),
                escrowed-to-convert: u0
			}
		)
		(ok
			{
				locked-in-fixed: (get locked-in-fixed locker),
				base-height-in-fixed: (get base-height-in-fixed locker),
                escrowed-to-convert: u0
			}
        )        
	)
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

