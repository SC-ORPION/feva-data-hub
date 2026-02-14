# FEVA Business Hub - Mobile Data Selling Platform

A complete full-stack mobile data selling and reseller management platform for Ghana.

## Features

### 🎯 Landing Page
- Hero section with prominent CTAs
- Network support showcase (MTN, Telecel, AirtelTigo)
- Why Choose Us section with 4 key benefits
- Reseller Opportunity section with compelling benefits
- Pricing showcase table
- User testimonials
- Final call-to-action section

### 🔐 Authentication System
- User registration with validation
- Login with email/password
- Forgot password functionality
- Password reset via email
- Secure session management

### 👤 User Dashboard
- Overview Stats (wallet balance, transactions, activity)
- Buy Data (network selection, bundle purchase)
- Wallet Management (deposit/withdraw)
- Transaction History (complete transaction log)
- Profile Settings (personal info, password, phone)

### 👨‍💼 Admin Panel
- Dashboard (users, transactions, revenue)
- User Management
- Transaction Monitoring
- Pricing Management
- Broadcast Messaging

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Supabase account
- DataMart API key

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key
DATA_API_KEY=your-api-key
DATA_API_URL=https://api.datamartgh.shop
NEXT_PUBLIC_WHATSAPP_NUMBER=0534436642
```

3. Run development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Build for Production
```bash
npm run build
npm run start
```

## Setup Guide

See [SETUP_GUIDE.md](./SETUP_GUIDE.md) for detailed setup instructions.

## Admin Access

Create account with "admin" in email to access `/admin`

## Support

**WhatsApp**: 0534436642
**Email**: support@fevadata.com

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
