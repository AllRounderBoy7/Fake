# 🛡️ Admin Panel Setup Guide

## 🚀 Quick Start (3 Steps)

### Step 1: Run SQL in Supabase

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Click **SQL Editor** (left sidebar)
4. Click **New Query**
5. **Copy and paste** the entire content of `SUPABASE_ADMIN_PANEL_REAL.sql`
6. Click **Run** (or press `Ctrl+Enter`)
7. ✅ You should see: `admin_config table setup complete`

### Step 2: Login as Admin

1. Open your app
2. Login with: `sahanapraveen2006@gmail.com`
3. Password: `sameer3745` (or whatever you set)
4. ✅ You should see your name in the navbar

### Step 3: Open Admin Panel

1. Click your **avatar** (top right in navbar)
2. Click **🛡️ Admin Panel** button
3. ✅ Admin panel opens in full-screen overlay

---

## 🎮 Admin Panel Controls

### 1️⃣ Dashboard Section
**What you see:**
- All current settings at a glance
- Feature toggle states (ON/OFF)
- Earning rates (normal + throttled)
- Withdrawal minimums

**Actions:**
- Review settings
- Quick overview before making changes

---

### 2️⃣ Earning Section
**Controls:**
| Setting | What It Does | Default |
|---------|-------------|---------|
| **Survey Reward** | Coins per survey completion | 15 🪙 |
| **CAPTCHA Reward** | Coins per CAPTCHA solved | 20 🪙 |
| **Ad Reward** | Coins per ad watched | 20 🪙 |
| **Friend Cut %** | % of friend earnings you get | 10% |

**Daily Limits:**
- CAPTCHA daily limit: 30
- Ad daily limit: 20

---

### 3️⃣ Throttle Section
**When user earns ≥ 4000 total coins, rewards reduce automatically**

| Setting | Normal | Throttled |
|---------|--------|-----------|
| Survey | 15 🪙 | 5 🪙 |
| CAPTCHA | 20 🪙 | 5 🪙 |
| Ad | 20 🪙 | 5 🪙 |
| Friend Cut | 10% | 2% |

**Controls:**
- Set throttle threshold (default: 4000 coins)
- Set reduced rates for each task

---

### 4️⃣ Features Section
**Toggle entire features ON/OFF:**

- ✅ Surveys Enabled
- ✅ CAPTCHA Enabled
- ✅ Ads Enabled
- ✅ Referral System Enabled
- ✅ Wallet Enabled
- ✅ Leaderboard Enabled

**Effect:** When OFF, users see "Feature Disabled by Admin" screen

---

### 5️⃣ Withdrawal Section
**Toggle each payment method:**

| Method | Min Coins | Can Enable/Disable |
|--------|-----------|-------------------|
| PhonePe | 5,000 | ✅ |
| UPI | 5,000 | ✅ |
| Credit/Debit Card | 10,000 | ✅ |
| Bank Transfer | 10,000 | ✅ |
| Crypto Wallet | 5,000 | ✅ |

**Controls:**
- Toggle each method ON/OFF
- Set custom minimum coins per method
- Disabled methods don't show in wallet

---

### 6️⃣ Leaderboard Section
**Customize appearance:**
- Title (default: "Top Earners 🏆")
- Subtitle
- Show/hide: Surveys, CAPTCHAs, Badges, Podium, Your Rank

**Badge Thresholds:**
- Legend: 40,000 coins
- Diamond: 20,000 coins
- Platinum: 10,000 coins
- Gold: 5,000 coins
- Silver: 2,000 coins

**Data Source:**
- **Manual** — Use JSON entries (editable in admin panel)
- **Live** — Pull from Supabase `user_profiles` table
  - Set row limit (default: 50)
  - Set minimum coins filter

---

### 7️⃣ Users Section
**Manage all users:**

**You can see:**
- Full name
- Email
- Coins
- Total earned
- Admin status

**Actions:**
- Toggle admin access for any user (ON/OFF)
- Grant admin → user gets admin panel access
- Revoke admin → user loses admin panel access

---

### 8️⃣ Announcement Section
**Show a banner to all users:**

**Settings:**
- Enable/Disable banner
- Message text
- Type: Info (blue), Warning (yellow), Success (green), Error (red)

**Example:**
```
✅ Enabled
📢 "New surveys added! Earn 50% bonus today!"
Type: Success
```

---

### 9️⃣ Maintenance Section
**One-click maintenance mode:**

**When ON:**
- ⚠️ App shows full-screen maintenance screen
- Users see: Custom message + spinning gear icon
- All features blocked
- **Admin can still access panel** (floating shield button)

**When OFF:**
- ✅ App works normally

---

