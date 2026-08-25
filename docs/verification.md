# Public Challenge Directory Verification

The public `/challenges` route renders the district rail, category filters, searchable challenge rows, and public Sign in action. Selecting the first challenge’s upvote control opens the expected account-required prompt with Create account and Log in routes. The modal is dismissible and preserves the directory in the background.

Entering `teachers` in the search field narrows the public list to the teacher-shortage challenge, confirming the search filter is active before any account is required.

The public `/challenges/1` detail route displays the case overview, media evidence, status timeline, assigned institution, and location. Its Upvote control opens the expected account-required prompt with direct Create account and Log in routes.

The `/citizen/dashboard` route opens directly without authentication and exposes the Report new challenge action. That public action successfully navigates to `/citizen/submit`, where the title, description, domain, location, media, and submission controls are available without a sign-in gate.

The Submit Challenge form accepts public title, description, and domain input without authentication. The public route remains directly accessible throughout this interaction.

No browser runtime errors were emitted while validating the client-side public submission flow.

The `/citizen/settings` route opens directly without authentication and exposes Profile, Notifications, and Security navigation. The profile form accepts public interaction, and its Save changes action displays the expected client-side confirmation feedback.

The `/institute/dashboard` route opens without authentication, displays filters and reviewable challenge rows, and the first Review action successfully navigates to `/institute/challenges/1`, where assignment controls are available.

The public Institute header successfully continues the workflow to `/institute/projects` and `/institute/profile`. Both routes load directly without authentication and expose their project-monitoring and institution-profile controls.

The `/industry/dashboard` route opens without authentication and exposes every Express Interest action. The first action successfully navigates to `/industry/projects/1`, where the public support-type and message controls are available.

The public interest form accepts a Funding support selection and optional message input, with the visible character counter updating as expected.

Submitting the valid public interest form changes its action to Interest sent and displays the expected client-side confirmation message.

The `/admin/dashboard` route opens directly without authentication and presents the expected metrics, district coverage visual, domain distribution, and completion-rate trend.

The public `/admin/challenges` route loads directly with filters and override actions. Searching for “water” narrows the challenge ledger to the two relevant water-related entries.

The public `/admin/reports` route loads directly with report filters and format selection. Generating a report adds a new client-side PDF entry to Recent Reports and displays the expected confirmation.

The public `/admin/users` route loads directly with role tabs, search, status, and actions. Selecting the Institutions tab narrows the ledger to the four institution accounts.

The public `/admin/institutions` route loads directly with verification filters and approval controls. Approving Central University of Jharkhand updates its verification state and action label client-side.

The public `/admin/projects` route loads directly from the Admin Projects navigation item with project filters, progress bars, lifecycle statuses, and review actions. Reviewing the at-risk waste-management project updates its action label client-side.

The public `/admin/projects/1` route displays project milestones, uploaded documents, team details, and a chronological activity log. Document download and risk-flag controls update client-side, and a new admin note appears at the top of the activity timeline after submission.
