# SimpleTexasHoldem Smart Contract

A production-ready Solidity implementation of a simplified Texas Hold'em poker game with complete game logic, security features, and flexible configuration.

## 📁 Files

1. **SimpleTexasHoldem.sol** - Main contract (game management, player actions, pot distribution)
2. **PokerHandEvaluator.sol** - Library for poker hand evaluation (modular and reusable)

## 🎮 Game Flow

### 1. Owner Starts Game
```solidity
startGame(3600) // Start 1-hour game
```

### 2. Players Join
```solidity
joinGame() // Receive 2 hole cards
```

### 3. Players Choose
- **Option A**: `fold()` - Quit and return cards
- **Option B**: `placeBet(amount)` - Commit to game

### 4. Owner Ends Game
```solidity
endGame() // Calculate results and distribute pot
```

## 🔑 Key Features

### ✅ Security
- **OpenZeppelin Libraries**: Ownable, ReentrancyGuard, SafeERC20
- **Owner-only game management**: Only owner can start/end games
- **Participation limits**: Max 50 join attempts per game (prevents storage bloat)
- **Time-based restrictions**: 5-minute join cutoff before game end
- **Emergency pause**: Owner can pause contract in emergencies

### ✅ Card Management
- **Card pool with reuse**: Cards return to pool when players fold
- **Minimum card requirement**: Denies joins if < 7 cards remain
- **Efficient tracking**: `bool[52]` array + counter for O(1) operations
- **No re-joining**: Players can't rejoin after folding

### ✅ Game Logic
- **Pot calculation**: `minBet × numberOfPlayers`
- **Excess bet returns**: Players get back `(betAmount - minBet)`
- **House fee**: 1% of pot goes to contract owner
- **Winner determination**: Full Texas Hold'em hand evaluation
- **Tie handling**: Pot split equally among tied winners

### ✅ Flexibility
- **Token support**: ETH or any ERC20 token
- **Configurable storage**: Toggle detailed records on/off
- **Comprehensive events**: All game actions logged
- **View functions**: Query game state, player info, eligibility

## 📊 Data Structures

### Player (Only Betting Players Stored)
```solidity
struct Player {
    uint8[2] holeCards;
    uint256 betAmount;
    bool hasBet;
}
```

### Game State
```solidity
struct Game {
    uint256 gameId;
    uint256 startTime;
    uint256 endTime;
    
    mapping(address => Player) players;        // Active betting players
    mapping(address => bool) hasParticipated;  // Prevent re-joining
    address[] playerAddresses;
    
    bool[52] cardsInUse;                       // Card pool
    uint8 cardsRemaining;
    
    uint8[5] boardCards;
    bool boardCardsDealt;
    bool gameEnded;
    
    address[] winners;
    uint256 totalPot;
    uint256 houseFee;
}
```

### Game Record (Optional Storage)
```solidity
struct GameRecord {
    uint256 gameId;
    uint256 startTime;
    uint256 endTime;
    address[] players;
    uint256[] betAmounts;
    uint8[5] boardCards;
    address[] winners;
    uint256 potPerWinner;
    uint256 houseFee;
}
```

## 🃏 Card Representation

### Card Index (0-51)
- **Rank**: `cardIndex % 13` → 0-12 (represents 2-Ace)
  - Add 2 to get actual rank (2-14, where 14 is Ace)
- **Suit**: `cardIndex / 13` → 0-3
  - 0 = Clubs, 1 = Diamonds, 2 = Hearts, 3 = Spades

### Examples
```
Card 0  = 2 of Clubs
Card 12 = Ace of Clubs
Card 13 = 2 of Diamonds
Card 51 = Ace of Spades
```

## 🏆 Poker Hand Rankings

From lowest to highest:
0. High Card
1. One Pair
2. Two Pair
3. Three of a Kind
4. Straight
5. Flush
6. Full House
7. Four of a Kind
8. Straight Flush

## 🔒 Join Conditions

A player can join if ALL of the following are true:
1. ✅ Game is active
2. ✅ Contract not paused
3. ✅ Player hasn't participated in this game
4. ✅ Total participations < 50 (MAX_TOTAL_PLAYERS)
5. ✅ Cards remaining >= 7
6. ✅ Current time < endTime - 5 minutes
7. ✅ Game hasn't ended

Use `canPlayerJoin(address)` to check eligibility with reason.

## 📡 Events

