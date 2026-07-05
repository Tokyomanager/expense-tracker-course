# Expense Tracker Course App

A modern personal expense tracker built with Next.js 14, TypeScript, Tailwind CSS, and localStorage persistence.

## Features

- Add, edit, and delete expenses
- Date, amount, category, and description validation
- Native date picker inputs for mobile and desktop
- Search, category, and date-range filters
- Summary cards for total spending, monthly spending, top category, and filtered totals
- Category spending chart using responsive CSS bars
- CSV export for the current filtered view
- localStorage persistence for demo use
- Responsive layout for phones, tablets, and desktops

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

To preview on a phone connected to the same network, run:

```bash
npm run dev -- --hostname 0.0.0.0
```

Then open `http://YOUR_COMPUTER_IP:3000` on the phone.

## Test The Main Features

1. Add an expense with date, amount, category, and description.
2. Try submitting an empty or zero amount to confirm validation.
3. Search by description or category.
4. Filter by category and date range.
5. Edit an existing expense and save the change.
6. Delete an expense.
7. Reload the page and confirm expenses remain saved.
8. Click `Export CSV` and open the downloaded file.

## Quality Checks

```bash
npm run lint
npm run build
```

The app is also configured for static export and GitHub Pages deployment through `.github/workflows/deploy.yml`.
