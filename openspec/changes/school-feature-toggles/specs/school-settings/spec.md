## ADDED Requirements

### Requirement: Admin can view feature toggles in settings
The system SHALL display a "Features" section in the school settings page where admin users can see the current state of all feature toggles.

#### Scenario: Admin sees feature toggles section
- **WHEN** an admin user views the settings page
- **THEN** a "Features" section SHALL be visible with toggle switches for Messaging, Payments, Attendance, Calendar, and Forms

#### Scenario: Non-admin does not see feature toggles
- **WHEN** a non-admin user views the settings page
- **THEN** the "Features" section SHALL NOT be rendered

### Requirement: Admin can toggle features on and off
The system SHALL allow admin users to enable or disable features via toggle switches in the settings page.

#### Scenario: Admin disables a feature
- **WHEN** an admin toggles Payments to off and saves
- **THEN** the system SHALL persist `paymentsEnabled = false` and show a success message

#### Scenario: Admin re-enables a feature
- **WHEN** an admin toggles a previously disabled feature back to on and saves
- **THEN** the system SHALL persist the toggle as `true` and show a success message

### Requirement: Payment sub-toggles shown when Payments is enabled
The system SHALL display payment category sub-toggles (Dinner Money, Trips, Clubs, Uniform, Other) when the Payments master toggle is enabled.

#### Scenario: Payments enabled shows sub-toggles
- **WHEN** an admin views the Features section and Payments is enabled
- **THEN** the 5 payment category sub-toggles SHALL be visible, indented beneath the Payments toggle

#### Scenario: Payments disabled hides sub-toggles
- **WHEN** an admin views the Features section and Payments is disabled
- **THEN** the payment category sub-toggles SHALL NOT be visible

#### Scenario: Admin disables a payment category
- **WHEN** an admin toggles Trips to off while Payments is enabled, and saves
- **THEN** the system SHALL persist `paymentTripsEnabled = false` and show a success message
