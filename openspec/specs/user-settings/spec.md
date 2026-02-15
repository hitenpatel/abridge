## ADDED Requirements

### Requirement: User can view their profile
The system SHALL display the authenticated user's name, email, and phone number on the settings page.

#### Scenario: View profile on web
- **WHEN** an authenticated user navigates to `/dashboard/settings`
- **THEN** the Profile card SHALL display the user's current name, email (read-only), and phone

#### Scenario: View profile on mobile
- **WHEN** an authenticated user opens the Settings screen
- **THEN** the Profile section SHALL display the user's current name, email (read-only), and phone

### Requirement: User can update their name and phone
The system SHALL allow authenticated users to update their name and phone number. Email SHALL be read-only.

#### Scenario: Update name successfully
- **WHEN** user changes name to a non-empty value and clicks Save
- **THEN** the system SHALL persist the new name and show a success message

#### Scenario: Reject empty name
- **WHEN** user attempts to save with an empty name
- **THEN** the system SHALL show a validation error and NOT persist the change

#### Scenario: Update phone
- **WHEN** user enters a phone number (or clears it) and clicks Save
- **THEN** the system SHALL persist the phone value (or null if cleared)

#### Scenario: Email is read-only
- **WHEN** user views the email field
- **THEN** the field SHALL be disabled with a hint "Contact admin to change your email"

### Requirement: User can view notification preferences
The system SHALL display the user's notification channel toggles (push, SMS, email) and quiet hours configuration.

#### Scenario: View notification preferences
- **WHEN** an authenticated user views the Notifications card/section
- **THEN** the system SHALL show toggle states for push, SMS, and email channels, and the current quiet hours configuration

### Requirement: User can update notification preferences
The system SHALL allow users to toggle push, SMS, and email notification channels independently, and configure quiet hours.

#### Scenario: Toggle notification channel
- **WHEN** user toggles a notification channel (push, SMS, or email) and clicks Save
- **THEN** the system SHALL persist the updated toggle state

#### Scenario: Enable quiet hours
- **WHEN** user enables quiet hours and sets start time and end time (HH:mm format) and clicks Save
- **THEN** the system SHALL persist the quiet hours window

#### Scenario: Disable quiet hours
- **WHEN** user disables quiet hours and clicks Save
- **THEN** the system SHALL set both quietStart and quietEnd to null

#### Scenario: Quiet hours note
- **WHEN** quiet hours section is displayed
- **THEN** the system SHALL show the note "Urgent messages will still be delivered during quiet hours"

### Requirement: Settings page is accessible to all authenticated users
The system SHALL show a Settings link in the navigation for all roles (parent, teacher, office, admin) on both web and mobile.

#### Scenario: Parent sees Settings in navigation
- **WHEN** a parent user views the dashboard navigation
- **THEN** a Settings link SHALL be visible

#### Scenario: Staff sees Settings in navigation
- **WHEN** a staff user (teacher or office) views the dashboard navigation
- **THEN** a Settings link SHALL be visible

#### Scenario: Admin sees Settings in navigation
- **WHEN** an admin user views the dashboard navigation
- **THEN** a Settings link SHALL be visible

### Requirement: Save feedback
The system SHALL provide clear feedback on save operations.

#### Scenario: Successful save
- **WHEN** a save operation succeeds
- **THEN** the system SHALL show a success toast message

#### Scenario: Failed save
- **WHEN** a save operation fails due to a network or server error
- **THEN** the system SHALL show an error message
