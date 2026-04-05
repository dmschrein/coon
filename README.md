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

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Example Test Campaign

Use this data when testing the campaign creation flow. It exercises multiple platforms, rich factual content, and clear strategic goals — ideal for validating the cohesion checker.

| Field        | Value                      |
| ------------ | -------------------------- |
| **Name**     | Flora Fertility App Launch |
| **Goal**     | Promote a Product          |
| **Duration** | 1 Month                    |

**Topic:**

> Introduce Flora, a fertility tracking app that combines cycle data with AI-powered wellness insights. The campaign targets women 25-38 who are trying to conceive or want to understand their cycle better. Focus on destigmatizing fertility conversations, sharing evidence-based tips, and driving waitlist signups before the public launch.

**Platforms & Frequency:**

| Platform  | Posts/Week |
| --------- | ---------- |
| Instagram | 4          |
| TikTok    | 3          |
| Reddit    | 2          |
| Twitter/X | 5          |
| LinkedIn  | 1          |

**Why this is good test data:**

- 5 platforms with different tones (LinkedIn professional vs TikTok casual vs Reddit authentic) stress-tests tone consistency scoring
- Health/wellness topic produces factual claims the cohesion checker can flag for consistency (statistics, features, medical info)
- Product launch goal lets the strategic alignment checker verify CTAs and waitlist mentions across all pieces
- Mixed posting frequency generates varied content volume per platform

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
