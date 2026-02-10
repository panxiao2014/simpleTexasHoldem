# Storage Layout Optimization

## Before Optimization (6 slots):

```
Slot 0: [useETH: 1 byte] [unused: 31 bytes]
Slot 1: [gameToken: 20 bytes] [unused: 12 bytes]
Slot 2: [currentGameId: 32 bytes]
Slot 3: [gameActive: 1 byte] [unused: 31 bytes]
Slot 4: [storeDetailedRecords: 1 byte] [unused: 31 bytes]
Slot 5: [accumulatedHouseFees: 32 bytes]
Slot 6: [nonce: 32 bytes]
Slot 7: [paused: 1 byte] [unused: 31 bytes]

Total: 8 slots = 256 bytes
Wasted: ~124 bytes
```

## After Optimization (5 slots):

```
Slot 0: [useETH: 1 byte] [gameActive: 1 byte] [storeDetailedRecords: 1 byte] [paused: 1 byte] [unused: 28 bytes]
Slot 1: [gameToken: 20 bytes] [unused: 12 bytes]
Slot 2: [currentGameId: 32 bytes]
Slot 3: [accumulatedHouseFees: 32 bytes]
Slot 4: [nonce: 32 bytes]

Total: 5 slots = 160 bytes
Wasted: ~40 bytes
```

## Gas Savings:

### Deployment:
- **Before**: 8 SSTORE operations (8 × 20,000 gas) = 160,000 gas
- **After**: 5 SSTORE operations (5 × 20,000 gas) = 100,000 gas
- **Savings**: ~60,000 gas on deployment

### Runtime (per state change):
- Changing multiple booleans in same transaction:
  - **Before**: Multiple SSTORE (20,000 gas each)
  - **After**: Single SSTORE (20,000 gas total if booleans in same slot)
  - **Savings**: Up to 60,000 gas per transaction

### Example Scenario:
```solidity
// togglePause() - changes paused
// Before: 1 SSTORE to slot 7 = 20,000 gas
// After: 1 SSTORE to slot 0 = 20,000 gas
// (No difference for single boolean)

// Hypothetical: Change paused AND gameActive
// Before: 2 SSTORE (slots 3, 7) = 40,000 gas
// After: 1 SSTORE (slot 0 only) = 20,000 gas
// Savings: 20,000 gas
```

## Best Practices Applied:

1. ✅ **Group booleans together** - All 4 booleans in first slot
2. ✅ **Place address types together** - gameToken (20 bytes) gets own slot
3. ✅ **uint256 variables separate** - Can't pack with smaller types efficiently
4. ✅ **Order by access patterns** - Frequently accessed together → same slot

## Additional Notes:

- **Storage slots cost**: Each 32-byte slot
- **First write (zero→non-zero)**: 20,000 gas
- **Subsequent writes**: 5,000 gas (warm) or 2,900 gas (same value)
- **Reading**: 100 gas (warm) or 2,100 gas (cold)

## Packing Rules:

- Each storage slot = 32 bytes
- Variables packed left-to-right in declaration order
- Pack only if total ≤ 32 bytes
- uint256 always takes full slot (can't pack)
- address = 20 bytes (can pack with uint96 or smaller)
- bool = 1 byte (can pack with others)

## Current Contract Storage Summary:

| Slot | Variables | Size | Packed? |
|------|-----------|------|---------|
| 0 | useETH, gameActive, storeDetailedRecords, paused | 4 bytes | ✅ Yes |
| 1 | gameToken | 20 bytes | ❌ No (address alone) |
| 2 | currentGameId | 32 bytes | ❌ No (uint256 alone) |
| 3 | accumulatedHouseFees | 32 bytes | ❌ No (uint256 alone) |
| 4 | nonce | 32 bytes | ❌ No (uint256 alone) |

**Total Storage**: 5 slots (160 bytes)

This is optimal given our variable types!
