# forgot-password

Backend Supabase Function (Deno) to trigger a password reset email via Supabase Auth.

Usage
- Method: POST
- Body: JSON { "email": "user@example.com" }
- CORS: configured for project origins

Environment
- `SUPABASE_URL` - your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - service role key (REQUIRED)

Example curl

```
curl -X POST https://<YOUR-SUPABASE-URL>/functions/v1/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com"}'
```

Notes
- This function uses the Supabase service role key to call `auth.resetPasswordForEmail` server-side — keep the key secret.
- Do not call this endpoint from untrusted clients without a rate limiter; consider adding recaptcha or abuse protections.
