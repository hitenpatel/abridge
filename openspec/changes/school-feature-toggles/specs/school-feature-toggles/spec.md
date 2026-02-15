## ADDED Requirements

### Requirement: School has feature toggles
Each school SHALL have independent boolean toggles for 5 features: Messaging, Payments, Attendance, Calendar, and Forms. All toggles SHALL default to enabled (`true`).

#### Scenario: New school has all features enabled
- **WHEN** a new school is created
- **THEN** all 5 feature toggles (messagingEnabled, paymentsEnabled, attendanceEnabled, calendarEnabled, formsEnabled) SHALL be `true`

#### Scenario: Existing schools receive enabled defaults via migration
- **WHEN** the migration runs on an existing database
- **THEN** all existing schools SHALL have all 5 feature toggles set to `true`

### Requirement: School has payment category sub-toggles
Each school SHALL have independent boolean toggles for 5 payment categories: Dinner Money, Trips, Clubs, Uniform, and Other. All sub-toggles SHALL default to enabled (`true`). Sub-toggles only apply when the Payments master toggle is enabled.

#### Scenario: New school has all payment categories enabled
- **WHEN** a new school is created
- **THEN** all 5 payment category sub-toggles (paymentDinnerMoneyEnabled, paymentTripsEnabled, paymentClubsEnabled, paymentUniformEnabled, paymentOtherEnabled) SHALL be `true`

### Requirement: API blocks access to disabled features
The system SHALL return a FORBIDDEN error when any procedure on a disabled feature's router is called.

#### Scenario: Messaging disabled blocks messaging procedures
- **WHEN** a staff member calls any messaging router procedure for a school with `messagingEnabled = false`
- **THEN** the API SHALL return a FORBIDDEN TRPCError with message "Messaging is disabled for this school"

#### Scenario: Payments disabled blocks payment procedures
- **WHEN** a staff member calls any payments router procedure for a school with `paymentsEnabled = false`
- **THEN** the API SHALL return a FORBIDDEN TRPCError with message "Payments is disabled for this school"

#### Scenario: Attendance disabled blocks attendance procedures
- **WHEN** a staff member calls any attendance router procedure for a school with `attendanceEnabled = false`
- **THEN** the API SHALL return a FORBIDDEN TRPCError with message "Attendance is disabled for this school"

#### Scenario: Calendar disabled blocks calendar procedures
- **WHEN** a staff member calls any calendar router procedure for a school with `calendarEnabled = false`
- **THEN** the API SHALL return a FORBIDDEN TRPCError with message "Calendar is disabled for this school"

#### Scenario: Forms disabled blocks forms procedures
- **WHEN** a staff member calls any forms router procedure for a school with `formsEnabled = false`
- **THEN** the API SHALL return a FORBIDDEN TRPCError with message "Forms is disabled for this school"

#### Scenario: Enabled feature allows normal access
- **WHEN** a staff member calls a procedure on a feature with its toggle set to `true`
- **THEN** the procedure SHALL execute normally

### Requirement: API blocks creation of disabled payment categories
The system SHALL return a FORBIDDEN error when staff attempt to create a PaymentItem with a category whose sub-toggle is disabled, even if the Payments master toggle is enabled.

#### Scenario: Disabled category blocks payment creation
- **WHEN** a staff member creates a PaymentItem with category TRIP for a school with `paymentTripsEnabled = false` and `paymentsEnabled = true`
- **THEN** the API SHALL return a FORBIDDEN TRPCError with message "Trip payments are disabled for this school"

#### Scenario: Existing items of disabled category remain accessible
- **WHEN** a payment category sub-toggle is set to `false` but PaymentItems of that category already exist
- **THEN** existing PaymentItems SHALL remain visible and payable

#### Scenario: Enabled category allows payment creation
- **WHEN** a staff member creates a PaymentItem with a category whose sub-toggle is `true`
- **THEN** the PaymentItem SHALL be created normally

### Requirement: Feature toggle context loaded in middleware
The system SHALL load all 10 feature toggle values into the tRPC context for school-scoped procedures.

#### Scenario: Feature toggles available in context
- **WHEN** a school-scoped procedure executes
- **THEN** `ctx.schoolFeatures` SHALL contain all 10 boolean toggle values for the current school

### Requirement: Admin can read feature toggles
Any staff member SHALL be able to read the current feature toggle values for their school.

#### Scenario: Staff reads feature toggles
- **WHEN** a staff member calls `settings.getFeatureToggles` with their schoolId
- **THEN** the API SHALL return all 10 toggle values

#### Scenario: Non-staff cannot read toggles
- **WHEN** a non-staff user calls `settings.getFeatureToggles`
- **THEN** the API SHALL return a FORBIDDEN error

### Requirement: Admin can update feature toggles
Only admin staff SHALL be able to update feature toggle values for their school.

#### Scenario: Admin updates a feature toggle
- **WHEN** an admin calls `settings.updateFeatureToggles` with `{ messagingEnabled: false }`
- **THEN** the system SHALL persist `messagingEnabled = false` for that school and return the updated toggles

#### Scenario: Admin updates multiple toggles at once
- **WHEN** an admin calls `settings.updateFeatureToggles` with `{ paymentsEnabled: false, formsEnabled: false }`
- **THEN** the system SHALL persist both changes and return the updated toggles

#### Scenario: Non-admin cannot update toggles
- **WHEN** a non-admin staff member calls `settings.updateFeatureToggles`
- **THEN** the API SHALL return a FORBIDDEN error

#### Scenario: Partial update preserves other toggles
- **WHEN** an admin updates only `calendarEnabled` to `false`
- **THEN** all other toggle values SHALL remain unchanged

### Requirement: Web navigation hides disabled features
The web dashboard navigation SHALL NOT display menu items for features that are disabled for the current school.

#### Scenario: Disabled feature hidden from nav
- **WHEN** a school has `paymentsEnabled = false`
- **THEN** the Payments menu item SHALL NOT appear in the dashboard navigation

#### Scenario: All enabled features shown in nav
- **WHEN** a school has all 5 features enabled
- **THEN** all 5 feature menu items SHALL appear in the dashboard navigation

### Requirement: Web shows informational message on disabled feature pages
The system SHALL display an informational message if a user navigates directly to a disabled feature's page URL.

#### Scenario: Direct URL to disabled feature
- **WHEN** a user navigates to `/dashboard/payments` for a school with `paymentsEnabled = false`
- **THEN** the page SHALL display a message indicating the feature is not enabled for this school

### Requirement: Mobile navigation hides disabled features
The mobile app navigation SHALL NOT display tabs or screens for features that are disabled for the current school.

#### Scenario: Disabled feature hidden from mobile tabs
- **WHEN** a school has `attendanceEnabled = false`
- **THEN** the Attendance tab/screen SHALL NOT appear in the mobile app navigation
