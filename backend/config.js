require('dotenv').config();

module.exports = {
  port: process.env.PORT || 5000,
  jwtSecret: process.env.JWT_SECRET || 'nexus_vaultpay_super_secure_jwt_secret_key_2026_cfo_croft',
  jwtExpiresIn: '24h',
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || 'sk_test_51MockVaultPayKeyForDemo1234567890abcdef',
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || 'whsec_mockVaultPayWebhookSecretSigner987654321',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  company: {
    name: 'Nexus Corporate Services',
    legalName: 'Nexus Corporate Services LLC',
    tagline: 'Premier B2B Strategic Consultancy & Financial Solutions',
    cfo: 'Evelyn Croft',
    cfoTitle: 'Chief Financial Officer',
    address: 'One World Trade Center, Suite 8400',
    cityStateZip: 'New York, NY 10007, USA',
    phone: '+1 (212) 555-0199',
    email: 'billing@nexuscorporateservices.com',
    supportEmail: 'cfo.croft@nexuscorporateservices.com',
    website: 'https://nexuscorporateservices.com'
  }
};
