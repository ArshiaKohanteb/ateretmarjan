# Ateret Marjan TV: setup & handoff

- **TV display:** https://ateretmarjan.org/tv/
- **Dashboard (for the manager):** https://ateretmarjan.org/tv/admin/
- **Try the dashboard without signing in:** https://ateretmarjan.org/tv/admin/?demo. Changes there stay on your own device and never reach the TV.

The old display at `/shul-wall/ateret-marjan-tv` still works and wasn't changed.

---

## One-time Firebase setup (about 10 minutes)

Open https://console.firebase.google.com and choose the **ateret-marjan-elegant-tv** project (elegantproductionsla@gmail.com).

1. **Switch to the Blaze plan.** Click the plan badge (bottom-left) and pick **Blaze**. Firebase only allows photo storage on this plan. A shul's flyers stay inside the free allowance, so it should cost $0. To be safe, set a **$1 budget alert** when it asks.
2. **Turn on email sign-in.** Go to **Build → Authentication → Get started → Sign-in method → Email/Password → Enable → Save**.
   Then open **Settings → Authorized domains** and make sure `ateretmarjan.org` is in the list.
3. **Turn on photo storage.** Go to **Build → Storage → Get started**, accept the default location, and choose **production mode**.
   On the **Rules** tab, replace everything with the contents of [`firebase/storage.rules`](firebase/storage.rules) and click **Publish**.
4. **Create and lock down the database.** Go to **Build → Realtime Database → Create database**, pick **United States (us-central1)**, and start in **locked mode**. Then open the **Rules** tab, replace everything with [`firebase/database.rules.json`](firebase/database.rules.json), and click **Publish**.
   These rules mean only approved managers can change the TV.
5. **Create your owner account.** Go to https://ateretmarjan.org/tv/admin/ and choose **First-time setup**. Enter your email and a password.
   Only the very first account can do this. After that, new people are added under **People**.
6. **Add the show manager.** In the dashboard, go to **People → Add a person**. Enter their email and a starting password, and pick **Manager**.
   They can change everything except the list of people. To change their password, they use **Forgot password?**.
7. **Point the TV at the new display.** In AbleSign, set the web address to `https://ateretmarjan.org/tv/`.
   If the TV is mounted upside down, turn on **Flip screen upside down** on the dashboard's Home page.

## What the manager can do

| Page | What's there |
|---|---|
| **Home** | Live preview of the TV · Schedule-only mode · Flip screen · Restart TV |
| **Times** | Weekday minyanim (per day, fixed or "X min before sunset") · Shabbat schedule · Holiday schedules with dates |
| **Announcements** | Full-screen slides and/or ticker. Types: Mazal Tov, Important, In Memory, Sponsored. Optional start and end dates. |
| **Flyers** | Upload from a phone. Horizontal flyers fill the screen; vertical flyers pair up side by side over a blurred background. Optional dates, per-flyer timing, reordering. |
| **Display** | 5 themes plus "Day & Night" · Shabbat theme · Rotation timing · What shows on the schedule screen · Donation details |
| **People** | Add or remove managers (owners only) |

The zmanim, parasha, Hebrew date, candle lighting, havdalah, Daf Yomi, makam and hilulot are all calculated automatically. They use the same engine as before.

## How deploying works

Push to `main` and GitHub Actions does the rest: it builds `tv-app/` into `/tv` and publishes the site. Nobody needs to deploy by hand.

The source code is in `tv-app/src/`:
- `display/`: the TV screens
- `admin/`: the dashboard
- `shared/`: themes, schedule logic, and data

To work on it locally, run these and then open http://localhost:8080/tv/?demo:

```bash
cd tv-app && npm install && npm run preview
```
