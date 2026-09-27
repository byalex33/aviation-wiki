# Custom account UI

Clerk still owns users, credentials, sessions, Google OAuth, verification codes,
bot protection, and authorization. No account migration or new credential store
is involved.

- `/sign-in` supports email or username with a password, email codes, password
  recovery, existing MFA, and device verification.
- `/sign-up` collects email, username, and password, or uses Google. Email
  verification and Clerk's CAPTCHA remain required by the instance configuration.
- `/sso-callback` uses Clerk's nonvisual callback handler and returns incomplete
  attempts to the custom forms.
- `/settings/profile` lets users update their username, photo, verified email
  addresses, and password. Sensitive changes use a custom reverification form.
  Changing a password ends other sessions.
- Existing public profiles remain at `/profile/[username]`.

The forms match the configured email/password/username and Google strategies.
If instance authentication requirements change, update the custom forms too.
Clerk enforces password policy and validates every account mutation.

Mandatory session tasks, such as a forced compromised-password reset, MFA
setup, or organization selection, retain Clerk's task components as a fallback.
They render inside the account page rather than redirecting into a loop. These
are the remaining prebuilt authentication screens in this migration.

`npm run test:auth-ui` exercises the form handlers with mocked SDK resources,
including failures, verification gates, password recovery, MFA, OAuth completion,
profile changes, field interactions, and local-only return URLs. Real email,
Google consent, CAPTCHA, and credential mutations require a Clerk test account
for a live end-to-end check.
