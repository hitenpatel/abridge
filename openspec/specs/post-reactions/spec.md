## ADDED Requirements

### Requirement: Parent can react to a class post
The system SHALL allow a parent to add an emoji reaction to a class post visible to them. The allowed emoji values are: HEART, THUMBS_UP, CLAP, LAUGH, WOW.

#### Scenario: Parent reacts to a post
- **WHEN** a parent calls `classPost.react` with `postId` and `emoji: "HEART"`
- **THEN** the system creates a ClassPostReaction record linking the parent's userId, the postId, and the emoji

#### Scenario: Parent changes their reaction
- **WHEN** a parent who already reacted with HEART calls `classPost.react` with the same `postId` and `emoji: "CLAP"`
- **THEN** the system updates the existing ClassPostReaction record to CLAP (upsert on `[postId, userId]`)

#### Scenario: Parent reacts with invalid emoji
- **WHEN** a parent calls `classPost.react` with an emoji value not in the allowed set
- **THEN** the system SHALL reject the request with a validation error

#### Scenario: Parent can only react to posts in their child's class
- **WHEN** a parent calls `classPost.react` with a `postId` for a class their child is not in
- **THEN** the system SHALL reject the request with a FORBIDDEN error

### Requirement: Parent can remove their reaction
The system SHALL allow a parent to remove their reaction from a class post.

#### Scenario: Parent removes their reaction
- **WHEN** a parent calls `classPost.removeReaction` with a `postId` they previously reacted to
- **THEN** the system deletes the ClassPostReaction record for that parent and post

#### Scenario: Parent removes reaction when none exists
- **WHEN** a parent calls `classPost.removeReaction` with a `postId` they have not reacted to
- **THEN** the system SHALL succeed silently (idempotent operation)

### Requirement: Reaction counts are returned with class posts
The system SHALL include reaction counts grouped by emoji type and the requesting user's own reaction (if any) when returning class posts.

#### Scenario: Post with multiple reactions returned in feed
- **WHEN** a class post has 5 HEART reactions, 3 CLAP reactions, and the requesting parent has reacted with HEART
- **THEN** the post data includes `reactionCounts: { HEART: 5, CLAP: 3 }`, `totalReactions: 8`, and `myReaction: "HEART"`

#### Scenario: Post with no reactions
- **WHEN** a class post has no reactions
- **THEN** the post data includes `reactionCounts: {}`, `totalReactions: 0`, and `myReaction: null`

### Requirement: One reaction per parent per post
The system SHALL enforce a unique constraint of one reaction per parent per post. A parent cannot have multiple different emoji reactions on the same post simultaneously.

#### Scenario: Database constraint prevents duplicate reactions
- **WHEN** a parent attempts to insert a second reaction for the same post without removing the first
- **THEN** the system SHALL upsert, replacing the existing reaction with the new emoji
