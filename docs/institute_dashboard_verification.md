# Institute Dashboard Verification

The repaired Institute Dashboard loads the persisted Firestore challenge ledger rather than the old static rows. Its initial state displayed 50 synthetic challenge records, 25 active assignments, 12 in-progress records, and the accurate pagination summary `Showing 1 to 8 of 50 challenges`.

The browser Next Page control was activated to verify the second page of the persisted ledger before final route validation.

The updated ledger rendered page two as `Showing 9 to 16 of 50 challenges`, with a different set of persisted challenge records. The Status filter was then changed to `Assigned`, which reset the ledger to page one and rendered exactly eight assigned Firestore records with the accurate summary `Showing 1 to 8 of 8 challenges`.
