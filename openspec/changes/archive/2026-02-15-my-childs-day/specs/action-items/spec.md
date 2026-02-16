## ADDED Requirements

### Requirement: Action items endpoint for a child
The system SHALL provide a `dashboard.getActionItems` endpoint that returns all outstanding actions a parent needs to take for a specific child. Action items are not paginated - they return the full list.

#### Scenario: Parent retrieves action items for their child
- **WHEN** a parent calls `dashboard.getActionItems` with `childId` for a child they are linked to
- **THEN** the system returns an array of action items, each with a `type`, display data, and an action identifier

#### Scenario: No outstanding actions
- **WHEN** a parent has no outstanding payments, pending forms, or unread urgent messages for a child
- **THEN** the system returns an empty array

### Requirement: Outstanding payments appear as action items
The system SHALL include unpaid or partially paid PaymentItems targeting the child as action items.

#### Scenario: Unpaid payment item
- **WHEN** a PaymentItem of £15.00 for "Science Museum Trip" targets the child and has no completed payments
- **THEN** the action items include `{ type: "payment", title: "Science Museum Trip", amountDuePence: 1500, dueDate: "2026-03-01", category: "TRIP", paymentItemId: "<id>" }`

#### Scenario: Partially paid payment item
- **WHEN** a PaymentItem of £15.00 targets the child and £5.00 has been paid
- **THEN** the action items include the item with `amountDuePence: 1000` (remaining balance)

#### Scenario: Fully paid payment item excluded
- **WHEN** a PaymentItem targets the child and has been fully paid
- **THEN** the item does NOT appear in action items

### Requirement: Pending forms appear as action items
The system SHALL include active FormTemplates at the child's school that the child has no FormResponse for as action items.

#### Scenario: Unsigned form
- **WHEN** a FormTemplate "Photo Consent Form" is active at the child's school and no FormResponse exists for that template + child
- **THEN** the action items include `{ type: "form", title: "Photo Consent Form", templateId: "<id>" }`

#### Scenario: Completed form excluded
- **WHEN** a FormResponse exists for the template and child
- **THEN** the form does NOT appear in action items

### Requirement: Unread urgent messages appear as action items
The system SHALL include messages with category URGENT that target the child and have not been read by the parent as action items.

#### Scenario: Unread urgent message
- **WHEN** an URGENT message "School Closure Tomorrow" targets the child and the parent has no MessageRead record for it
- **THEN** the action items include `{ type: "urgentMessage", subject: "School Closure Tomorrow", messageId: "<id>" }`

#### Scenario: Read urgent message excluded
- **WHEN** the parent has read the urgent message (MessageRead record exists)
- **THEN** the message does NOT appear in action items

#### Scenario: Non-urgent unread messages excluded
- **WHEN** a STANDARD or FYI message is unread
- **THEN** it does NOT appear as an action item (it appears in the feed only)

### Requirement: Action items are child-scoped and parent-authorized
The system SHALL scope action items to the specified child and verify the parent has a ParentChild link.

#### Scenario: Unauthorized child access rejected
- **WHEN** a parent calls `dashboard.getActionItems` with a childId they have no ParentChild record for
- **THEN** the system SHALL reject the request with a FORBIDDEN error
