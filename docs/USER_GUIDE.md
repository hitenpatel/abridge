# Abridge User Guide

Welcome to Abridge — the all-in-one platform connecting schools and parents. This guide walks through every feature based on how the application actually works today.

---

## Getting Started

### Initial School Setup (Admin)

Before anyone can use the platform, a school administrator must set up the first school.

1. Visit `/setup` in your browser.
2. Fill in the required fields:
   - **School Name** — e.g. "Oakwood Primary"
   - **Ofsted URN** — the school's 6-digit unique reference number
   - **Admin Email** — the email for the first admin account
   - **Setup Key** — provided by the platform operator (check your server `.env` file)
3. Click **Create School & Admin**.
4. On success you'll see a confirmation with the school name and admin email.
5. Click **Go to Registration** to create the admin's account.

### Registration

1. Visit `/register` (or follow the link from setup).
2. Enter your **Full Name**, **Email Address**, and **Password** (minimum 8 characters).
3. Click **Register**.
4. You'll be redirected to the dashboard immediately.

**Staff invitation flow:** If you received an invitation link from your school (e.g. `/register?token=abc123`), the registration page will show a banner confirming you've been invited as a specific role (Teacher, Office, or Admin). Your email will be pre-filled and your role will be assigned automatically when you register.

### Login

1. Visit `/login`.
2. Enter your **Email** and **Password**.
3. Click **Login** to access your dashboard.
4. Sessions last 7 days before requiring re-login.

### Logging Out

Click the **Sign Out** button on the dashboard page (top right area). You'll be redirected to the login page.

---

## For Parents

### Dashboard

After logging in, the dashboard (`/dashboard`) is your home screen. It shows:

- **Welcome message** with your name
- **Summary Cards** — three metric cards showing:
  - Unread Messages count
  - Outstanding Payments total (in GBP)
  - Attendance Alerts count
- **Today's Overview** — your children's attendance status for today (AM and PM marks with colour-coded indicators and attendance percentage)
- **This Week** — upcoming school events with date and category badges
- **My Children** — cards for each linked child showing their name

If you have no children linked to your account yet, you'll see "No children linked to your account." Your school admin will need to link your children in the system.

### Navigation

The sidebar (desktop) or hamburger menu (mobile) gives you access to:

| Section | What it does |
|---------|-------------|
| **Dashboard** | Home screen with summary widgets |
| **Attendance** | View attendance records and report absences |
| **Calendar** | School events by month |
| **Messages** | View sent messages from the school |
| **Forms** | Pending and completed consent forms |
| **Payments** | Outstanding payments, cart, and history |

A **search bar** in the top header lets you search across messages, events, and payments.

### Attendance

Navigate to **Attendance** from the sidebar.

- If you have multiple children, use the **tabs** (desktop) or **dropdown** (mobile) to switch between them.
- The page shows a **monthly calendar view** with colour-coded attendance marks:
  - Green = Present
  - Yellow = Late
  - Red = Absent (Authorised)
  - Dark Red = Absent (Unauthorised)
- Navigate between months using the arrow buttons.

**Reporting an absence:**
1. Click the **Report Absence** button.
2. Select the child (if multiple).
3. Pick a **start date** and **end date**.
4. Enter a **reason** for the absence.
5. Click **Submit**. The school will be notified and the absence marked as authorised.

### Calendar

Navigate to **Calendar** from the sidebar.

- Events are displayed for the current month in a list view.
- Each event shows its **category badge** (Term Date, INSET Day, Event, Deadline, Club), **date**, **title**, and optional description.
- Use the **Previous** and **Next** buttons to navigate between months.

### Messages

Navigate to **Messages** from the sidebar.

- The page shows **Sent Messages** in a table with columns for Date, Subject, Category (Urgent/Standard/FYI), Recipients, and Read Status.
- Use **Previous/Next** buttons for pagination.
- Click **Compose New** to send a new message (staff functionality).

