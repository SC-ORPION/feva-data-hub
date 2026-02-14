# FEVA Data Hub - Setup Guide

## Database Setup (Supabase)

### 1. Create a Supabase Project
- Go to https://supabase.com
- Create a new project
- Copy your project URL and anon key

### 2. Run the Database Schema
1. Go to SQL Editor in your Supabase dashboard
2. Create a new query
3. Copy and paste the contents of `supabase-schema.sql`
4. Run the query

### 3. Update Environment Variables
Create/update `.env.local` file:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
DATA_API_KEY=your-datamart-api-key
DATA_API_URL=https://api.datamartgh.shop
NEXT_PUBLIC_WHATSAPP_NUMBER=0534436642
```

## DataMart API Setup

Sign up at https://api.datamartgh.shop and get your API key.

## Admin User Setup

To create an admin user:
1. Sign up with email containing "admin" (e.g., admin@company.com)
2. Access admin dashboard at `/admin`

## Running the Application

```bash
npm run dev
```

Navigate to http://localhost:3000

## Features

### Landing Page
- Hero section with CTAs
- Network support display
- Why choose us section
- Reseller opportunity section
- Pricing table
- Testimonials
- Final CTA

### Authentication
- Sign up
- Login
- Forgot password
- Profile management

### User Dashboard
- Dashboard overview with stats
- Buy data functionality
- Wallet management (deposit/withdraw)
- Transaction history
- Profile settings

### Admin Panel
- User management
- Transaction monitoring
- Pricing management
- Broadcast messaging

## API Endpoints

### Public
- `POST /api/purchase` - Purchase data bundle
- `GET /api/packages` - Get available packages

### Admin
- `PUT /api/admin/pricing` - Update pricing
- `POST /api/admin/broadcast` - Send broadcast message

## Database Tables

- **users** - User accounts
- **wallets** - User wallet balances
- **transactions** - Purchase history
- **pricing** - Data package pricing
- **broadcasts** - Admin messages

## WhatsApp Integration

The floating WhatsApp button links to: https://wa.me/233534436642

To change, update `NEXT_PUBLIC_WHATSAPP_NUMBER` in environment variables.

## Deployment

### Vercel (Recommended)
```bash
vercel deploy
```

### Other Platforms
This is a Next.js app and can be deployed to any Node.js hosting platform.

Set your environment variables in your hosting platform's dashboard.

## Support

For issues or questions, contact: support@fevadata.com
WhatsApp: 0534436642
