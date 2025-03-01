This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

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

## Supabase Setup

This project uses Supabase for database functionality. To set up:

1. Create a Supabase account and project at [supabase.com](https://supabase.com)
2. Create a table called `game` with at least the following columns:
   - `winner_id` (text)
   - `profit` (numeric)
3. Copy the `.env.local.example` file to `.env.local` and update with your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```
4. Restart your development server if it's already running

## Stats Page

Visit `/stats` to see a bar chart visualization of the maximum profit for each winner in the game table.

## Round Results Tracking

The app now tracks and stores the end balances for each player/model at the end of each poker round. This data is stored in Supabase in the `round` table with the following structure:

- `id`: UUID (a unique identifier for row)
- `round_id`: UUID (a unique identifier for the round)
- `model`: TEXT (the player/model name)
- `end_balance`: BIGINT (the chip count at the end of the round)
- `created_at`: TIMESTAMPTZ (when the record was created)

### Querying Round Results

You can retrieve round results data using the `/api/round-results` endpoint with the following optional query parameters:

- `model`: Filter by specific model/player name
- `roundId`: Filter by specific round ID
- `limit`: Maximum number of records to return (default: 100)

Example: `/api/round-results?model=Claude&limit=10`

You can also query this data directly in Supabase. For example, to get the average end balance for each model:

```sql
SELECT
  model,
  AVG(end_balance) as avg_balance
FROM round
GROUP BY model
ORDER BY avg_balance DESC;
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
