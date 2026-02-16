## ADDED Requirements

### Requirement: Staff can request a presigned upload URL
The system SHALL provide a `classPost.getUploadUrl` endpoint that returns a presigned S3/R2 PUT URL for direct client-side upload.

#### Scenario: Staff requests upload URL for an image
- **WHEN** a staff member calls `classPost.getUploadUrl` with `schoolId`, `filename: "photo.jpg"`, and `contentType: "image/jpeg"`
- **THEN** the system returns `{ uploadUrl: "<presigned PUT URL>", publicUrl: "<final accessible URL>" }` with the presigned URL valid for 15 minutes

#### Scenario: Staff requests upload URL for a video
- **WHEN** a staff member calls `classPost.getUploadUrl` with `contentType: "video/mp4"`
- **THEN** the system returns a presigned URL configured for the video content type

#### Scenario: Unsupported content type rejected
- **WHEN** a staff member calls `classPost.getUploadUrl` with `contentType: "application/exe"`
- **THEN** the system SHALL reject the request with a validation error

### Requirement: Allowed media types
The system SHALL only allow upload of the following content types:
- Images: `image/jpeg`, `image/png`, `image/webp`, `image/heic`
- Videos: `video/mp4`, `video/quicktime`

#### Scenario: HEIC image from iPhone allowed
- **WHEN** a staff member requests an upload URL with `contentType: "image/heic"`
- **THEN** the system returns a valid presigned URL

#### Scenario: PDF upload rejected
- **WHEN** a staff member requests an upload URL with `contentType: "application/pdf"`
- **THEN** the system SHALL reject the request with a validation error listing allowed types

### Requirement: File size limits enforced
The system SHALL enforce file size limits: 10MB for images, 50MB for videos. The presigned URL SHALL include a content-length condition to enforce this at the storage level.

#### Scenario: Image within size limit uploads successfully
- **WHEN** a client uploads a 5MB JPEG using the presigned URL
- **THEN** the upload succeeds and the file is stored

#### Scenario: Image exceeding size limit rejected by storage
- **WHEN** a client attempts to upload a 15MB JPEG using the presigned URL
- **THEN** the storage service rejects the upload due to the content-length condition

#### Scenario: Video within size limit uploads successfully
- **WHEN** a client uploads a 30MB MP4 using the presigned URL
- **THEN** the upload succeeds and the file is stored

### Requirement: Uploaded images are resized
The system SHALL process uploaded images to generate two variants: a display version (max 1200px width) and a thumbnail (400px width). The original file is preserved.

#### Scenario: Image resize on upload
- **WHEN** a 3000px wide JPEG is uploaded
- **THEN** the system generates a 1200px wide display version and a 400px wide thumbnail, storing all three (original, display, thumbnail) at predictable URL paths

#### Scenario: Small image not upscaled
- **WHEN** a 300px wide image is uploaded
- **THEN** the display version is the same as the original (no upscaling), and the thumbnail is the same as the original

### Requirement: Media files are stored with structured paths
The system SHALL store media at paths following the pattern: `{schoolId}/{yearMonth}/{postId}/{filename}`. This enables per-school storage management and lifecycle policies.

#### Scenario: File stored at correct path
- **WHEN** a staff member at school "abc123" uploads "photo.jpg" in February 2026
- **THEN** the file is stored at `abc123/2026-02/{postId}/photo.jpg` with display and thumbnail variants at `abc123/2026-02/{postId}/photo_1200.jpg` and `abc123/2026-02/{postId}/photo_400.jpg`

### Requirement: Graceful fallback for failed media uploads
The client (web and mobile) SHALL gracefully handle media upload failures. If uploads fail (e.g. storage service unavailable), the post can still be created with text only. The user is only blocked if all uploads fail AND no text body was provided.

#### Scenario: Upload fails but text body exists
- **WHEN** a staff member creates a post with text body and attached media, and the media upload to storage fails
- **THEN** the client creates the post with the text body only, without blocking on the failed upload

#### Scenario: Partial upload success
- **WHEN** a staff member creates a post with 3 media attachments and 1 fails to upload
- **THEN** the client creates the post with the 2 successfully uploaded media URLs and the text body

#### Scenario: All uploads fail with no text body
- **WHEN** a staff member creates a post with only media (no text body) and all uploads fail
- **THEN** the client shows an error message ("Could not upload media. Please try again.") and does not create the post

### Requirement: Media upload requires staff authentication
The system SHALL only allow authenticated staff members to request upload URLs. Parents cannot upload media.

#### Scenario: Unauthenticated request rejected
- **WHEN** an unauthenticated user calls `classPost.getUploadUrl`
- **THEN** the system SHALL reject the request with an UNAUTHORIZED error

#### Scenario: Parent request rejected
- **WHEN** a parent (non-staff user) calls `classPost.getUploadUrl`
- **THEN** the system SHALL reject the request with a FORBIDDEN error