### 🔟 Realtime Section
**Live event monitoring:**

**Shows:**
- All config changes in real-time
- Timestamp of each change
- Which setting was modified

**Useful for:**
- Debugging
- Audit log
- Confirming changes pushed to users

---

## 🔄 How Real-Time Updates Work

```
Admin Panel (You)
    ↓
Click "Save All Changes"
    ↓
Supabase admin_config table updated
    ↓
Supabase Realtime pushes update
    ↓
All connected users receive update instantly
    ↓
App reflects new settings (no page refresh needed)
```

**Example:**
1. You change `survey_reward` from 15 to 100
2. Click "Save All Changes"
3. Any user currently on the app sees surveys now reward 100 coins
4. **No logout/login required**

---

## 🔐 Security (RLS Policies)

**Read Config:** ✅ Anyone can read (needed for feature toggles)  
**Write Config:** ❌ Only admins can update  

**Enforced at database level** — even if someone edits the client code, Supabase will reject non-admin updates.

---

## 🧪 How to Test Admin Panel

### Test 1: Change Survey Reward
1. Open admin panel
2. Earning section → Survey Reward: **100**
3. Save
4. Go to Home → Surveys
5. ✅ Should show "+100🪙" on all survey cards

### Test 2: Disable CAPTCHA
1. Open admin panel
2. Features section → CAPTCHA Enabled: **OFF**
3. Save
4. Go to Home → CAPTCHA
5. ✅ Should show "Feature Disabled by Admin"

### Test 3: Enable Maintenance Mode
1. Open admin panel
2. Maintenance section → Maintenance Mode: **ON**
3. Save
4. Open app in incognito window
5. ✅ Should show maintenance screen
6. ✅ You (admin) still see app + floating shield button

### Test 4: Create Announcement
1. Open admin panel
2. Announcement section:
   - Enabled: **ON**
   - Text: "Welcome to GetMe! 🎉"
   - Type: **Success**
3. Save
4. ✅ Green banner appears at top of app for all users

### Test 5: Grant Admin to Another User
1. Sign up a test account: `test@example.com`
2. Login as `sahanapraveen2006@gmail.com`
3. Open admin panel → Users section
4. Find `test@example.com`
5. Toggle admin: **ON**
6. Save
7. Logout and login as `test@example.com`
8. ✅ "Admin Panel" button now visible

---

## 🐛 Troubleshooting

### Issue: "Failed to save config"
**Solution:** Make sure you ran the SQL file in Supabase

### Issue: Admin panel won't open
**Solution:** 
1. Check you're logged in with `sahanapraveen2006@gmail.com`
2. Run this SQL to verify admin status:
```sql
SELECT email, is_admin 
FROM public.user_profiles 
WHERE email = 'sahanapraveen2006@gmail.com';
```

### Issue: Changes don't reflect for other users
**Solution:** Check Supabase Realtime is enabled:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_config;
```

### Issue: "Database error saving new user"
**Solution:** Check `handle_new_user()` trigger exists (run `SUPABASE_REFERRAL_REAL.sql`)

---

## 📚 SQL Files Reference

| File | Purpose | When to Run |
|------|---------|-------------|
| `SUPABASE_SCHEMA.sql` | Initial database setup | First time only |
| `SUPABASE_FIX_AUTH_SIGNUP.sql` | Fix signup errors | If users can't sign up |
| `SUPABASE_REFERRAL_REAL.sql` | Referral system | For friends feature |
| `SUPABASE_ADMIN_PANEL_REAL.sql` | **Admin panel** | **Run this for admin access** |
| `SUPABASE_ADMIN_PANEL_FULL_CONTROL.sql` | Enhanced admin features | Optional (already in REAL.sql) |

---

## ✅ Final Checklist

Before going live:

- [ ] Ran `SUPABASE_ADMIN_PANEL_REAL.sql` in Supabase
- [ ] Admin account `sahanapraveen2006@gmail.com` has `is_admin = true`
- [ ] Tested opening admin panel
- [ ] Tested changing a setting (e.g., survey reward)
- [ ] Tested feature toggle (disable/enable CAPTCHA)
- [ ] Tested maintenance mode
- [ ] Tested announcement banner
- [ ] Verified RLS policies are active (`SELECT * FROM pg_policies WHERE tablename = 'admin_config'`)
- [ ] Checked Supabase Realtime is enabled for `admin_config` table

---

## 🎉 You're Ready!

Your admin panel is now **fully functional** and **production-ready**!

**Admin URL:** Just login and click your avatar → Admin Panel  
**Admin Email:** `sahanapraveen2006@gmail.com`  

All settings save to Supabase and push to users in real-time. Enjoy full control! 🚀
