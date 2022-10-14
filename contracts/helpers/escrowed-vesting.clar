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
		{ locked-in-fixed: u0, base-height-in-fixed: (- (* block-height ONE_8) ONE_8), escrowed-to-convet: u0 }
		(map-get? lockers address)
	)
)

(define-public (update-escrowed-to-convert (address principal))
	(let 
		(
			(escrowed-staker (contract-call? .token-escrowed get-staker-or-default address))
			(native-staker (contract-call? .token-native get-staker-or-default address))
			(total-staked (+ (get staked-in-fixed native-staker) (get staked-in-fixed escrowed-staker)))
			(locker (get-locker-or-default address))
			(eligible-amount (if (<= (get locked-in-fixed locker) total-staked) (get locked-in-fixed locker) total-staked))
			(escrow-to-convert (mul-down (var-get conversion-per-height) (mul-down eligible-amount (- (* block-height ONE_8) ONE_8 (get base-height-in-fixed locker)))))
		)
		(map-set lockers 
			address
			{
				locked-in-fixed: (get locked-in-fixed locker),
				base-height-in-fixed: (* block-height ONE_8),
                escrowed-to-convert: (+ (get escrowed-to-convert locker) escrowed-to-convert)
			}
		)

		(ok
			{
				locked-in-fixed: (get locked-in-fixed locker),
				base-height-in-fixed: (* block-height ONE_8),
                escrowed-to-convert: (+ (get escrowed-to-convert locker) escrowed-to-convert)
			}        
        )
	)
)

(define-public (lock (amount-in-fixed uint))
	(let 
		( 
			(locker (unwrap-panic (update-escrowed-to-convert tx-sender)))
			(updated-base 
				(div-down
					(+ (mul-down amount-in-fixed (* block-height ONE_8)) (mul-down (get locked-in-fixed locker) (get base-height-in-fixed locker)))
					(+ amount-in-fixed (get locked-in-fixed locker))
				)
			)
			(updated-locked (+ (get locked-in-fixed locker) amount-in-fixed))
		)
		(asserts! (>= (unwrap-panic (get-balance-fixed tx-sender)) amount-in-fixed) ERR-INVALID-AMOUNT)
		(asserts! (> block-height (var-get activation-height)) ERR-STAKING-NOT-ACTIVATED)		
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

(define-public (unlock (amount-in-fixed uint))
	(let 
		(
			(locker (unwrap-panic (update-escrowed-to-convert tx-sender)))
		) 
		(asserts! (>= (get locked-in-fixed locker) amount-in-fixed) ERR-INVALID-AMOUNT)
		(map-set lockers 
			tx-sender
			{
				locked-in-fixed: (- (get locked-in-fixed locker) amount-in-fixed),
				base-height-in-fixed: (get base-height-in-fixed locker)
                escrowed-to-convert: (get escrowed-to-convert locker)
			}
		)
		(var-set total-locked-in-fixed (- (var-get total-locked-in-fixed) amount-in-fixed))
		(ok
			{
				locked-in-fixed: (- (get locked-in-fixed locker) amount-in-fixed),
				base-height-in-fixed: (get base-height-in-fixed locker)
                escrowed-to-convert: (get escrowed-to-convert locker)
			}
        )        
	)
)

;; claim accrued rewards from, and including, base-height-in-fixed to, but excluding, current block-height
(define-public (convert)
	(let 
		(
			(sender tx-sender)
			(locker (get-locker-or-default sender))
            (escrowed-to-convert (get escrowed-to-convert locker))
		)
		(and (> escrowed-to-convert u0) (as-contract (try! (contract-call? .token-escrowed burn-fixed escrowed-to-convert sender))))
		(and (> escrowed-to-convert u0) (as-contract (try! (contract-call? .token-native mint-fixed escrowed-to-convert sender))))
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