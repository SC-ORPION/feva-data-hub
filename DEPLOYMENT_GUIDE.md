# FEVA Hub - Complete Deployment Guide

## Phase 1: Supabase Setup (5-10 minutes)

### Step 1: Create Supabase Account & Project
1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project"
3. Sign in with GitHub or email
4. Click "New Project"
5. Fill in:
   - **Organization**: Create new or select existing
   - **Project name**: `feva-hub` (or your choice)
   - **Database password**: Create a strong password (save this!)
   - **Region**: Choose closest to Ghana (e.g., `eu-west-1`)
6. Click "Create new project" and wait for setup (~2 min)

### Step 2: Get Your Credentials
Once project is ready:
1. Go to **Settings** → **API**
2. Copy these values:
   - **Project URL** (Starting with `https://`)
   - **anon public** key (the long string)
3. Keep these safe - you'll need them next

### Step 3: Run Database Schema
1. In Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Click **"New query"** button
3. Open your local file: `supabase-schema.sql`
4. Copy all contents
5. Paste into the SQL editor
6. Click **"Run"** button (top right)
7. Wait for success message

**Important**: If you see errors about existing tables, that's OK - it means the schema already exists.

---

## Phase 2: Environment Configuration (2 minutes)

### Update `.env.local`
1. Open `.env.local` in your editor
2. Replace the placeholder values:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY_HERE
DATA_API_KEY=your-datamart-api-key
DATA_API_URL=https://api.datamartgh.shop
NEXT_PUBLIC_WHATSAPP_NUMBER=0534436642
```

**Example (do not use these values):**
```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://xyzabc123.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
DATA_API_KEY=demo_key_12345
DATA_API_URL=https://api.datamartgh.shop
NEXT_PUBLIC_WHATSAPP_NUMBER=0534436642
```

3. Save the file

---

## Phase 3: Local Testing (10-15 minutes)

### Start Development Server
```bash
npm run dev
```

You should see:
```
  ▲ Next.js 16.1.6
  - Local:        http://localhost:3000
```

### Test Authentication Flow

#### Test 1: Signup
1. Open `http://localhost:3000`
2. Click "Get Started" or navigate to `/auth/signup`
3. Fill in signup form:
   - Full Name: `John Doe`
   - Email: `john@example.com`
   - Phone: `0551234567`
   - Password: `Test@12345`
   - Confirm: Same password
4. Click "Sign Up"
5. Should see green success message
6. Should redirect to dashboard

#### Test 2: Login
1. Navigate to `/auth/login`
2. Fill in:
   - Email: `john@example.com` (from signup)
   - Password: `Test@12345`
3. Click "Login"
4. Should see green success and redirect to dashboard
5. Should show your email in top bar

#### Test 3: Demo Credentials (Optional)
1. On login page, click "Use Demo Credentials"
2. Click login
3. The form pre-fills with demo account info

#### Test 4: Logout
1. From dashboard, click "Logout" button
2. Should redirect to homepage

#### Test 5: Protected Routes
1. Try navigating to `/dashboard` without logging in
2. Should redirect to `/auth/login`

### Common Issues & Fixes

**Issue**: "Invalid login credentials"
- Check Supabase credentials in `.env.local`
- Verify database schema was successfully created
- Try signing up with a new email

**Issue**: "Cannot find module '@/lib/supabase/client'"
- Run `npm install` again
- Restart dev server (`Ctrl+C`, then `npm run dev`)

**Issue**: "Session not persisting"
- Check that `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are correct
- Clear browser cookies and try again

---

## Phase 4: Prepare for Deployment (5 minutes)

### Commit Changes to Git
```bash
git add .
git commit -m "chore: add auth pages and Supabase setup"
```

### Create GitHub Repository
If you don't have one yet:

1. Go to [github.com](https://github.com)
2. Sign in or create account
3. Click "+" → "New repository"
4. Name it `feva-hub`
5. Click "Create repository"
6. Follow instructions to push existing code:

```bash
git remote add origin https://github.com/YOUR_USERNAME/feva-hub.git
git branch -M main
git push -u origin main
```

---

## Phase 5: Deploy to Vercel (10 minutes)

### Option 1: Deploy from CLI (Easiest)

```bash
npm i -g vercel
vercel
```

Follow the prompts:
- Link to GitHub account
- Select project folder
- Select default settings
- Add environment variables (see next section)

### Option 2: Deploy from Web Dashboard

1. Go to [vercel.com](https://vercel.com)
2. Sign in with GitHub
3. Click "Add New..." → "Project"
4. Select `feva-hub` repository
5. Skip build settings (uses defaults)
6. Add Environment Variables (see next section)
7. Click "Deploy"

### Add Environment Variables to Vercel

In Vercel dashboard → Project Settings → Environment Variables:

Add these variables:
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon key
- `DATA_API_KEY`: Your DataMart API key
- `NEXT_PUBLIC_WHATSAPP_NUMBER`: `0534436642`

Then click "Redeploy" to apply changes.

---

## Phase 6: Verify Live Deployment (2 minutes)

1. After deployment completes, click the URL (e.g., `https://feva-hub.vercel.app`)
2. Test the same auth flow:
   - Create account
   - Login
   - Access dashboard
   - Logout

---

## Maintenance Checklist

- [ ] Supabase project created
- [ ] Database schema imported
- [ ] `.env.local` updated with real credentials
- [ ] Local testing completed (all 5 tests pass)
- [ ] Code committed to git
- [ ] GitHub repository set up
- [ ] Deployed to Vercel
- [ ] Live site tested
- [ ] Environment variables set in Vercel

---

## Next Steps After Deployment

1. **Set up admin account**: Sign up with email containing "admin"
2. **Configure payments**: Add real DataMart API key
3. **Set up WhatsApp**: Configure WhatsApp number for support
4. **Add custom domain**: In Vercel, add your domain
5. **Monitor**: Set up error tracking and analytics

---

## Support & Troubleshooting

### Database Issues
- Clear Supabase browser cache
- Check Realtime subscription in Supabase dashboard
- Verify Row Level Security (RLS) is enabled

### Build Failures
- Check build logs in Vercel dashboard
- Ensure all environment variables are set
- Verify Node version compatibility

### Login Issues
- Check Network tab in browser DevTools
- Verify Supabase API is responding
- Check `.env.local` values match Supabase project

---

## Contact & Resources

- **Supabase Docs**: https://supabase.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **Vercel Deployments**: https://vercel.com/docs
- **DataMart API**: https://api.datamartgh.shop

✅ Follow this guide step-by-step and your app will be live!
