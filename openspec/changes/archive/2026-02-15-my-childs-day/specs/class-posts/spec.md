## ADDED Requirements

### Requirement: Staff can create a class post
The system SHALL allow staff members to create a class post with an optional text body and optional media URLs, scoped to a specific yearGroup and className within their school.

#### Scenario: Staff creates a text-only class post
- **WHEN** a staff member calls `classPost.create` with `schoolId`, `yearGroup: "2"`, `className: "2B"`, and `body: "Great art lesson today!"`
- **THEN** the system creates a ClassPost record with the provided body, yearGroup, className, schoolId, and authorId set to the staff user's id

#### Scenario: Staff creates a class post with media
- **WHEN** a staff member calls `classPost.create` with `schoolId`, `yearGroup`, `className`, and `mediaUrls: ["https://storage.example.com/photo1.jpg", "https://storage.example.com/photo2.jpg"]`
- **THEN** the system creates a ClassPost record with the mediaUrls stored as a JSON array

#### Scenario: Staff creates a post with both text and media
- **WHEN** a staff member calls `classPost.create` with `body`, `mediaUrls`, `yearGroup`, and `className`
- **THEN** the system creates a ClassPost record with both body and mediaUrls populated

#### Scenario: Staff creates a post with no body and no media
- **WHEN** a staff member calls `classPost.create` with only `schoolId`, `yearGroup`, and `className` but no body and no mediaUrls
- **THEN** the system SHALL reject the request with a validation error (at least one of body or mediaUrls is required)

#### Scenario: Media URL limit enforced
- **WHEN** a staff member calls `classPost.create` with more than 10 mediaUrls
- **THEN** the system SHALL reject the request with a validation error

### Requirement: Staff can delete their own class post
The system SHALL allow a staff member to delete a class post that they authored. Deleting a post SHALL also delete all associated reactions.

#### Scenario: Staff deletes their own post
- **WHEN** a staff member calls `classPost.delete` with a `postId` for a post they authored
- **THEN** the system deletes the ClassPost record and all associated ClassPostReaction records

#### Scenario: Staff cannot delete another staff member's post
- **WHEN** a staff member calls `classPost.delete` with a `postId` for a post authored by a different staff member
- **THEN** the system SHALL reject the request with a FORBIDDEN error

### Requirement: Staff can list class posts for a class
The system SHALL allow staff members to list class posts for a specific class within their school, ordered by createdAt descending, with cursor-based pagination.

#### Scenario: Staff lists posts for a class
- **WHEN** a staff member calls `classPost.listByClass` with `schoolId`, `yearGroup: "2"`, `className: "2B"`
- **THEN** the system returns class posts matching that school, yearGroup, and className, ordered newest first, with reaction counts per emoji and total reaction count for each post

#### Scenario: Staff paginates through posts
- **WHEN** a staff member calls `classPost.listByClass` with a `cursor` from a previous response
- **THEN** the system returns the next page of posts after the cursor position

### Requirement: Parents can view class posts for their child's class
The system SHALL allow a parent to view class posts scoped to their child's yearGroup and className, via the `classPost.feed` endpoint.

#### Scenario: Parent views their child's class feed
- **WHEN** a parent calls `classPost.feed` with `childId` for a child they are linked to
- **THEN** the system returns class posts matching the child's yearGroup and className, ordered newest first, including the parent's own reaction (if any) on each post

#### Scenario: Parent cannot view feed for an unlinked child
- **WHEN** a parent calls `classPost.feed` with a `childId` for a child they have no ParentChild record for
- **THEN** the system SHALL reject the request with a FORBIDDEN error

### Requirement: Class posts are gated by the messaging feature toggle
The system SHALL block class post creation when the school's `messagingEnabled` toggle is false.

#### Scenario: Class post creation blocked when messaging disabled
- **WHEN** a staff member calls `classPost.create` for a school with `messagingEnabled: false`
- **THEN** the system SHALL reject the request with a FORBIDDEN error

#### Scenario: Class post feed still readable when messaging disabled
- **WHEN** a parent calls `classPost.feed` for a child at a school with `messagingEnabled: false`
- **THEN** the system SHALL still return existing class posts (read access is not gated)