### Forms & Consent

Navigate to **Forms** from the sidebar.

- Forms are grouped by child.
- **Action Required** (amber) — forms that need your attention. Click **Complete** to open the form.
- **Completed** (green) — previously submitted forms with the submission date.

**Filling out a form:**
1. Click **Complete** on a pending form.
2. Fill in the required fields (text inputs, checkboxes, dropdowns).
3. Sign in the **signature pad** at the bottom.
4. Optionally check **Apply to all children** to submit for all your children at once.
5. Click **Submit**.

### Payments

Navigate to **Payments** from the sidebar.

**Outstanding Payments** shows items you need to pay for, each with:
- Category badge (Dinner Money, Trip, Club, Uniform, Other)
- Amount in GBP
- Child name and due date
- **Pay Now** button for single items
- **Add to Cart** for multi-item checkout

**Shopping cart:**
- Add multiple items to your cart.
- The cart shows a running total.
- Remove items with the trash icon.
- Click **Checkout** to pay for everything via Stripe.

**Payment History:**
- Click **View Payment History** to see past transactions.
- Each transaction shows the amount, date, and status.
- UC-compliant receipts include: School Name, Ofsted URN, Child Name, Service description, Amount, Date, and Transaction Reference (SC-YYYY-XXXX).

---

## For Staff (Teachers & Office)

Staff members see a different navigation after logging in. Your dashboard shows:

| Section | What it does |
|---------|-------------|
| **Staff Dashboard** | Staff management (admin only) |
| **Class Attendance** | View and manage class attendance |
| **Manage Payments** | Create and monitor payment items |
| **Send Messages** | Compose and send messages to parents |

### Sending Messages

1. Navigate to **Send Messages**.
2. Click **Compose New**.
3. Fill in the **Subject** and **Message body**.
4. Select the **Category**: Standard, Urgent, or FYI.
5. Check **Send to All Children** or select specific recipients.
6. Click **Send**.

Urgent messages will bypass parents' quiet hours settings. Standard and FYI messages respect quiet hours.

### Creating Payment Items

1. Navigate to **Manage Payments**.
2. Click **Create New Item**.
3. Fill in the details:
   - **Title** — e.g. "Year 3 Science Museum Trip"
   - **Description** — optional details
   - **Amount** — in pounds (converted to pence internally)
   - **Category** — Dinner Money, Trip, Club, Uniform, or Other
   - **Due Date** — optional
4. Check **Apply to all children** or select specific children.
5. Click **Create**.

The item will immediately appear in parents' Outstanding Payments.

### Managing Calendar Events

Staff can create and delete school events via the calendar section:
- **Create Event**: Title, optional description, start/end dates, all-day toggle, and category (Term Date, INSET Day, Event, Deadline, Club).
- **Delete Event**: Remove events you've created.

---

## For Administrators

Admins have all staff capabilities plus additional management features.

### Staff Management

Navigate to **Staff Dashboard** (appears in admin navigation only).

**Current Staff:**
- See all registered staff with their name, email, and role badge (Admin/Teacher/Office).
- Remove a staff member by clicking the trash icon (you cannot remove yourself).

**Inviting New Staff:**
1. Click the **Invite** button.
2. Enter the staff member's **Email Address**.
3. Select their **Role**: Teacher, Office Staff, or Administrator.
4. Click **Send Invitation**.
5. The invitation appears under **Pending Invitations** with an expiry date (7 days).
6. Click **Copy Link** to copy the registration URL — send this to the new staff member.

When the invited person registers using that link, they'll automatically be assigned the correct role and see staff navigation.

### School Admin

The **School Admin** link in the navigation provides access to school-level administration. This section is available to Admin-role users only.

---

## Technical Notes

### Supported Browsers
Chrome, Safari, Firefox, and Edge (last 2 versions). The app is fully responsive for mobile, tablet, and desktop.

