# Sellix AI

A SaaS sales intelligence platform powered by AI for pharmacies and drugstores in Latin America.

## Overview

Sellix AI transforms historical transaction data into actionable business insights, enabling pharmacy owners and sales teams to:

- **Predict customer churn** - Identify at-risk customers before they leave
- **Optimize cross-selling** - Recommend products to increase average transaction value
- **Smart replenishment** - Anticipate when customers will need to reorder
- **Identify VIP customers** - Focus on high-value clients and retention
- **Data-driven decisions** - Move from intuition to metrics-based selling

## Tech Stack

- **Frontend:** Next.js 14, React 18, TypeScript
- **Styling:** Tailwind CSS, Lucide React icons
- **Authentication:** NextAuth with bcrypt password hashing
- **Analytics:** Recharts for visualizations, Tanstack React Table for data tables
- **Data Processing:** Python ETL pipeline
- **Export:** XLSX support for reports

## Project Structure

```
src/
├── app/              # Next.js app routes and API endpoints
├── components/       # React UI components (charts, tables, layout)
├── lib/             # Utilities (auth, data services, formatters, logging)
scripts/             # ETL data processing pipeline
public/data/         # Sample analytics datasets
```

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

Visit `http://localhost:3000` to access the application.

## Feature Modules

- **Churn Analytics** - Customer retention risk assessment
- **Cross-sell (Cruzada)** - Product recommendation engine
- **Product Hook (Gancho)** - Traffic-driving product identification
- **Replenishment (Reposición)** - Smart reorder predictions
- **VIP Management** - High-value customer tracking and engagement

## Development

```bash
# Type checking
npm run type-check

# Linting
npm run lint
```

## License

Proprietary - All rights reserved
