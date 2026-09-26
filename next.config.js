/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Lets route handlers schedule work (like sending an email or logging
    // an attempt) to run after the response is already sent, while still
    // guaranteeing it actually completes — see app/api/auth/signup and
    // app/api/auth/resend-verification for where this is used. Without
    // this flag, code after `return` in a route handler isn't reliably
    // executed at all.
    after: true,
  },
};

module.exports = nextConfig;