### Notifications
Abridge uses a multi-channel notification system:
1. **Push notifications** — primary channel (via mobile app)
2. **SMS fallback** — if push is not delivered within 15 minutes
3. **Email fallback** — if SMS is unavailable (via Resend)

You can configure **quiet hours** in your notification preferences to suppress non-urgent notifications during specific times. Urgent messages always come through.

### Multi-Language Support
Notifications are automatically translated into your preferred language (100+ languages supported). Set your language in your notification preferences.

### Search
The search bar in the dashboard header searches across:
- Messages (subject and body)
- Calendar events (title and description)
- Payment items (title)

Results appear in a dropdown with category icons. Click a result to navigate to it.

### Data & Privacy
- All data is school-scoped (multi-tenant architecture).
- Parents can only see data for their linked children.
- Staff can only access data for their assigned school.
- Sessions are encrypted and expire after 7 days.
- Passwords must be at least 8 characters.

---

## Settings

Navigate to **Settings** from the sidebar (or gear icon on mobile).

### Profile
- Update your **name** and **phone number**.
- Email is read-only (contact your school admin to change it).
- Click **Save Profile** to apply changes.

### Notification Preferences
Configure how you receive notifications:
- **Push notifications** — via the mobile app
- **SMS notifications** — text messages
- **Email notifications** — via email

**Quiet hours:** Enable quiet hours to suppress non-urgent notifications during specific times (e.g., 9pm to 7am). Urgent messages always come through regardless.

### School Settings (Admin only)
Admins can update:
- **School name**
- **Default notification settings** for the school
- **Feature toggles** — enable/disable features like wellbeing check-ins, meal booking, community hub, etc.
- **School branding** — brand colour, secondary colour, motto, and font

---

## Wellbeing Check-ins

### For Parents
Navigate to **Wellbeing** from the sidebar (if enabled by your school).

1. Select your child (if multiple).
2. Choose a **mood**: Great, Good, OK, Low, or Struggling.
3. Optionally add a **note** with more context.
4. Click **Submit**.

You can view historical check-ins for your child on the same page, showing mood trends over time.

### For Staff
Staff see a **Class Wellbeing Overview** showing:
- Today's check-ins across all children
- **Open Alerts** — flagged children needing attention (e.g., 3+ consecutive low moods)
- Acknowledge or resolve alerts with optional notes

---

## Report Cards

### For Parents
Navigate to **Reports** from the sidebar (if enabled).

- View published report cards for each child.
- Each report shows: subjects, grades/descriptors, teacher comments, attendance percentage, and a general comment.
- Reports are only visible once the staff publish the report cycle.

### For Staff
Navigate to **Reports** from the sidebar.

- **Create a Report Cycle** — name it (e.g., "Autumn Term 2026"), select the type (Termly, Half-Termly, End of Year), and set a publish date.
- **Enter Grades** — for each child, enter subject grades and comments.
- **Publish** — makes reports visible to parents.

---

## Meal Booking

### For Parents
Navigate to **Meals** from the sidebar (if enabled).

- View the **weekly menu** published by your school.
- Each day shows available meal options with descriptions and allergen info.
- Click **Book** to reserve a meal for your child.
- Manage your child's **dietary profile** (allergies, dietary needs).

### For Staff
Navigate to **Meals** from the sidebar.

- **Create a Menu** — add meal options for each day of the week with names, descriptions, categories, allergens, and prices.
- **Publish** the menu to make it visible to parents.
- **Kitchen Dashboard** — view booking counts per day to plan catering.

---

## Community Hub

Navigate to **Community** from the sidebar (if enabled).

### For Parents
- **Create a Post** — start a discussion, share an event, or request volunteers.
- **Comment** on posts from other parents.
- **Sign up for volunteer slots** on volunteer request posts.
- Posts can be tagged for easier filtering.

### For Staff
Staff can moderate the community:
- **Pin** important posts to the top.
- **Remove** posts that violate guidelines (with a reason).

