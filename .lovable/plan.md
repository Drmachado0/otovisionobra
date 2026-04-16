

## Plan: Fix Negative Value Validation Feedback (MEL-002)

### Root Cause
The `<Input>` has `min="0.01"` which triggers native browser validation for negative values. This silently blocks form submission **before** the custom `handleSubmit` runs — so `setValorError` never executes and no visual feedback appears.

### Fix
In `src/pages/FluxoCaixaPage.tsx` line 311:
- Remove the `min="0.01"` attribute from the number input
- The custom JS validation (`numVal <= 0`) already handles zero and negative values correctly with proper visual feedback

### Files
| File | Change |
|------|--------|
| `src/pages/FluxoCaixaPage.tsx` | Remove `min="0.01"` from the Valor input (line 311) |

One-line change. No other behavior affected.

