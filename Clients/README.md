# Employee Onboarding Check-up System (Day 1–90)

Monorepo with `frontend/` (React + Tailwind), `backend/` (Express + Supabase), and `shared/` (types).

- Design system: Web Application Component Kit (Community) from Figma
- Auth + DB: Supabase (Postgres + Supabase Auth)
- API: REST via Express connected to Supabase

## Quick Start

1. Create `.env` files from examples in `frontend/.env.example` and `backend/.env.example`.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run both frontend and backend:
   ```bash
   npm run dev
   ```

Frontend at http://localhost:5173 (Vite)
Backend at http://localhost:4000

## Supabase Schema

See `supabase/schema.sql` for the required tables:
- `employees (id, name, email, role, start_date, status)`
- `checkups (id, employee_id, milestone_day, answers JSONB, completed_at)`

## Project Structure

- `frontend/`: React app with Tailwind, modular components (cards, forms, timeline, progress)
- `backend/`: Express server with REST endpoints: `/checkup` (POST), `/checkup/:employeeId` (GET), `/employees` (GET)
- `shared/`: Common TypeScript interfaces for types across FE/BE
- `supabase/`: SQL schema

## Design & Style Guidance

- Use rounded corners, subtle shadows, grid-based layouts
- Reference Figma components (Buttons, Inputs, Tabs, Progress, Timeline, Cards, Modals, Tables)
- Keep UI minimal and modern per the component kit

## Scripts

- `npm run dev`: concurrently run frontend and backend
- `npm run build`: build both apps
- `npm run typecheck`: TypeScript checks across packages

