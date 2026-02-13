# Simplified Texas hold'em implemented by smart contract

## Players

Each game can have 2 to 9 players.

## Rules

When game begins, a player receives two hole cards. Then he has two choices:

1. Fold. That is, quit the game.
2. Bet. Sepcify the amount of tokens he wants to bet, and then wait for the final result.

If there are less than 2 players in the game, game ends immdiately, player's betting tokens will return to them.

After each player finishes betting, five board cards will be dealt. Every player's strongest five-card hand is automatically determined by using each one's two hole cards and five board cards.

## Poker hand rankings

Ranking of players five-card hand should follow the ranking rules in game of Texas hold'em. Refer to [this page](https://www.poker.org/poker-hands-ranking-chart/).

## Pot allocation

The total amount of tokens in the pot is the lowest betting tokens multiplies number of players. For example:

Four players are in the game, with betting tokens of 3, 2, 3, 5. Then the total tokens in the pot is 2*4=8. The additional tokens will be returned to each players at the end of the game.

Winner gets the pot. If there are tie for winners, they'll split the pot. Note that 1% of the tokens in the pot will be subtracted and give to the game host (the owner of this contract). 

For example, in the above case, user A wins the game. He'll get 8-8*1%=7.92 tokens. 0.08 token will give to the contract owner.
