## ADDED Requirements

### Requirement: Unified activity feed for a child
The system SHALL provide a `dashboard.getFeed` endpoint that returns a chronological stream of typed feed cards for a specific child, merging class posts, messages, attendance records, payment reminders, and calendar events.

#### Scenario: Parent retrieves feed for their child
- **WHEN** a parent calls `dashboard.getFeed` with `childId` for a child they are linked to
- **THEN** the system returns a paginated list of feed cards sorted by timestamp descending, each tagged with a type discriminator

#### Scenario: Feed includes class posts for the child's class
- **WHEN** a class post exists with yearGroup and className matching the child's class
- **THEN** the feed includes a card with `type: "classPost"` containing the post body, mediaUrls, author name, reaction counts, and the parent's own reaction

#### Scenario: Feed includes messages sent to the child
- **WHEN** a message exists targeting the child via MessageChild
- **THEN** the feed includes a card with `type: "message"` containing subject, body preview, category, author name, and read status

#### Scenario: Feed includes attendance records for the child
- **WHEN** an attendance record exists for the child for today
- **THEN** the feed includes a card with `type: "attendance"` containing the child's name, date, session (AM/PM), and mark (PRESENT, LATE, etc.)

#### Scenario: Feed includes outstanding payment reminders
- **WHEN** a PaymentItem exists targeting the child with an unpaid or partially paid balance
- **THEN** the feed includes a card with `type: "payment"` containing the title, amount due in pence, due date, and category

#### Scenario: Feed includes upcoming calendar events
- **WHEN** a calendar event exists at the child's school within the feed's time window
- **THEN** the feed includes a card with `type: "event"` containing title, start date, end date, and category

### Requirement: Feed uses cursor-based pagination
The system SHALL paginate the feed using a cursor that encodes the timestamp and id of the last item, ensuring stable ordering even when new items are inserted.

#### Scenario: First page of feed
- **WHEN** a parent calls `dashboard.getFeed` with `childId` and no cursor
- **THEN** the system returns the most recent feed cards (up to the page size limit) and a `nextCursor` value if more items exist

#### Scenario: Subsequent page of feed
- **WHEN** a parent calls `dashboard.getFeed` with a `cursor` from a previous response
- **THEN** the system returns the next page of feed cards after the cursor position, with no duplicates from the previous page

#### Scenario: End of feed
- **WHEN** a parent calls `dashboard.getFeed` with a cursor and no more items exist
- **THEN** the system returns an empty items array and `nextCursor: null`

### Requirement: Feed is child-scoped
The system SHALL scope all feed data to the specified child. A parent MUST have a ParentChild link to the child to access the feed.

#### Scenario: Parent with multiple children sees different feeds
- **WHEN** a parent has two children (Emily in Class 2B, Jack in Class 5A)
- **THEN** calling `dashboard.getFeed` with Emily's childId returns Class 2B posts, Emily's attendance, and Emily's payments; calling with Jack's childId returns Class 5A posts, Jack's attendance, and Jack's payments. Calendar events from the same school appear in both.

#### Scenario: Unauthorized child access rejected
- **WHEN** a parent calls `dashboard.getFeed` with a childId they have no ParentChild record for
- **THEN** the system SHALL reject the request with a FORBIDDEN error

### Requirement: Feed card type contract
Each feed card SHALL include a `type` field and a `timestamp` field, plus type-specific data. The type field SHALL be one of: `classPost`, `message`, `attendance`, `payment`, `event`.

#### Scenario: Type discriminator enables frontend rendering
- **WHEN** the frontend receives a feed card with `type: "classPost"`
- **THEN** it can render the class post card component with photo grid and reaction bar

#### Scenario: Type discriminator for message card
- **WHEN** the frontend receives a feed card with `type: "message"`
- **THEN** it can render the message card component with subject, preview, and category badge
