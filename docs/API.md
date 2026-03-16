# SchoolConnect API Reference

Base URL: `http://localhost:4000` (dev) | `https://api.your-domain.com` (production)

Protocol: [tRPC](https://trpc.io) over HTTP with SuperJSON transformer. Dates serialize automatically.

## Authentication

Auth is handled by [better-auth](https://better-auth.com) at `/api/auth/*`. Email/password login.

Session cookie is set on login and sent with all subsequent requests.

## Access Levels

```
publicProcedure           — No auth required
protectedProcedure        — Requires login (valid session)
schoolStaffProcedure      — Requires staff membership at schoolId
schoolAdminProcedure      — Requires ADMIN role at schoolId
schoolFeatureProcedure    — Staff + feature toggle checks
```

School-scoped procedures require `schoolId` in the input and populate `ctx.schoolId` + `ctx.staffMember`.

## Rate Limits

- Global: 100 req/min per IP (production), 1000 (dev)
- Auth endpoints: 5 req/15 min (production), 500 (dev)

---

## Health

### `health.check` (query)
**Access:** public

Returns server health status.

---

## Auth

### `auth.getSession` (query)
**Access:** public

Returns the current user session with role info, or `null` if not logged in.

**Response:** `{ id, name, email, isParent, staffRole, schoolId } | null`

### `auth.getSecretMessage` (query)
**Access:** protected

Returns a greeting message. Used for auth verification.

---

## Setup

### `setup.createInitialSchool` (mutation)
**Access:** public (requires setup key)

Creates the first school and admin invitation. One-time bootstrap.

**Input:**
| Field | Type | Required |
|-------|------|----------|
| name | string | yes |
| urn | string | yes |
| adminEmail | string (email) | yes |
| setupKey | string | yes |

---

## Invitation

### `invitation.send` (mutation)
**Access:** schoolAdmin

Sends a staff invitation email.

**Input:**
| Field | Type | Required |
|-------|------|----------|
| email | string (email) | yes |
| role | `ADMIN` \| `TEACHER` \| `OFFICE` | yes |

### `invitation.accept` (mutation)
**Access:** public

Accepts an invitation token. Creates staff membership and user if needed.

**Input:** `{ token: string }`

### `invitation.verify` (query)
**Access:** public

Validates an invitation token without accepting it.

**Input:** `{ token: string }`

**Response:** `{ email, role, schoolName, schoolId }`

### `invitation.list` (query)
**Access:** schoolAdmin

Lists all invitations for the school.

---

## User

### `user.updatePushToken` (mutation)
**Access:** protected

Registers a push notification token for the current user.

**Input:** `{ pushToken: string }`

### `user.listChildren` (query)
**Access:** protected

Returns all children linked to the current parent.

---

## Dashboard

### `dashboard.getSummary` (query)
**Access:** protected

Returns summary metrics: unread messages, outstanding payments, attendance alerts.

### `dashboard.getFeed` (query)
**Access:** protected

Returns a unified activity feed for a child.

**Input:** `{ childId: string, limit?: number, cursor?: { timestamp, id } }`

### `dashboard.getActionItems` (query)
**Access:** protected

Returns pending actions (unsigned forms, unpaid items) for a child.

**Input:** `{ childId: string }`

---

## Messaging

### `messaging.send` (mutation)
**Access:** schoolFeature

Sends a message from staff to parents.

**Input:**
| Field | Type | Required |
|-------|------|----------|
| schoolId | string | yes |
| subject | string | yes |
| body | string | yes |
| category | `STANDARD` \| `URGENT` \| `FYI` | yes |
| allChildren | boolean | no |
| childIds | string[] | no |

### `messaging.listSent` (query)
**Access:** schoolFeature

**Input:** `{ schoolId, page, limit }`

### `messaging.listReceived` (query)
**Access:** protected

**Input:** `{ limit, cursor? }`

### `messaging.markRead` (mutation)
**Access:** protected

**Input:** `{ messageId: string }`

### `messaging.reply` (mutation)
**Access:** protected

**Input:** `{ messageId, body }`

### `messaging.listReplies` (query)
**Access:** protected

**Input:** `{ messageId, limit, cursor? }`

### `messaging.listSchoolStaff` (query)
**Access:** protected

Returns staff members available for direct messaging.

### `messaging.createConversation` (mutation)
**Access:** protected

Starts a direct conversation with a staff member.

**Input:** `{ staffId, subject?, body }`

### `messaging.sendDirect` (mutation)
**Access:** protected

**Input:** `{ conversationId, body }`

### `messaging.listConversations` (query)
**Access:** protected

**Input:** `{ limit, cursor? }`

### `messaging.getConversation` (query)
**Access:** protected

**Input:** `{ conversationId, limit, cursor? }`

### `messaging.closeConversation` (mutation)
**Access:** protected

**Input:** `{ conversationId }`

---

## Calendar

### `calendar.listEvents` (query)
**Access:** protected

**Input:**
| Field | Type | Required |
|-------|------|----------|
| startDate | Date | yes |
| endDate | Date | yes |
| category | `TERM_DATE` \| `INSET_DAY` \| `EVENT` \| `DEADLINE` \| `CLUB` | no |

### `calendar.createEvent` (mutation)
**Access:** schoolFeature

**Input:** `{ schoolId, title, body?, startDate, endDate?, allDay?, category }`

### `calendar.deleteEvent` (mutation)
**Access:** schoolFeature

**Input:** `{ schoolId, eventId }`

---

## Attendance

### `attendance.getAttendanceForChild` (query)
**Access:** protected

**Input:** `{ childId, startDate, endDate }`

### `attendance.reportAbsence` (mutation)
**Access:** protected

**Input:** `{ childId, startDate, endDate, reason }`

### `attendance.getSchoolAttendanceToday` (query)
**Access:** schoolStaff

Returns today's attendance summary for the school.

---

## Payments

### `payments.listOutstandingPayments` (query)
**Access:** protected

Returns all unpaid items for the current parent's children.

### `payments.createCheckoutSession` (mutation)
**Access:** protected

Creates a Stripe checkout session for a single payment.

**Input:** `{ paymentItemId, childId }`

### `payments.createCartCheckout` (mutation)
**Access:** protected

Creates a Stripe checkout session for multiple items.

**Input:** `{ items: [{ paymentItemId, childId }] }`

### `payments.createPaymentItem` (mutation)
**Access:** schoolFeature

Creates a new payment request.

**Input:**
| Field | Type | Required |
|-------|------|----------|
| schoolId | string | yes |
| title | string | yes |
| description | string | no |
| amount | number (pence) | yes |
| dueDate | Date | no |
| category | `DINNER_MONEY` \| `TRIP` \| `CLUB` \| `UNIFORM` \| `OTHER` | yes |
| allChildren | boolean | no |
| childIds | string[] | no |

### `payments.listPaymentItems` (query)
**Access:** schoolFeature

**Input:** `{ schoolId, page, limit }`

### `payments.getPaymentHistory` (query)
**Access:** protected

**Input:** `{ page, limit }`

### `payments.getReceipt` (query)
**Access:** protected

**Input:** `{ paymentId }`

---

## Stripe

### `stripe.createOnboardingLink` (mutation)
**Access:** schoolAdmin

Creates a Stripe Connect onboarding link for the school.

### `stripe.getStripeStatus` (query)
**Access:** schoolAdmin

Returns the school's Stripe Connect account status.

---

## Forms

### `forms.getTemplates` (query)
**Access:** schoolFeature

Lists all form templates for the school.

### `forms.createTemplate` (mutation)
**Access:** schoolFeature

**Input:** `{ title, description?, fields: [{ label, type, required, options? }] }`

### `forms.getTemplate` (query)
**Access:** protected

**Input:** `{ templateId }`

### `forms.getPendingForms` (query)
**Access:** protected

**Input:** `{ childId }`

### `forms.getCompletedForms` (query)
**Access:** protected

**Input:** `{ childId }`

### `forms.submitForm` (mutation)
**Access:** protected

**Input:** `{ templateId, childId, data: Record<string, any>, signature? }`

---

## Class Posts

### `classPost.getUploadUrl` (mutation)
**Access:** schoolStaff

Gets a presigned S3 upload URL for media.

**Input:** `{ schoolId, filename, contentType }`

**Response:** `{ uploadUrl, publicUrl }`

### `classPost.create` (mutation)
**Access:** schoolFeature

**Input:** `{ schoolId, yearGroup, className, body?, mediaUrls? }`

### `classPost.delete` (mutation)
**Access:** schoolStaff

**Input:** `{ schoolId, postId }`

### `classPost.getById` (query)
**Access:** protected

**Input:** `{ postId }`

### `classPost.listRecent` (query)
**Access:** schoolStaff

**Input:** `{ schoolId, limit? }`

### `classPost.listByClass` (query)
**Access:** schoolStaff

**Input:** `{ schoolId, yearGroup, className, limit?, cursor? }`

### `classPost.feed` (query)
**Access:** protected

Returns class posts for a child's class.

**Input:** `{ childId, limit?, cursor? }`

### `classPost.react` (mutation)
**Access:** protected

**Input:** `{ postId, emoji: HEART|THUMBS_UP|CLAP|LAUGH|WOW }`

### `classPost.removeReaction` (mutation)
**Access:** protected

**Input:** `{ postId }`

---

## Community

### `community.createPost` (mutation)
**Access:** protected

**Input:**
| Field | Type | Required |
|-------|------|----------|
| schoolId | string | yes |
| type | `DISCUSSION` \| `EVENT` \| `VOLUNTEER_REQUEST` | yes |
| title | string | yes |
| body | string | yes |
| tags | string[] | no |
| imageUrls | string[] | no |
| volunteerSlots | object[] | no |

### `community.listPosts` (query)
**Access:** protected

**Input:** `{ schoolId, type?, tag?, limit?, cursor? }`

### `community.getPost` (query)
**Access:** protected

**Input:** `{ postId }`

### `community.addComment` (mutation)
**Access:** protected

**Input:** `{ postId, body }`

### `community.getComments` (query)
**Access:** protected

**Input:** `{ postId, limit?, cursor? }`

### `community.signUpForSlot` (mutation)
**Access:** protected

**Input:** `{ slotId }`

### `community.cancelSignup` (mutation)
**Access:** protected

**Input:** `{ slotId }`

### `community.pinPost` (mutation)
**Access:** schoolFeature

**Input:** `{ schoolId, postId, pinned }`

### `community.removePost` (mutation)
**Access:** schoolFeature

**Input:** `{ schoolId, postId, reason }`

---

## Meal Booking

### `mealBooking.createMenu` (mutation)
**Access:** schoolFeature

**Input:** `{ schoolId, weekStarting, options: [{ day, name, description?, category, allergens?, priceInPence }] }`

### `mealBooking.publishMenu` (mutation)
**Access:** schoolFeature

**Input:** `{ schoolId, menuId }`

### `mealBooking.getMenuForWeek` (query)
**Access:** protected

**Input:** `{ schoolId, weekStarting }`

### `mealBooking.listMenus` (query)
**Access:** schoolFeature

**Input:** `{ schoolId, limit? }`

### `mealBooking.bookMeal` (mutation)
**Access:** protected

**Input:** `{ childId, mealOptionId, date }`

### `mealBooking.cancelBooking` (mutation)
**Access:** protected

**Input:** `{ bookingId }`

### `mealBooking.getBookingsForChild` (query)
**Access:** protected

**Input:** `{ childId, weekStarting }`

### `mealBooking.updateDietaryProfile` (mutation)
**Access:** protected

**Input:** `{ childId, allergies?, dietaryNeeds?, otherNotes? }`

### `mealBooking.getDietaryProfile` (query)
**Access:** protected

**Input:** `{ childId }`

### `mealBooking.getKitchenSummary` (query)
**Access:** schoolFeature

**Input:** `{ schoolId, date }`

### `mealBooking.toggleOptionAvailability` (mutation)
**Access:** schoolFeature

**Input:** `{ schoolId, optionId, available }`

---

## Parents Evening

### `parentsEvening.create` (mutation)
**Access:** schoolAdmin

**Input:** `{ title, date, slotDurationMin, breakDurationMin, startTime, endTime, bookingOpensAt, bookingClosesAt, allowVideoCall? }`

### `parentsEvening.addTeachers` (mutation)
**Access:** schoolAdmin

**Input:** `{ parentsEveningId, staffIds[] }`

### `parentsEvening.publish` (mutation)
**Access:** schoolAdmin

**Input:** `{ parentsEveningId }`

### `parentsEvening.list` (query)
**Access:** protected

**Input:** `{ schoolId? }`

### `parentsEvening.listAll` (query)
**Access:** schoolAdmin

### `parentsEvening.getSlots` (query)
**Access:** protected

**Input:** `{ parentsEveningId, staffId? }`

### `parentsEvening.book` (mutation)
**Access:** protected

**Input:** `{ slotId, childId }`

### `parentsEvening.cancelBooking` (mutation)
**Access:** protected

**Input:** `{ slotId }`

### `parentsEvening.addNotes` (mutation)
**Access:** schoolStaff

**Input:** `{ slotId, notes }`

### `parentsEvening.setVideoLink` (mutation)
**Access:** schoolStaff

**Input:** `{ slotId, videoCallLink (url) }`

---

## Report Cards

### `reportCard.createCycle` (mutation)
**Access:** schoolFeature

**Input:** `{ schoolId, name, type: TERMLY|HALF_TERMLY|END_OF_YEAR|MOCK|CUSTOM, assessmentModel: PRIMARY_DESCRIPTIVE|SECONDARY_GRADES, publishDate }`

### `reportCard.listCycles` (query)
**Access:** schoolFeature

**Input:** `{ schoolId }`

### `reportCard.publishCycle` (mutation)
**Access:** schoolFeature

**Input:** `{ schoolId, cycleId }`

### `reportCard.saveGrades` (mutation)
**Access:** schoolFeature

**Input:** `{ schoolId, cycleId, childId, generalComment?, attendancePct?, grades[] }`

### `reportCard.getReportCard` (query)
**Access:** protected

**Input:** `{ childId, cycleId }`

### `reportCard.listReportsForChild` (query)
**Access:** protected

**Input:** `{ childId }`

### `reportCard.getChildrenForCycle` (query)
**Access:** schoolFeature

**Input:** `{ schoolId, cycleId, yearGroup? }`

### `reportCard.generatePdf` (mutation)
**Access:** protected

**Input:** `{ childId, cycleId }`

---

## Wellbeing

### `wellbeing.submitCheckIn` (mutation)
**Access:** protected

**Input:** `{ childId, mood: GREAT|GOOD|OK|LOW|STRUGGLING, note? }`

### `wellbeing.staffCheckIn` (mutation)
**Access:** schoolFeature

**Input:** `{ schoolId, childId, mood, note? }`

### `wellbeing.getCheckIns` (query)
**Access:** protected

**Input:** `{ childId, startDate, endDate }`

### `wellbeing.getClassOverview` (query)
**Access:** schoolFeature

**Input:** `{ schoolId, date? }`

### `wellbeing.getAlerts` (query)
**Access:** schoolFeature

**Input:** `{ schoolId, status?: OPEN|ACKNOWLEDGED|RESOLVED }`

### `wellbeing.acknowledgeAlert` (mutation)
**Access:** schoolFeature

**Input:** `{ schoolId, alertId }`

### `wellbeing.resolveAlert` (mutation)
**Access:** schoolFeature

**Input:** `{ schoolId, alertId, note? }`

### `wellbeing.createManualAlert` (mutation)
**Access:** schoolFeature

**Input:** `{ schoolId, childId, note? }`

---

## Emergency

### `emergency.initiateAlert` (mutation)
**Access:** schoolFeature

**Input:** `{ schoolId, type: LOCKDOWN|EVACUATION|SHELTER_IN_PLACE|MEDICAL|OTHER, message? }`

### `emergency.getActiveAlert` (query)
**Access:** schoolFeature

**Input:** `{ schoolId }`

### `emergency.postUpdate` (mutation)
**Access:** schoolFeature

**Input:** `{ schoolId, alertId, message }`

### `emergency.resolveAlert` (mutation)
**Access:** schoolFeature

**Input:** `{ schoolId, alertId, status: ALL_CLEAR|CANCELLED, reason? }`

### `emergency.getAlertHistory` (query)
**Access:** schoolFeature

**Input:** `{ schoolId, limit?, cursor? }`

---

## Analytics

### `analytics.termStart` (query)
**Access:** schoolStaff

### `analytics.attendance` (query)
**Access:** schoolStaff

**Input:** `{ from, to }`

### `analytics.payments` (query)
**Access:** schoolStaff

**Input:** `{ from, to }`

### `analytics.forms` (query)
**Access:** schoolStaff

**Input:** `{ from, to }`

### `analytics.messages` (query)
**Access:** schoolStaff

**Input:** `{ from, to }`

### `analytics.getAttendanceSummary` (query)
**Access:** schoolFeature

**Input:** `{ schoolId, startDate, endDate }`

### `analytics.getPaymentSummary` (query)
**Access:** schoolFeature

**Input:** `{ schoolId, startDate, endDate }`

### `analytics.getMessageEngagement` (query)
**Access:** schoolFeature

**Input:** `{ schoolId, startDate, endDate }`

### `analytics.getFormCompletion` (query)
**Access:** schoolFeature

**Input:** `{ schoolId }`

### `analytics.getDashboardSummary` (query)
**Access:** schoolFeature

**Input:** `{ schoolId }`

---

## Settings

### `settings.getProfile` (query)
**Access:** protected

### `settings.updateProfile` (mutation)
**Access:** protected

**Input:** `{ name, phone?, language? }`

### `settings.getNotificationPreferences` (query)
**Access:** protected

### `settings.updateNotificationPreferences` (mutation)
**Access:** protected

**Input:** `{ notifyByPush, notifyBySms, notifyByEmail, quietStart?, quietEnd? }`

### `settings.getSchoolSettings` (query)
**Access:** schoolAdmin

### `settings.updateSchoolSettings` (mutation)
**Access:** schoolAdmin

**Input:** `{ name, defaultNotifyByPush, defaultNotifyBySms, defaultNotifyByEmail }`

### `settings.getFeatureToggles` (query)
**Access:** schoolStaff

### `settings.getFeatureTogglesForParent` (query)
**Access:** protected

### `settings.updateFeatureToggles` (mutation)
**Access:** schoolAdmin

**Input:** `{ messagingEnabled?, paymentsEnabled?, attendanceEnabled?, calendarEnabled?, formsEnabled?, classPostsEnabled?, parentsEveningEnabled?, reportCardsEnabled?, wellbeingEnabled?, emergencyEnabled?, mealBookingEnabled?, communityEnabled?, translationEnabled?, analyticsEnabled?, reportsEnabled?, clubsEnabled?, tripsEnabled? }`

### `settings.getBranding` (query)
**Access:** schoolAdmin

### `settings.updateBranding` (mutation)
**Access:** schoolAdmin

**Input:** `{ brandColor? (hex), secondaryColor? (hex), schoolMotto?, brandFont? }`

---

## Staff

### `staff.list` (query)
**Access:** schoolAdmin

### `staff.remove` (mutation)
**Access:** schoolAdmin

**Input:** `{ userId }`

### `staff.updateRole` (mutation)
**Access:** schoolAdmin

**Input:** `{ userId, role: ADMIN|TEACHER|OFFICE }`

---

## Translation

### `translation.translate` (mutation)
**Access:** protected

**Input:** `{ texts: string[], targetLang, sourceLang? }`

---

## Homework

### `homework.setHomework` (mutation)
**Access:** schoolFeature

Creates a new homework assignment.

**Input:**
| Field | Type | Required |
|-------|------|----------|
| schoolId | string | yes |
| subject | string (1-100) | yes |
| title | string (1-200) | yes |
| description | string (max 2000) | no |
| yearGroup | string (1-50) | yes |
| className | string (max 100) | no |
| setDate | Date | yes |
| dueDate | Date | yes |
| attachmentUrls | string[] (max 10) | no |
| isReadingTask | boolean | no (default false) |

### `homework.listForChild` (query)
**Access:** protected

Lists active homework assignments for a child (parent must be linked).

**Input:** `{ childId, cursor?, limit? (1-50, default 20) }`

### `homework.listForTeacher` (query)
**Access:** schoolFeature

Lists homework assignments set by the current teacher.

**Input:** `{ schoolId }`

### `homework.markComplete` (mutation)
**Access:** protected

Marks a homework assignment as completed for a child.

**Input:** `{ assignmentId, childId }`

### `homework.markInProgress` (mutation)
**Access:** protected

Marks a homework assignment as in-progress for a child.

**Input:** `{ assignmentId, childId }`

### `homework.gradeHomework` (mutation)
**Access:** schoolFeature

Grades a single homework completion.

**Input:** `{ schoolId, completionId, grade (1-10 chars), feedback? (max 500) }`

### `homework.bulkGrade` (mutation)
**Access:** schoolFeature

Grades multiple homework completions for an assignment in a single transaction.

**Input:** `{ schoolId, assignmentId, grades: [{ childId, grade (1-10 chars), feedback? }] (max 100) }`

### `homework.cancelHomework` (mutation)
**Access:** schoolFeature

Cancels a homework assignment.

**Input:** `{ schoolId, assignmentId }`

---

## Reading Diary

### `readingDiary.logReading` (mutation)
**Access:** protected

Logs a reading entry for a child (parent only).

**Input:**
| Field | Type | Required |
|-------|------|----------|
| childId | string | yes |
| date | Date | yes |
| bookTitle | string (1-200) | yes |
| pagesOrChapter | string (max 100) | no |
| minutesRead | number (0-600) | no |
| readWith | `ALONE` \| `PARENT` \| `TEACHER` \| `SIBLING` \| `OTHER` | yes |
| parentComment | string (max 1000) | no |

### `readingDiary.getEntries` (query)
**Access:** protected

Returns reading entries for a child within a date range. Accessible by parent or staff at the child's school.

**Input:** `{ childId, startDate, endDate }`

### `readingDiary.addTeacherComment` (mutation)
**Access:** schoolFeature

Adds a teacher comment to an existing reading entry.

**Input:** `{ schoolId, entryId, teacherComment (max 500) }`

### `readingDiary.createTeacherEntry` (mutation)
**Access:** schoolFeature

Creates a reading entry on behalf of a child (teacher-initiated).

**Input:** `{ schoolId, childId, date, bookTitle (1-200), minutesRead? (0-600), readWith, teacherComment? (max 500) }`

### `readingDiary.updateDiary` (mutation)
**Access:** schoolFeature

Updates diary metadata (current book, reading level, target minutes).

**Input:** `{ schoolId, childId, currentBook? (max 200), readingLevel? (max 50), targetMinsPerDay? (0-300) }`

### `readingDiary.getDiary` (query)
**Access:** protected

Returns reading diary metadata for a child. Accessible by parent or staff.

**Input:** `{ childId }`

### `readingDiary.getClassOverview` (query)
**Access:** schoolFeature

Returns a reading overview for all children at the school (reading level, last entry, entries this week).

**Input:** `{ schoolId }`

### `readingDiary.getStats` (query)
**Access:** protected

Returns reading statistics for a child (total entries, avg minutes, days read this week, current streak). Accessible by parent or staff.

**Input:** `{ childId }`

---

## Visitor

### `visitor.signIn` (mutation)
**Access:** schoolFeature

Signs in a visitor. Creates a new visitor record if not found. Returns a DBS warning if the visitor is volunteering without a valid DBS check.

**Input:**
| Field | Type | Required |
|-------|------|----------|
| schoolId | string | yes |
| name | string (1-200) | yes |
| organisation | string (max 200) | no |
| phone | string (max 30) | no |
| email | string (email, max 254) | no |
| isRegular | boolean | no (default false) |
| purpose | `MEETING` \| `MAINTENANCE` \| `DELIVERY` \| `VOLUNTEERING` \| `INSPECTION` \| `PARENT_VISIT` \| `CONTRACTOR` \| `OTHER` | yes |
| visitingStaff | string (max 200) | no |
| badgeNumber | string (max 50) | no |

### `visitor.signOut` (mutation)
**Access:** schoolFeature

Signs out a visitor by updating the visitor log.

**Input:** `{ schoolId, logId }`

### `visitor.searchVisitors` (query)
**Access:** schoolFeature

Searches visitors by name (case-insensitive). Returns up to 10 results, regulars first.

**Input:** `{ schoolId, query (max 200) }`

### `visitor.getOnSite` (query)
**Access:** schoolFeature

Returns all visitors currently on site (not signed out).

**Input:** `{ schoolId }`

### `visitor.addOrUpdateDbs` (mutation)
**Access:** schoolFeature

Adds a DBS record for a visitor or user. Status is auto-computed from the expiry date.

**Input:**
| Field | Type | Required |
|-------|------|----------|
| schoolId | string | yes |
| name | string (1-200) | yes |
| dbsNumber | string (1-50) | yes |
| dbsType | `BASIC` \| `STANDARD` \| `ENHANCED` \| `ENHANCED_BARRED` | yes |
| issueDate | Date | yes |
| expiryDate | Date | no |
| visitorId | string | no |
| userId | string | no |

### `visitor.getDbsRegister` (query)
**Access:** schoolFeature

Returns all DBS records for the school.

**Input:** `{ schoolId }`

### `visitor.getVisitorHistory` (query)
**Access:** schoolFeature

Returns paginated visitor log history with optional filters.

**Input:** `{ schoolId, limit? (1-100, default 20), cursor?, startDate?, endDate?, name? (max 200), purpose? }`

### `visitor.getFireRegister` (query)
**Access:** schoolFeature

Returns all visitors currently on site plus staff count, for fire evacuation purposes.

**Input:** `{ schoolId }`

---

## MIS (Management Information System)

### `mis.setupConnection` (mutation)
**Access:** schoolAdmin

Configures or updates the MIS connection for a school. Credentials are never returned to the client.

**Input:**
| Field | Type | Required |
|-------|------|----------|
| schoolId | string | yes |
| provider | `SIMS` \| `ARBOR` \| `BROMCOM` \| `SCHOLARPACK` \| `CSV_MANUAL` | yes |
| apiUrl | string (url, max 2048) | no |
| credentials | string (1-4096) | yes |
| syncFrequency | `HOURLY` \| `TWICE_DAILY` \| `DAILY` \| `MANUAL` | yes |

### `mis.testConnection` (query)
**Access:** schoolFeature

Tests the current MIS connection.

**Input:** `{ schoolId }`

**Response:** `{ success: boolean }`

### `mis.uploadStudentsCsv` (mutation)
**Access:** schoolFeature

Imports students from CSV data. Matches existing students by firstName + lastName + DOB. Creates or updates child records.

**Input:** `{ schoolId, csvData (max 5MB) }`

**Response:** `{ created, updated, skipped, errors[], total }`

### `mis.uploadAttendanceCsv` (mutation)
**Access:** schoolFeature

Imports attendance records from CSV data. Matches students by name + DOB.

**Input:** `{ schoolId, csvData (max 5MB) }`

**Response:** `{ created, updated, skipped, errors[], total }`

### `mis.getConnectionStatus` (query)
**Access:** schoolFeature

Returns the current MIS connection status (or null if not configured).

**Input:** `{ schoolId }`

### `mis.getSyncHistory` (query)
**Access:** schoolFeature

Returns recent sync log entries.

**Input:** `{ schoolId, limit? (1-100, default 20) }`

### `mis.disconnect` (mutation)
**Access:** schoolAdmin

Disconnects the MIS integration (sets status to DISCONNECTED).

**Input:** `{ schoolId }`

---

## Achievement

### `achievement.createCategory` (mutation)
**Access:** schoolAdmin

Creates an achievement category (e.g. "Star of the Week", "Reading Champion").

**Input:**
| Field | Type | Required |
|-------|------|----------|
| schoolId | string | yes |
| name | string (1-100) | yes |
| icon | string (max 100) | no |
| pointValue | number (positive int, default 1) | no |
| type | `POINTS` \| `BADGE` | no (default `POINTS`) |

### `achievement.listCategories` (query)
**Access:** schoolFeature

Lists active achievement categories for the school.

**Input:** `{ schoolId }`

### `achievement.awardAchievement` (mutation)
**Access:** schoolFeature

Awards an achievement to a child. Points are derived from the category.

**Input:** `{ schoolId, childId, categoryId, reason? (max 500) }`

### `achievement.getChildAchievements` (query)
**Access:** protected

Returns paginated achievements and total points for a child (parent only).

**Input:** `{ childId, cursor?, limit? (1-50, default 20) }`

**Response:** `{ awards[], totalPoints, nextCursor? }`

### `achievement.getClassLeaderboard` (query)
**Access:** schoolFeature

Returns top 20 children by total achievement points.

**Input:** `{ schoolId }`

### `achievement.getRecentAwards` (query)
**Access:** protected

Returns the 10 most recent achievements across all of the parent's children. No input required.

### `achievement.deactivateCategory` (mutation)
**Access:** schoolAdmin

Deactivates an achievement category (soft-delete).

**Input:** `{ schoolId, categoryId }`

---

## Gallery

### `gallery.createAlbum` (mutation)
**Access:** schoolStaff

Creates a new photo album.

**Input:** `{ schoolId, title (1-200), description? (max 2000), yearGroup? (max 50), className? (max 100) }`

### `gallery.addPhotos` (mutation)
**Access:** schoolStaff

Adds photos to an album. Photos are linked via media upload IDs.

**Input:** `{ schoolId, albumId, photos: [{ mediaId, caption? (max 500) }] }`

### `gallery.listAlbums` (query)
**Access:** protected

Lists albums. Staff see all albums; parents see only published albums filtered by their children's year groups.

**Input:** `{ schoolId? }`

### `gallery.getAlbum` (query)
**Access:** protected

Returns album details with all photos. Parents can only view published albums.

**Input:** `{ albumId }`

### `gallery.publishAlbum` (mutation)
**Access:** schoolStaff

Publishes or unpublishes an album.

**Input:** `{ schoolId, albumId, isPublished }`

### `gallery.deleteAlbum` (mutation)
**Access:** schoolStaff

Deletes an album and its photos.

**Input:** `{ schoolId, albumId }`

### `gallery.deletePhoto` (mutation)
**Access:** schoolStaff

Deletes a single photo from an album.

**Input:** `{ schoolId, photoId }`

---

## Media

### `media.getUploadUrl` (mutation)
**Access:** schoolFeature

Gets a presigned S3 upload URL. Validates file type and size (images and videos).

**Input:** `{ schoolId, filename (1-255), mimeType (1-127), sizeBytes (positive int) }`

### `media.confirmUpload` (mutation)
**Access:** schoolFeature

Confirms a completed upload and creates the media record in the database.

**Input:** `{ schoolId, key (1-512), filename (1-255), mimeType (1-127), sizeBytes (positive int), width?, height? }`

---

## Progress Summary

### `progressSummary.getLatestSummary` (query)
**Access:** protected

Returns the most recent weekly progress summary for a child (parent only).

**Input:** `{ childId }`

### `progressSummary.getSummaryHistory` (query)
**Access:** protected

Returns paginated progress summary history for a child (parent only).

**Input:** `{ childId, limit? (1-50, default 10), cursor? }`

**Response:** `{ items[], nextCursor? }`

### `progressSummary.generateNow` (mutation)
**Access:** schoolFeature

Generates a weekly progress summary for a specific child. Skips regeneration if the summary was updated within the last hour.

**Input:** `{ schoolId, childId }`

### `progressSummary.generateWeeklyBatch` (mutation)
**Access:** schoolAdmin

Starts background generation of weekly summaries for all children at the school.

**Input:** `{ schoolId }`

**Response:** `{ status: "started", childCount }`

---

## Club Booking

### `clubBooking.listClubs` (query)
**Access:** protected

Lists clubs for a school.

**Input:** `{ schoolId, activeOnly? (default true) }`

### `clubBooking.getClub` (query)
**Access:** protected

Returns club details including active enrollments.

**Input:** `{ clubId }`

### `clubBooking.createClub` (mutation)
**Access:** schoolFeature

Creates a new club.

**Input:**
| Field | Type | Required |
|-------|------|----------|
| schoolId | string | yes |
| name | string (1-200) | yes |
| description | string (max 1000) | no |
| staffLead | string (max 200) | no |
| day | `MONDAY` \| `TUESDAY` \| `WEDNESDAY` \| `THURSDAY` \| `FRIDAY` \| `SATURDAY` \| `SUNDAY` | yes |
| startTime | string (HH:mm) | yes |
| endTime | string (HH:mm) | yes |
| maxCapacity | number (1-500) | yes |
| feeInPence | number (min 0, default 0) | no |
| yearGroups | string[] | no |
| termStartDate | Date | yes |
| termEndDate | Date | yes |

### `clubBooking.updateClub` (mutation)
**Access:** schoolFeature

Updates an existing club. All fields except `schoolId` and `clubId` are optional.

**Input:** `{ schoolId, clubId, name?, description?, staffLead?, day?, startTime?, endTime?, maxCapacity?, feeInPence?, yearGroups?, isActive? }`

### `clubBooking.deleteClub` (mutation)
**Access:** schoolFeature

Deletes a club.

**Input:** `{ schoolId, clubId }`

### `clubBooking.enroll` (mutation)
**Access:** protected

Enrols a child in a club. Checks capacity, year group restrictions, and duplicate enrolment.

**Input:** `{ clubId, childId }`

### `clubBooking.unenroll` (mutation)
**Access:** protected

Cancels a child's club enrolment.

**Input:** `{ clubId, childId }`

### `clubBooking.getEnrollmentsForChild` (query)
**Access:** protected

Returns all active club enrolments for a child.

**Input:** `{ childId }`

---

## DB Init (dev only)

### `dbInit.initTables` (mutation)
**Access:** public (blocked in production)

Creates the invitations table. Development/setup only.

---

## Webhooks (non-tRPC)

### `POST /api/webhooks/stripe`
Stripe webhook endpoint. Verifies signature and processes payment events.

### `GET /health`
Health check endpoint for load balancers.

### `GET /api/auth/*`
better-auth endpoints (login, register, session, etc).