---

## Emergency Communications

### For Staff
Navigate to **Emergency** from the sidebar (if enabled).

1. **Initiate an Alert** — select the type (Lockdown, Evacuation, Shelter in Place, Medical, Other) and add an optional message.
2. **Confirm** the alert (requires confirmation dialog for safety).
3. **Post Updates** — send follow-up messages during an active alert.
4. **Resolve** — click "All Clear" or "Cancel" with a reason.

Parents receive immediate push notifications for all emergency alerts regardless of quiet hours.

**Alert History** shows past resolved alerts for reference.

---

## Mobile App

The Abridge mobile app (iOS and Android) provides all parent and staff features on the go.

### Getting Started
1. Download from the App Store or Google Play (or scan the QR code provided by your school).
2. Log in with the same email and password you use on the web.
3. Allow push notifications when prompted.

### Parent Features
The mobile app has four main tabs:
- **Home** — activity feed, action items (pending forms, outstanding payments), child switcher
- **Messages** — inbox with category badges (Urgent, Announcement, Reminder, Newsletter)
- **Attendance** — view records and quickly report absences (Sick, Appointment, Family, Other)
- **Payments** — outstanding items, pay via Stripe

Additional screens accessible from Home:
- **Calendar** — month view with colour-coded events
- **Forms** — pending and completed consent forms
- **Search** — search across messages, events, and payments
- **Settings** — profile, notifications, theme toggle

### Staff Features
Staff see a different set of tabs:
- **Home** — stats cards (unread, absent, events), post class updates, recent posts
- **Messages** — inbox + compose messages to parents
- **Attendance** — today's attendance summary and per-child records
- **Payments** — manage payment items

Admin staff also see a **Staff Management** link to invite and manage team members.

---

## Homework Tracker

Teachers set homework assignments with subjects, due dates, and optional attachments. Parents track their child's progress and mark work as complete. Teachers can grade and provide feedback individually or in bulk.

**Enable it:** Admin Settings > Feature Toggles > Homework.

### For Parents
Navigate to **Homework** from the sidebar (if enabled).

- View all active homework assignments for your child, sorted by due date.
- Each assignment shows the subject, title, description, set/due dates, and any attachments.
- Mark homework as **In Progress** or **Completed**.
- Once graded by a teacher, the grade and feedback appear on the assignment.

### For Staff
Navigate to **Homework** from the sidebar.

- **Set Homework** — enter a subject, title, optional description, year group, set date, due date, and optional attachments. Mark it as a reading task if applicable.
- **View Assignments** — see all homework you've set with completion counts.
- **Grade** — grade individual submissions or use **Bulk Grade** to grade an entire class at once.
- **Cancel** — cancel an assignment if it's no longer needed.

---

## Reading Diary

Parents log daily reading sessions for their children, recording book titles, pages read, duration, and who the child read with. Teachers monitor reading activity across the class and can add comments or set reading targets.

**Enable it:** Admin Settings > Feature Toggles > Reading Diary.

### For Parents
Navigate to **Reading Diary** from the sidebar (if enabled).

- **Log Reading** — record the date, book title, pages/chapter, minutes read, who the child read with (Alone, Parent, Teacher, Sibling, Other), and an optional comment.
- **View Entries** — browse past reading entries by date range.
- **Stats** — see total entries this term, average minutes per session, days read this week, and current reading streak.
- **Diary Info** — view the child's current book, reading level, and daily reading target (set by the teacher).

### For Staff
Navigate to **Reading Diary** from the sidebar.

- **Class Overview** — see all children with their reading level, last entry date, and entries this week at a glance.
- **Add Teacher Entry** — log a reading session observed in class.
- **Add Comment** — leave feedback on a parent's reading entry.
- **Update Diary** — set a child's current book, reading level, and target minutes per day.

---

## Visitor Management

