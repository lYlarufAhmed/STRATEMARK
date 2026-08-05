import { describe, expect, it } from 'vitest';
import {
  USER_SCOPED_COLLECTIONS,
  getUserPath,
  getUserCollectionPath,
  getUserDocumentPath,
  getUserMarketPath,
  getUserDeckPath,
  getUserCardPath,
  getUserCompanyPath,
  getUserMetricPath,
  getUserCompanyMetricPath,
  getUserViceClaimPath,
  getUserCardViceClaimPath,
  userSchema,
} from './index';

describe('User-isolated path utilities', () => {
  const userId = 'usr_12345';

  it('generates correct user root path', () => {
    expect(getUserPath(userId)).toBe('users/usr_12345');
  });

  it('generates correct user collection paths', () => {
    expect(getUserCollectionPath(userId, USER_SCOPED_COLLECTIONS.MARKETS)).toBe(
      'users/usr_12345/markets',
    );
    expect(getUserCollectionPath(userId, USER_SCOPED_COLLECTIONS.DECKS)).toBe(
      'users/usr_12345/decks',
    );
    expect(getUserCollectionPath(userId, USER_SCOPED_COLLECTIONS.CARDS)).toBe(
      'users/usr_12345/cards',
    );
    expect(getUserCollectionPath(userId, USER_SCOPED_COLLECTIONS.COMPANIES)).toBe(
      'users/usr_12345/companies',
    );
    expect(getUserCollectionPath(userId, USER_SCOPED_COLLECTIONS.METRICS)).toBe(
      'users/usr_12345/metrics',
    );
    expect(getUserCollectionPath(userId, USER_SCOPED_COLLECTIONS.VICE_CLAIMS)).toBe(
      'users/usr_12345/viceClaims',
    );
  });

  it('generates correct user document paths', () => {
    expect(getUserDocumentPath(userId, USER_SCOPED_COLLECTIONS.MARKETS, 'mkt_1')).toBe(
      'users/usr_12345/markets/mkt_1',
    );
  });

  it('generates correct entity document paths under /users/{userId}/...', () => {
    expect(getUserMarketPath(userId, 'mkt_1')).toBe('users/usr_12345/markets/mkt_1');
    expect(getUserDeckPath(userId, 'deck_1')).toBe('users/usr_12345/decks/deck_1');
    expect(getUserCardPath(userId, 'card_1')).toBe('users/usr_12345/cards/card_1');
    expect(getUserCompanyPath(userId, 'comp_1')).toBe('users/usr_12345/companies/comp_1');
    expect(getUserMetricPath(userId, 'met_1')).toBe('users/usr_12345/metrics/met_1');
    expect(getUserViceClaimPath(userId, 'vc_1')).toBe('users/usr_12345/viceClaims/vc_1');
  });

  it('generates nested subcollection paths when applicable', () => {
    expect(getUserCompanyMetricPath(userId, 'comp_1', 'met_1')).toBe(
      'users/usr_12345/companies/comp_1/metrics/met_1',
    );
    expect(getUserCardViceClaimPath(userId, 'card_1', 'vc_1')).toBe(
      'users/usr_12345/cards/card_1/viceClaims/vc_1',
    );
  });

  it('validates user schema correctly', () => {
    const validUser = {
      id: 'usr_12345',
      email: 'analyst@stratemark.com',
      subscriptionTier: 'pro',
      subscriptionStatus: 'active',
      stripeCustomerId: 'cus_123',
      createdAt: '2026-08-05T10:00:00.000Z',
    };

    const parsed = userSchema.parse(validUser);
    expect(parsed.id).toBe('usr_12345');
    expect(parsed.email).toBe('analyst@stratemark.com');
  });
});
