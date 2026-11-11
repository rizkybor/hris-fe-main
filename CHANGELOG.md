# Changelog

All notable changes to the HRIS+ back office (hris-fe-main).

## [4.0.0] — 2026-11-12

A full visual redesign. Every screen moves to one calm, consistent look;
features, permissions and API calls are unchanged.

### Design system
- Design tokens for colour (palette "Navy + Blue"), type scale, radii,
  shadows and motion, defined once in `tailwind.config.js` and
  `src/assets/css/input.css` (`ui-*` classes).
- Inter for the interface and JetBrains Mono for keys and numbers.
- Building blocks in `src/components/ui`: page header, KPI tile, card,
  button, badge, input, select, switch, chips, table, pagination, modal,
  confirm dialog, alert, empty state, toasts, skeletons, spinner and a
  route progress bar.
- Light motion only (transform and opacity, 120–240 ms); off when the
  system asks for reduced motion.
- Charts take their colours from the tokens (`src/utils/uiColor.js`).
- Older utility classes (`blue-gradient`, `select-soft`, `text-brand-*`,
  …) now resolve to the tokens.

### Layout and navigation
- New sidebar grouped like the product (General, My Workspace,
  Administration, Finance, Tools, Company, Insights, License Manager),
  collapsible to a rail.
- The top bar is a breadcrumb; each page carries its own title,
  description and actions.
- Phones get a bottom tab bar, card lists instead of wide tables and
  bottom-sheet dialogs.
- Every table numbers its rows ("#"), continuing across pages.
- Every clickable control shows the pointer cursor.

### Screens
- Sign-in, password reset and error pages, with a light animated
  backdrop on desktop.
- Dashboard with a "Customize" mode for reordering and resizing widgets.
- My workspace: clock in/out, attendance, payslips, tasks, profile, team.
- People: employees (list, detail, add/edit wizard), teams, attendance,
  leave requests, org chart.
- Company and projects: projects (list, detail with task board, forms),
  clients, screening, staff tasks, company profile, assets,
  announcements, document files, credentials, servers, subscriptions,
  maintenance.
- Documents and finance: invoices, receipts, purchase orders, letters,
  memos, certificates, meeting notes, proposals, operational cost, cash
  book, payroll (with a per-employee breakdown), reporting.
- License Manager, Project Calculator, Flowchart Maker, Analytics,
  History and all Settings pages.

### Fixed
- Payslip printing printed the whole app instead of only the payslip.
- Long pages ended behind the phone tab bar.
- Reloading a project's edit page opened its detail page (edit now has
  its own URL, `/admin/projects/:id/edit`).
- Subscription errors were shown in the green success style.
- Pagination could read "Showing 0–0 of N".
- Several pages showed "Dashboard Overview" as their title.

### Removed
- Unused legacy form components (`components/common/form`).
