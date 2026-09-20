// Premium pricing by region. Unlike Paystack, Flutterwave amounts are in the
// currency's normal unit (5000 means NGN 5,000), not the smallest unit - so
// no kobo/cents conversion here.
//
// IMPORTANT: a Flutterwave merchant account settles in the currencies enabled
// for it. Most Nigerian accounts settle NGN by default - accepting USD and
// having it actually reach your bank account may need multi-currency payouts
// enabled on your account (ask Flutterwave support, or check Settings ->
// Settlements in your dashboard). Until confirmed, either keep INTL priced in
// NGN too, or expect USD charges to auto-convert to NGN at settlement. See
// README.md.
const PRICING = {
  NG:      { amount: 5000,  currency: 'NGN', label: '\u20a65,000', name: 'Nigeria' },
  AFRICA:  { amount: 8000,  currency: 'NGN', label: '\u20a68,000', name: 'Rest of Africa' },
  INTL:    { amount: 10,    currency: 'USD', label: '$10',         name: 'Outside Africa' },
};

function resolvePricing(region) {
  return PRICING[region] || PRICING.INTL;
}

module.exports = { PRICING, resolvePricing };