Staff sign visitors in and out of the school, maintaining a live register for safeguarding and fire safety purposes. The system also manages DBS (Disclosure and Barring Service) records for volunteers.

**Enable it:** Admin Settings > Feature Toggles > Visitor Management.

### For Staff
Navigate to **Visitors** from the sidebar (if enabled).

- **Sign In** — record a visitor's name, organisation, phone, email, visit purpose (Meeting, Maintenance, Delivery, Volunteering, Inspection, Parent Visit, Contractor, Other), the staff member they're visiting, and a badge number. Regular visitors are remembered for faster sign-in next time.
- **Sign Out** — sign a visitor out when they leave.
- **On-Site Register** — see all visitors currently on the premises.
- **Fire Register** — view all on-site visitors alongside the staff headcount, ready for emergency evacuation.
- **DBS Register** — add and view DBS records with certificate number, type (Basic, Standard, Enhanced, Enhanced with Barred List), issue date, and expiry date. Volunteers signing in without a valid DBS trigger a warning.
- **Visitor History** — search past visits by date range, name, or purpose.
- **Search** — quickly find returning visitors by name.

---

## MIS Integration

Import student and attendance data from your school's Management Information System. Supports CSV upload for any MIS, with a SIMS adapter for direct API sync. Sync logs track every import with record counts and error details.

**Enable it:** Admin Settings > Feature Toggles > MIS Integration.

### For Admins
Navigate to **MIS Integration** from the sidebar (if enabled).

- **Set Up Connection** — choose a provider (SIMS, Arbor, Bromcom, ScholarPack, or CSV Manual), enter API credentials, and set a sync frequency (Hourly, Twice Daily, Daily, or Manual).
- **Test Connection** — verify the MIS link is working.
- **Upload Students CSV** — import or update student records from a CSV file. Existing children are matched by first name, last name, and date of birth; new children are created automatically.
- **Upload Attendance CSV** — import attendance marks from a CSV file. Records are matched to children and upserted by date and session.
- **Connection Status** — view the current provider, sync frequency, last sync time, and any errors.
- **Sync History** — review past sync operations with status (Success, Partial, Failed), record counts (created, updated, skipped), and duration.
- **Disconnect** — disable the MIS connection.

---

## Event RSVPs

Parents can RSVP to school events (Yes, No, or Maybe) for each of their children. Staff see a headcount summary with response breakdowns to help with planning. Events can optionally have a maximum capacity, enforced automatically.

**Enable it:** RSVPs are part of the Calendar feature. When creating an event, check **RSVP Required** and optionally set a **Max Capacity**.

### For Parents
On the **Calendar** page, events that require an RSVP show a response option. Select **Yes**, **No**, or **Maybe** for each child and add an optional note. You can change your response at any time before the event.

### For Staff
View the **RSVP Summary** for any event to see the total count of Yes, No, and Maybe responses, along with a full list of respondents and their children.

---

## Achievement & Reward System

Staff award points and badges to children for positive behaviour, academic effort, or other achievements. Parents can view their child's awards and total points. A class leaderboard encourages healthy competition.

**Enable it:** Admin Settings > Feature Toggles > Achievements.

### For Parents
Navigate to **Achievements** from the sidebar (if enabled).

- View all awards for your child, each showing the category name, icon, points earned, reason, and the staff member who awarded it.
- See your child's **total points** across all categories.
- **Recent Awards** — a quick feed of the latest awards across all your children.

### For Staff
Navigate to **Achievements** from the sidebar.

- **Award Achievement** — select a child, pick a category, and add an optional reason.
- **Class Leaderboard** — see the top 20 children by total points.

### For Admins
- **Create Category** — define achievement categories with a name, icon, point value, and type (Points or Badge).
- **Deactivate Category** — retire a category without deleting historical awards.

---

## Photo Gallery

Teachers create photo albums from school activities and trips. Albums can be targeted to specific year groups or classes. Parents see published albums relevant to their children.

**Enable it:** Admin Settings > Feature Toggles > Gallery.

