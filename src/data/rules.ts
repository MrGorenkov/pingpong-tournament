// Single source of truth for every magic number in the tournament + pool.

export const BANK_RUB = 800; // 8 players x 100 rub, fixed
export const PLAYER_COUNT = 8;

// entry breakdown (per person), purely informational on screen
export const ENTRY_FEE_RUB = 260;
export const TABLE_FEE_RUB = 160;
export const POOL_FEE_RUB = 100;

// betting budget
export const POINTS_BUDGET = 100; // points each player may distribute
export const MIN_STAKE = 10; // min points on a single outcome
export const MAX_STAKE = 50; // max points on a single outcome
export const REFUND_EACH_RUB = 100; // edge case A: everyone gets their 100 back
export const VOID_ODDS = 1.0; // a match that didn't happen settles at 1.0

// match format
export const SET_POINT_TARGET = 11; // first to 11, win by 2
export const GROUP_SETS_TO_WIN = 2; // best of 3
export const PLAYOFF_SETS_TO_WIN = 3; // best of 5

// bonus points credited into the same pool (instead of a cash prize fund)
export const BONUS = {
  champion: 150,
  runnerUp: 80,
  third: 40,
  upsetPerPosition: 30,
} as const;
