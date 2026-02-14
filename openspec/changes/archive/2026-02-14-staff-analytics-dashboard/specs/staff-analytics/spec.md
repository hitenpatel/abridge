## ADDED Requirements

### Requirement: Staff can view attendance analytics
The system SHALL provide attendance analytics for a given school and date range. The response SHALL include today's attendance rate, the average rate over the selected period, a daily trend series, the count of children with attendance below 90%, and a breakdown by class.

Attendance rate calculations SHALL exclude marks of `NOT_REQUIRED` from both numerator and denominator. Only `PRESENT` and `LATE` marks SHALL count as present.

#### Scenario: View attendance for current term
- **WHEN** a staff member requests attendance analytics with a "This Term" date range
- **THEN** the system returns today's attendance rate, the term average rate, daily trend data points from term start to today, the number of children below 90% attendance, and a breakdown by className showing rate/presentCount/totalCount per class

#### Scenario: No attendance records exist for date range
- **WHEN** a staff member requests attendance analytics for a date range with no attendance records
- **THEN** the system returns 0% for todayRate and periodRate, an empty trend array, 0 for belowThresholdCount, and an empty byClass array

#### Scenario: NOT_REQUIRED marks are excluded
- **WHEN** attendance is calculated and some children have NOT_REQUIRED marks on certain dates
- **THEN** those marks SHALL be excluded from the denominator so they do not artificially lower the attendance rate

### Requirement: Staff can view payment analytics
The system SHALL provide payment analytics for a given school and date range. The response SHALL include the total outstanding amount (pence), total collected amount (pence), collection rate percentage, count of overdue items, and a breakdown by payment item.

A payment item is overdue when its `dueDate` has passed and its collection rate is below 100%.

#### Scenario: View payments for current term
- **WHEN** a staff member requests payment analytics with a "This Term" date range
- **THEN** the system returns outstandingTotal, collectedTotal, collectionRate percentage, overdueCount, and a byItem array with itemTitle/collectedCount/totalCount/amount/collectionRate per payment item

#### Scenario: No payment items exist for date range
- **WHEN** a staff member requests payment analytics for a date range with no payment items
- **THEN** the system returns 0 for all totals and counts, and an empty byItem array

### Requirement: Staff can view forms analytics
The system SHALL provide forms analytics for a given school and date range. The response SHALL include the count of pending (unsubmitted) forms, the overall completion rate, and a breakdown by form template.

Completion rate is calculated as submitted responses divided by total expected responses (one per child assigned to the form).

#### Scenario: View forms for current term
- **WHEN** a staff member requests forms analytics with a "This Term" date range
- **THEN** the system returns pendingCount, completionRate percentage, and a byTemplate array with templateTitle/submittedCount/totalCount/completionRate per template

#### Scenario: No form templates exist for date range
- **WHEN** a staff member requests forms analytics for a date range with no form templates
- **THEN** the system returns 0 for pendingCount, 0% for completionRate, and an empty byTemplate array

### Requirement: Staff can view message analytics
The system SHALL provide message analytics for a given school and date range. The response SHALL include the count of messages sent, the average read rate across all messages, and a breakdown per message showing subject, sentAt, readCount, recipientCount, and readRate.

Read rate for a message is calculated as distinct users who read it divided by distinct recipient parents (derived from MessageChild → Child → ParentChild).

#### Scenario: View messages for current term
- **WHEN** a staff member requests message analytics with a "This Term" date range
- **THEN** the system returns sentCount, avgReadRate percentage, and a byMessage array with subject/sentAt/readCount/recipientCount/readRate per message, ordered by sentAt descending

#### Scenario: No messages exist for date range
- **WHEN** a staff member requests message analytics for a date range with no messages
- **THEN** the system returns 0 for sentCount, 0% for avgReadRate, and an empty byMessage array

### Requirement: Analytics require staff authentication
All analytics procedures SHALL require the user to be an authenticated staff member of the requested school. The system SHALL use the existing `schoolStaffProcedure` middleware.

#### Scenario: Unauthenticated user requests analytics
- **WHEN** an unauthenticated user requests any analytics procedure
- **THEN** the system rejects the request with an authentication error

#### Scenario: Non-staff user requests analytics
- **WHEN** an authenticated user who is not a staff member of the school requests analytics
- **THEN** the system rejects the request with an authorization error

### Requirement: Analytics support date range filtering
All analytics procedures SHALL accept `from` and `to` date parameters to filter the data range. The frontend SHALL provide preset options: Today, This Week, This Month, and This Term.

"This Term" SHALL be derived from the most recent past `Event` with category `TERM_DATE` for the school. If no term date event exists, it SHALL fall back to September 1st of the current academic year.

#### Scenario: Today date range
- **WHEN** a staff member selects "Today" as the date range
- **THEN** analytics are computed for today's date only

#### Scenario: This Term date range with term date event
- **WHEN** a staff member selects "This Term" and the school has a TERM_DATE event in the past
- **THEN** analytics are computed from that term date event's start date to today

#### Scenario: This Term date range without term date event
- **WHEN** a staff member selects "This Term" and the school has no past TERM_DATE events
- **THEN** analytics are computed from September 1st of the current academic year to today

### Requirement: Analytics dashboard page
The web app SHALL provide an analytics page at `/dashboard/analytics` accessible to all staff roles (ADMIN, TEACHER, OFFICE). The page SHALL display four summary cards (attendance, payments, forms, messages) in a 2x2 grid layout.

Each card SHALL show a headline metric, a sparkline trend line, and 1-2 secondary metrics. Each card SHALL be expandable to show a detail breakdown table.

#### Scenario: Staff navigates to analytics page
- **WHEN** a staff member navigates to `/dashboard/analytics`
- **THEN** the page displays four summary cards with data for the default date range (This Term), each loading independently with skeleton placeholders

#### Scenario: Staff expands a card for detail
- **WHEN** a staff member clicks on a summary card
- **THEN** the card expands to show a breakdown table below it (e.g. attendance by class, payments by item)

#### Scenario: Parent navigates to analytics page
- **WHEN** a parent user attempts to navigate to `/dashboard/analytics`
- **THEN** the page is not visible in navigation and access is denied

### Requirement: Analytics navigation item
The dashboard sidebar SHALL include an "Analytics" navigation item visible only to staff users. It SHALL link to `/dashboard/analytics`.

#### Scenario: Staff sees analytics in navigation
- **WHEN** a staff member views the dashboard sidebar
- **THEN** an "Analytics" item is visible in the navigation

#### Scenario: Parent does not see analytics in navigation
- **WHEN** a parent views the dashboard sidebar
- **THEN** the "Analytics" item is not visible
