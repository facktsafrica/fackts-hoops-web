# FACKTS Hoops accounts and notifications

FACKTS keeps the two account types separate:

- Admins are Supabase Auth users approved in `admin_profiles`.
- Players are Supabase Auth users linked to one active official row in `players.user_id`.
- Guest hoopers and prospects do not receive official player portal access.
- Each signed-in player is locked to their own identity when scheduling availability, responding to games, or requesting a challenge.

## 1. Database migrations

Run both files in the FACKTS Supabase SQL Editor:

1. `supabase/migrations/20260721_player_auth.sql`
2. `supabase/migrations/20260721_push_notifications.sql`

The second migration creates device subscriptions and private notification policies. Both migrations are safe to rerun.

## 2. Required Vercel variables

Keep the existing Supabase variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SITE_URL=https://fackts-hoops-web.vercel.app`

Never prefix the service-role key with `NEXT_PUBLIC_`.

## 3. Generate push notification keys

Run this once inside the project:

```bash
npx web-push generate-vapid-keys
```

Add the generated values to Vercel:

- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT=mailto:facktsafrica@gmail.com`

The private key is server-only. Never commit it or prefix it with `NEXT_PUBLIC_`.

Redeploy after adding the variables.

## 4. Player login without email delivery

1. Admin logs in through `/admin/login`.
2. Open **Player Accounts**.
3. Enter the official player's email and select **Create Login**.
4. Copy the one-time temporary login details.
5. Send the details directly to the player, for example through WhatsApp.
6. The player logs in through `/player/login`.
7. The player opens **Account Settings** and replaces the temporary password.

**Reset Login** creates a fresh temporary password. It replaces the player's current password, so use it only when needed.

## 5. Device notifications

After login, admin and players select **Enable Notifications** on each phone or laptop they use.

Automatic app alerts cover:

- Player availability and game or event responses to admin.
- Challenge requests to admin and the selected opponent.
- Match approvals and rejections to involved players.
- Upcoming game additions or changes to active player accounts.
- Published rosters to selected roster players.
- Admin announcements to all active player accounts.

The device controls the final notification sound and vibration behavior. Tapping a notification opens the related FACKTS screen.

## 6. Optional Resend email

Push notifications and temporary player login do not require Resend. When FACKTS later owns and verifies a custom domain, add:

- `RESEND_API_KEY`
- `EMAIL_FROM=FACKTS Hoops <notifications@verified-domain>`
- `FACKTS_ADMIN_EMAIL=facktsafrica@gmail.com`

Until then, leave Resend variables unset. Player accounts and app notifications still work.