### For Parents
Navigate to **Gallery** from the sidebar (if enabled).

- Browse published albums filtered to your children's year groups.
- Each album shows a thumbnail, title, description, and photo count.
- Open an album to view all photos with captions.

### For Staff
Navigate to **Gallery** from the sidebar.

- **Create Album** — give it a title, optional description, and optionally target a year group or class.
- **Add Photos** — upload photos to an album with optional captions. Photos are stored via the media service and sorted in the order you add them.
- **Publish / Unpublish** — control when parents can see the album.
- **Delete** — remove albums or individual photos.

---

## Message Attachments

Staff can attach files to messages when composing. Upload files via the media service first, then attach them by ID when sending the message.

### For Staff
When composing a message, use the **Attach Files** option to include documents, images, or other files. Attachments are linked to the school's media library.

### For Parents
Attachments appear alongside the message content. Click to download or preview.

---

## AI Progress Summaries

Weekly per-child progress summaries are generated automatically, combining attendance, homework completions, reading diary activity, achievements, and wellbeing data into a concise overview. An optional AI-generated insight provides a personalised one-sentence highlight.

**Enable it:** Admin Settings > Feature Toggles > Progress Summaries.

### For Parents
Navigate to **Progress** from the sidebar (if enabled).

- View the **latest weekly summary** for each child, showing key metrics and trends.
- Browse **summary history** to track progress over time.
- If AI insights are enabled by the school, each summary includes a short personalised comment.

### For Staff / Admins
- **Generate Now** — manually trigger a summary for a specific child (rate-limited to once per hour per child).
- **Generate Weekly Batch** — trigger summary generation for all children in the school at once (runs in the background).

### AI Configuration

Progress summaries work in three modes, controlled by the `AI_SUMMARY_PROVIDER` environment variable:

| Variable | Description | Default |
|----------|-------------|---------|
| `AI_SUMMARY_PROVIDER` | Provider to use: `claude`, `openai`, or `template` | `template` |
| `AI_MODEL` | Model name override | Provider-specific (see below) |
| `AI_API_KEY` | API key for OpenAI-compatible providers | — |
| `AI_BASE_URL` | Base URL for OpenAI-compatible providers | `https://api.openai.com/v1` |
| `ANTHROPIC_API_KEY` | API key for Claude provider | — |

**Provider examples:**

| Provider | `AI_SUMMARY_PROVIDER` | `AI_MODEL` | `AI_API_KEY` / `ANTHROPIC_API_KEY` | `AI_BASE_URL` |
|----------|----------------------|-----------|-----------------------------------|--------------|
| Template (no AI) | `template` | — | — | — |
| Anthropic Claude | `claude` | `claude-haiku-4-5-20251001` (default) | Set `ANTHROPIC_API_KEY` | — |
| OpenAI | `openai` | `gpt-4o-mini` (default) | Set `AI_API_KEY` | — |
| Google Gemini | `openai` | `gemini-2.0-flash` | Set `AI_API_KEY` | `https://generativelanguage.googleapis.com/v1beta/openai` |
| Ollama (local) | `openai` | `llama3` | — | `http://localhost:11434/v1` |
| Groq | `openai` | `llama-3.1-8b-instant` | Set `AI_API_KEY` | `https://api.groq.com/openai/v1` |

When set to `template`, summaries contain structured metrics only and no AI insight is generated (zero cost). The AI call has a 5-second timeout and falls back to template mode on failure.

---

## API Documentation

Interactive API documentation is available at `/api/docs` via Swagger UI. The documentation is generated from the OpenAPI 3.x specification and covers all REST endpoints including the health check and authentication routes.

Navigate to `https://your-domain/api/docs` to browse available endpoints, view request/response schemas, and test API calls directly from the browser.

---

## Known Limitations

No major limitations at this time. All planned Phase 3C features have been implemented.

---

*Last updated: 2026-03-16*
