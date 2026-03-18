# Supabase Feedback System Setup Guide

## Why Supabase?
✅ PostgreSQL database (structured, powerful)
✅ Free tier: 500MB database + 2GB bandwidth
✅ Built-in REST API
✅ Better for building admin dashboards
✅ Easier to query and manage feedback
✅ Open source

---

## Setup Steps (Follow These!)

### Step 1: Create Supabase Account & Project

1. Go to **[https://app.supabase.com](https://app.supabase.com)**
2. Click **"Sign up"** (or "Sign in" if you have account)
3. Sign up with:
   - Email
   - GitHub (easier)
   - Google

4. Once logged in, click **"+ New project"**
5. Fill in:
   - **Project name:** `grade-genius` (or any name)
   - **Database password:** Create a strong password (you'll need this)
   - **Region:** `Asia (Singapore)` (closest to India)
6. Click **"Create new project"**

⏳ Wait 2-3 minutes while it initializes...

---

### Step 2: Create Feedback Table

1. In Supabase dashboard, left sidebar → **"SQL Editor"**
2. Click **"New Query"**
3. Copy and paste this SQL code:

```sql
-- Create feedback table
CREATE TABLE feedback (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  category TEXT NOT NULL CHECK (category IN ('bug', 'feature', 'general', 'performance', 'ui')),
  message TEXT NOT NULL,
  email TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (Row Level Security)
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Allow anyone to INSERT feedback
CREATE POLICY "Allow anyone to submit feedback" ON feedback
FOR INSERT WITH CHECK (true);

-- Allow only authenticated users to READ feedback
CREATE POLICY "Only authenticated users can read feedback" ON feedback
FOR SELECT USING (auth.role() = 'authenticated');

-- Create index for faster queries
CREATE INDEX feedback_timestamp_idx ON feedback(timestamp DESC);
```

4. Click **"Run"** button (or Ctrl+Enter)
5. You should see: ✅ **"Success. No rows returned"**

---

### Step 3: Get Your API Keys

1. Left sidebar → **"Project Settings"** (gear icon)
2. Click **"API"** tab
3. Copy these values:
   - **Project URL** (under "Project Settings" heading)
   - **anon public** (under "Project API keys")

It will look like:
```
Project URL: https://xyzabc123.supabase.co
anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

### Step 4: Update Your App Config

1. Open **`src/lib/firebase.ts`** (yes, we kept the filename)
2. Replace these two lines:

```typescript
const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY_HERE';
```

With YOUR actual values from Step 3:

```typescript
const SUPABASE_URL = 'https://xyzabc123.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

3. Save the file

---

## Test the Feedback System

1. Run your app: `npm run dev`
2. Click **"Feedback"** button
3. Fill form and submit
4. You should see ✅ **"Thank you for your feedback!"**

5. Check Supabase dashboard:
   - Left sidebar → **"SQL Editor"** → **"New Query"**
   - Paste: `SELECT * FROM feedback ORDER BY timestamp DESC;`
   - Click **"Run"**
   - Your feedback should appear!

---

## View All Feedback

### Option A: SQL Editor (Easy)
1. Go to Supabase → **"SQL Editor"** → **"New Query"**
2. Run:
```sql
SELECT * FROM feedback ORDER BY timestamp DESC;
```

### Option B: Table Editor (Visual)
1. Go to Supabase → **"Tables"** (left sidebar)
2. Click **"feedback"** table
3. See all feedback in a nice table view

### Option C: Filter by Category
```sql
SELECT * FROM feedback 
WHERE category = 'bug' 
ORDER BY timestamp DESC;
```

### Option D: Get Stats
```sql
SELECT 
  category,
  AVG(rating) as avg_rating,
  COUNT(*) as total
FROM feedback
GROUP BY category;
```

---

## Build Admin Dashboard (Optional Future Feature)

Once you want to view feedback in your app:

```typescript
import supabase from '@/lib/firebase';

const fetchAllFeedback = async () => {
  const { data, error } = await supabase
    .from('feedback')
    .select('*')
    .order('timestamp', { ascending: false });
  
  if (error) console.error(error);
  return data;
};
```

Then create `/admin/feedback` page to display it!

---

## File Locations

| File | Purpose |
|------|---------|
| `src/lib/firebase.ts` | Supabase config & API calls |
| `src/components/FeedbackModal.tsx` | Feedback form (unchanged) |
| `src/pages/Index.tsx` | Main page with Feedback button |

---

## Supabase Dashboard Features

Once logged in, explore:

- **SQL Editor** - Run custom queries
- **Tables** - Visual database management
- **Storage** - File uploads (if you add this later)
- **Auth** - User authentication (if you add this later)
- **Settings** - API keys, database backups, etc.

---

## Troubleshooting

### "Connection refused" or "Invalid API key"
→ Double-check you copied the correct URL and anon key
→ Make sure no extra spaces or quotes

### Feedback not showing in table
→ Refresh the Supabase page
→ Run `SELECT COUNT(*) FROM feedback;` to check if data exists
→ Check browser console (F12) for errors

### "Row Level Security" error
→ Make sure you ran the SQL code in Step 2
→ The `CREATE POLICY` statements create the right permissions

### Still not working?
→ Try this query: `SELECT version();`
→ If it returns PostgreSQL version, database is working
→ Problem is probably in RLS policies

---

## Security Notes

**Current Setup:** Anyone can submit feedback (good for users)

**What you should do later:**
1. Set up Supabase Auth
2. Restrict read access to feedback (only you)
3. Add rate limiting (prevent spam)
4. Add CAPTCHA if getting spam

For now, the current setup is perfect for gathering user feedback!

---

## Next Steps

1. ✅ Create Supabase project (this guide)
2. ✅ Add feedback table (SQL in Step 2)
3. ✅ Get API keys (Step 3)
4. ✅ Update your app (Step 4)
5. ✅ Test feedback submission
6. 🎯 (Future) Build admin dashboard to view feedback
7. 🎯 (Future) Send email notifications when feedback received
8. 🎯 (Future) Add feedback analytics/stats page

---

## Useful Links

- **Supabase Docs:** https://supabase.com/docs
- **SQL Guide:** https://www.postgresql.org/docs/current/
- **RLS Documentation:** https://supabase.com/docs/guides/auth/row-level-security
- **REST API:** https://supabase.com/docs/guides/api

---

**Questions?** Ask in Supabase Discord: https://discord.supabase.io