```solidity
event GameStarted(uint256 indexed gameId, uint256 startTime, uint256 endTime);
event PlayerJoined(uint256 indexed gameId, address indexed player, uint8[2] holeCards);
event PlayerFolded(uint256 indexed gameId, address indexed player, uint8[2] returnedCards);
event PlayerBet(uint256 indexed gameId, address indexed player, uint256 amount);
event BoardCardsDealt(uint256 indexed gameId, uint8[5] boardCards);
event GameEnded(
    uint256 indexed gameId, 
    address[] winners, 
    uint256 potPerWinner,
    uint256 houseFee,
    address[] allPlayers,
    uint256[] betAmounts
);
event HouseFeeWithdrawn(address indexed owner, uint256 amount);
```

## 🎯 Usage Examples

### Deploy Contract (ETH)
```solidity
SimpleTexasHoldem game = new SimpleTexasHoldem(
    address(0),  // Use ETH
    true         // Store detailed records
);
```

### Deploy Contract (ERC20)
```solidity
SimpleTexasHoldem game = new SimpleTexasHoldem(
    0x...,  // ERC20 token address
    false   // Events only (save gas)
);
```

### Owner: Start Game
```solidity
game.startGame(3600); // 1 hour game
```

### Player: Join Game
```solidity
game.joinGame();
```

### Player: Place Bet (ETH)
```solidity
game.placeBet{value: 1 ether}(0);
```

### Player: Place Bet (ERC20)
```solidity
token.approve(address(game), 100);
game.placeBet(100);
```

### Player: Fold
```solidity
game.fold();
```

### Owner: End Game
```solidity
game.endGame();
```

### Owner: Withdraw House Fees
```solidity
game.withdrawHouseFees();
```

## 🔍 View Functions

```solidity
// Get game info
(uint256 gameId, uint256 startTime, uint256 endTime, 
 uint256 playerCount, uint256 totalParticipations,
 uint256 cardsRemaining, bool isActive, bool hasEnded) 
    = game.getCurrentGameInfo();

// Get player info
(bool hasParticipated, bool hasBet, uint256 betAmount, uint8[2] holeCards)
    = game.getPlayerInfo(playerAddress);

// Check if can join
(bool canJoin, string reason) = game.canPlayerJoin(playerAddress);

// Get board cards
(uint8[5] boardCards, bool dealt) = game.getBoardCards();

// Get all players
address[] players = game.getGamePlayers();
```

## ⚠️ Important Notes

### 🔴 CRITICAL - Randomness
The contract uses **pseudo-random number generation** which is **NOT SECURE** for production!

**For production, you MUST integrate Chainlink VRF:**
```solidity
// Replace _getRandomCard() with Chainlink VRF
function requestRandomCards() external {
    requestId = COORDINATOR.requestRandomWords(/*...*/);
}

function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords) internal override {
    // Use randomWords to deal cards
}
```

### Security Considerations
1. **Front-running**: Players can see pending transactions in mempool
   - Mitigation: Use commit-reveal scheme or private transactions
2. **Block timestamp manipulation**: Miners can manipulate `block.timestamp` by ~15 seconds
   - Impact: Minimal for hourly games, but be aware
3. **Gas optimization**: Large games (9 players) will consume significant gas
   - Consider gas limits when ending games

### Game Cancellation
If fewer than 2 players bet when `endGame()` is called:
- All bets are returned to players
- No pot distribution occurs
- Game ends without winners

## 📋 Testing Checklist

- [ ] Deploy with ETH and ERC20 tokens
- [ ] Test join conditions (all 7 scenarios)
- [ ] Test card pool exhaustion (50 joins)
- [ ] Test fold and card reuse
- [ ] Test pot calculation with various bet amounts
- [ ] Test all poker hand rankings
- [ ] Test tied winners (pot split)
- [ ] Test game cancellation (< 2 players)
- [ ] Test emergency pause
- [ ] Test house fee withdrawal
- [ ] Test detailed records toggle
- [ ] Verify all events are emitted correctly
- [ ] Gas cost analysis for max players (9)

## 🚀 Deployment Steps

1. **Deploy PokerHandEvaluator library**
2. **Link library to SimpleTexasHoldem** (or include in same file)
3. **Deploy SimpleTexasHoldem** with token address and storage preference
4. **Verify contracts on block explorer**
5. **Transfer ownership** if needed
6. **Test on testnet** before mainnet deployment

## 💡 Future Enhancements

- [ ] Integrate Chainlink VRF for secure randomness
- [ ] Add blinds system (small/big blind)
- [ ] Multi-round betting (pre-flop, flop, turn, river)
- [ ] Player reputation/stats system
- [ ] Tournament mode (multiple games, elimination)
- [ ] NFT integration (special cards, achievements)
- [ ] Governance token for house fee distribution

## 📄 License

MIT License

## 🙏 Acknowledgments

Built with:
- OpenZeppelin Contracts v5.x
- Solidity ^0.8.20
- Standard Texas Hold'em rules

---

**Ready for testing on local/testnet!** 🎲🃏
