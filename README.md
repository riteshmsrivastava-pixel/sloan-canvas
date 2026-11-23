# Muddy Falls — SFMBA year planner

A buildless, GitHub Pages app for the MIT Sloan Fellows class of 2027. Open `index.html` through a local HTTP server or use the published GitHub Pages site.

The full-year planner preserves the `sloanCanvas_fall_v1` browser plan and legacy Fall/IAP course keys. It adds Summer passing-grade confirmations, Spring section selection, research allocations, degree progress, and private account-scoped saving. Past Fall cross-registration courses remain resolvable in saved plans; the browsing catalogs now show Spring HKS/HBS and graduate MIT offerings.

## Verification

Run `node --test verify.cjs`. No package installation or build is required. Browser QA should use a synthetic/local account, without changing a student's real completion record.

## Sources and rules

- Sloan Spring: 294 sections from the supplied Spring 2027 Course Browser export. `spring-data.js` retains source restrictions, half terms, faculty and meeting times. Recitations and labs add no credit.
- SFMBA rules: https://sloanhub.mit.edu/pages/sfmba-requirements
- Independent study / thesis: https://sloanhub.mit.edu/pages/registration-copy3
- MIT Spring: current 2026–27 subject listings from https://student.mit.edu/catalog/index.cgi. Spring offerings are catalog-level; final Spring schedules are pending. Irregular offerings are opt-in; arranged units require confirmation.
- Harvard: official HKS/HBS Spring 2027 catalog entries available for cross-registration. Source metadata is embedded in the data file.
- Harvard conversions: https://registrar.mit.edu/registration-academics/registration-information/cross-registration/harvard/converting-harvard

All sources were checked November 22, 2026. This is a planning estimate; final degree clearance belongs to MIT/Stellic. A finance waiver adds 9 elective units, while the 15.873 core option raises the total target to 174. Independent study is capped at 12 units per term in the estimate. Thesis allocations are capped at 24 units and flagged if only one term is selected. Completed and planned units stay distinct; waitlists, non-graduate courses, duplicate subjects and noncredit components do not inflate the total.

## Private data

The existing Supabase project hosts `mf_degree_plans`, with owner-only row policies. `mf_save_year_plan` checks a revision and updates the private snapshot and existing shared enrollment rows in a single transaction. Concurrent versions are presented for resolution instead of silently overwriting them. Local backups are keyed by account, and JSON backup/restore is available in the UI.

The signup allowlist is stored only in the private database schema. It is not included in this repository. New registrations are restricted by the existing `auth.users` trigger; existing profiles are preserved. Three pre-existing excluded addresses remain blocked. Never put the roster, user emails, credentials, or exported personal plans in this repository.

`year-plans.sql` documents the private-plan schema. The production signup allowlist is managed separately; do not recreate or replace it during frontend deployment.

Classmates buttons on IAP and Spring catalog/plan cards show the same term and section’s shared selections with Enrolled, Sampling, Waitlist, or Dropping status. Completion records stay private. IAP dates were rechecked in the authenticated 2027JA Sloan Course Browser on Nov 22, 2026; Analytics Capstone’s January 5 sessions were corrected, and 15.S60 faculty updated. Executive electives still have no published dates in that listing. Finance Lab and Product Management Lab use separate IAP/Spring unit allocations.
