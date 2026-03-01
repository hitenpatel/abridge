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
