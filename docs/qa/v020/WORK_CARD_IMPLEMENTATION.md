# PROGRAMM — Work cards integrated, QA v0.20.0-qa1

Status: experimental balance; game source at main after QA and CI gate. QA research PR #28 contains candidate rates and four-player 2000-game comparison, not actual live game code.

## Implemented model

24 shuffled parcel-linked cards without repeats until all 24 are drawn, on five existing Work ring squares; all 24 parcel IDs stable with 11x7 board.
Empty parcel or owned without project: city pays drawer 155/175/195/210/225/250 (J1/RET/PK/OD/JK4/UNIQUE), in thousands.
Construction stages 1-3: owner pays drawer 35/65/100 according to project size; paired reservedFor parcel inherits primary project.
Commissioned property with tenant: drawer pays owner 80% of effective tenantIncomeForLot, capped at 125. Regular rental payout at START remains unchanged.
Commissioned without tenant: city pays drawer 55% base. Externally sold plot: city pays 85% base. Same payer and receiver: no private cash movement.
Previous unconditional salary Work event is replaced, not compounded.

## Debt and savings

Peer payments transfer only real available cash; unpaid portion persists with debtor, creditor, reason, parcel ID, and outstanding amount. Outstanding debt is repaid from available cash when debtor later completes a turn. No phantom income is recognized. The deck, city sold flag, debt ledger and transaction totals live in state.workEconomy and survive localStorage save/restore.
Only confirmed external completed-object sales (including investor auto-sale) count as city-sold. Player-to-player sales and bankruptcy do not. On new ownership the flag clears. Prior saves lacking the schema receive a new Work deck, but old external sale history cannot be reconstructed.

## Test and approval gates

New browser test checks city/build/rent/sold/commissioned-vacant states, paired lots, exact private cash conservation, partial payments, debt repayment, full deck cycle, save/restore and 32 ring/24 lot preservation.
Actual 1000-game Node VM suite imports the production work module; this must pass alongside financial regression and Chromium campaigns before merge.
Separate preview URL /developer-web/previews/v020-qa/; unchanged v0.18 stable root and pinned rectangular RC1 /developer-web/previews/v0181-rc1/.

## Known QA decisions pending

Numerical rates, the new fifth ready-vacant case, and payoff rules are provisional. Four-player candidate results do not establish balance for 3/5/6 or real humans. The municipal net-worth scoring does not yet subtract Work payables / add receivables. No physical Android testing or final balance acceptance has been performed. Do not label stable.
