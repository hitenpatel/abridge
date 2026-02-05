# SchoolConnect User Guide

Welcome to SchoolConnect — the all-in-one platform connecting schools and parents. This guide walks through every feature based on how the application actually works today.

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
SchoolConnect uses a multi-channel notification system:
1. **Push notifications** — primary channel (via mobile app)
2. **SMS fallback** — if push is not delivered within 15 minutes
3. **Email fallback** — if SMS is unavailable (coming soon)

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

## Known Limitations

These items are planned but not yet available:

- **Email notifications** — SMS fallback works; email fallback is coming soon.
- **PDF receipt downloads** — receipt data is generated but PDF file download is not yet implemented.
- **MIS integration** — attendance data is entered manually; live sync with school MIS systems is planned.
- **Achievement/reward tracking** — planned for Phase 3.
- **Photo/video sharing** — planned for Phase 3.
- **Parents' evening booking** — planned for Phase 3.
- **Offline mode / PWA** — the web app does not yet work offline.

---

*Last updated: 2026-02-05*
