// The shape of a user object returned to the frontend - shared between
// auth.js and payments.js so both stay in sync as fields are added (like
// premiumUntil below, added when Premium became a real recurring subscription
// instead of a one-time permanent unlock).
function publicUser(u) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    plan: u.plan,
    premiumUntil: u.premium_until ? Number(u.premium_until) : null,
    phone: u.phone,
    location: u.location,
    website: u.website,
  };
}

module.exports = { publicUser };
