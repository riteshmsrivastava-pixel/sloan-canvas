# Muddy Falls — SFMBA year planner

A buildless, GitHub Pages app for the MIT Sloan Fellows class of 2027. Open `index.html` through a local HTTP server or use the published GitHub Pages site.

The full-year planner preserves the `sloanCanvas_fall_v1` browser plan and legacy Fall/IAP course keys. It adds Summer passing-grade confirmations, Spring section selection, research allocations, degree progress, and private account-scoped saving. Past Fall cross-registration courses remain resolvable in saved plans; the browsing catalogs now show Spring HKS/HBS and graduate MIT offerings.

## Verification

Run `node --test verify.cjs email-auth.test.cjs`. No package installation or build is required. Browser QA should use a synthetic/local account, without changing a student's real completion record.

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

## Passwordless authentication

The login screen uses Supabase email OTP for both existing and new members. Existing user IDs, profile names, and saved plans are preserved. New members enter their name after verifying their email. Codes expire after 600 seconds; resend requests are separated by 60 seconds.

Production uses the `mf-send-email` Send Email Hook to check the private 113-address allowlist before sending mail. Its signed-webhook handler sends through Gmail SMTP using encrypted server secrets. The `mf_otp_only_access_token` Custom Access Token hook rejects password and recovery sign-ins, including direct Auth API calls. The private eligibility RPC is executable only by internal service/auth roles. Never put the mail password or hook secret in the repository.

The server hooks must remain enabled for these protections. Removing frontend password controls alone is not sufficient.

## Term views

Summer and Fall use course completion records. Fall courses are selected from a dropdown with their units prefilled; adding a course records it as completed, and existing records retain their previous status. Independent study and courses missing from the list can be added manually. IAP keeps its January calendar, and Spring uses a weekly time grid with H3/H4 filters and visible time conflicts.

Fall G-Lab (9+3), H-Lab (9+6), and EM-Lab (6+3) derive an IAP continuation from the saved Fall record. Allocations were checked against the 2027JA Sloan Course Browser; older EM-Lab audit PDFs have a different split. Only the Fall portion is earned when adding a completed Fall course. An explicitly selected IAP portion retains its own status; derived portions can be removed and restored without changing Fall history. IAP totals include approved research units and flag plans above 12 units.

The November 20, 2026 SFMBA program announcement confirms 15.871 as the only Spring core: 6 units, H3, Hazhir Rahmandad, sections C (Mon/Wed 10–11:30 am) and D (Mon/Wed 1–2:30 pm). The program assigns sections after bidding. This core is visible above the Spring calendar and counted once, even before section assignment; the regular MBA A/B sections are hidden from the Fellows browser.
