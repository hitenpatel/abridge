## ADDED Requirements

### Requirement: Admin can view school settings
The system SHALL display school name and default notification preferences to admin users only.

#### Scenario: Admin sees school settings card
- **WHEN** an admin user views the settings page
- **THEN** a School Settings card/section SHALL be visible with the current school name and default notification preference toggles

#### Scenario: Non-admin does not see school settings
- **WHEN** a non-admin user (parent, teacher, office) views the settings page
- **THEN** the School Settings card/section SHALL NOT be rendered

### Requirement: Admin can update school name
The system SHALL allow admin users to update the school name.

#### Scenario: Update school name successfully
- **WHEN** admin changes the school name to a non-empty value and clicks Save
- **THEN** the system SHALL persist the new school name and show a success message

#### Scenario: Reject empty school name
- **WHEN** admin attempts to save with an empty school name
- **THEN** the system SHALL show a validation error and NOT persist the change

### Requirement: Admin can configure default notification preferences
The system SHALL allow admin users to set default notification preferences (push, SMS, email) for new members joining the school.

#### Scenario: Update default notification toggles
- **WHEN** admin toggles default push, SMS, or email preferences and clicks Save
- **THEN** the system SHALL persist the updated defaults on the School record

#### Scenario: Defaults do not affect existing users
- **WHEN** admin changes default notification preferences
- **THEN** existing users' personal notification preferences SHALL NOT be changed

### Requirement: School defaults applied to new users on invitation acceptance
The system SHALL apply the school's default notification preferences to new users when they accept an invitation.

#### Scenario: New user gets school defaults
- **WHEN** a new user (no existing account) accepts a school invitation
- **THEN** the user's notification preferences (push, SMS, email) SHALL be set to the school's default values

#### Scenario: Existing user keeps their preferences
- **WHEN** an existing user accepts a school invitation
- **THEN** the user's existing notification preferences SHALL NOT be overwritten

### Requirement: Server-side authorization for school settings
The system SHALL enforce admin-only access to school settings at the API level.

#### Scenario: Non-admin API call rejected
- **WHEN** a non-admin user calls `settings.getSchoolSettings` or `settings.updateSchoolSettings`
- **THEN** the server SHALL return a FORBIDDEN error
