# Backend
SecureSend Backend API.

## Email Delivery

This backend uses Resend for all outbound mail, including OTP and anonymous messages.

Required environment variable:

- `RESEND_API_KEY`

The sender domain should be verified in Resend as `securesend.co.in` with the required SPF and DKIM DNS records configured.
