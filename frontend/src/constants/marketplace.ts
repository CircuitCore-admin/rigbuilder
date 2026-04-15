export const MARKETPLACE_DISCLAIMERS = {
  termsOfUse: 'RigBuilder acts solely as a classifieds platform and is not a party to any transaction between buyers and sellers. RigBuilder does not verify the identity of users, inspect items, guarantee the accuracy of listings, handle payments, provide escrow services, or mediate disputes. All transactions are conducted entirely at your own risk. You are solely responsible for verifying the condition, authenticity, and legality of any item before purchasing. Never send payment without verifying the item and seller. We strongly recommend meeting in a safe, public location for local pickups. RigBuilder reserves the right to remove any listing that violates our guidelines without notice. By using the marketplace, you acknowledge that RigBuilder, its owners, and its operators bear no liability for any loss, damage, fraud, or dispute arising from marketplace transactions. If you suspect fraud or illegal activity, report the listing immediately and contact your local authorities.',
  safetyTips: [
    'Meet in a public, well-lit location for local pickups',
    'Never wire money or use irreversible payment methods to strangers',
    'Inspect the item thoroughly before completing payment',
    'If a deal seems too good to be true, it probably is',
    'Keep all communication on-platform so there is a record',
    'Never share personal financial information with other users',
    'For high-value items, consider using a secure payment method with buyer protection',
    'Report suspicious listings or users immediately',
    'Check the seller\'s rating and reviews before transacting',
    'Trust your instincts — if something feels off, walk away',
  ],
  reportDisclaimer: 'Filing a false report may result in action against your account. Reports are reviewed by our moderation team. When a listing is reported, associated messages may be reviewed by moderators to assess the situation.',
};

export const MARKETPLACE_CATEGORIES = [
  'Wheel Base', 'Pedals', 'Rig/Cockpit', 'Monitor', 'PC', 'Console',
  'Seat', 'Shifter', 'Handbrake', 'Accessories', 'Other',
];

export const LISTING_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  SELLING: { label: 'Selling', color: '#00FFA3' },
  LOOKING_FOR: { label: 'Looking For', color: '#00B8FF' },
  TRADING: { label: 'Trading', color: '#FFB020' },
};

export const CONDITION_LABELS: Record<string, string> = {
  NEW: 'New',
  LIKE_NEW: 'Like New',
  GOOD: 'Good',
  FAIR: 'Fair',
  FOR_PARTS: 'For Parts',
};

export const CURRENCY_SYMBOLS: Record<string, string> = {
  GBP: '£',
  EUR: '€',
  USD: '$',
};
