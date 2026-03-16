# Abridge Improvement Log

## Security Audits
- [x] auth (clean, no issues)
- [x] messaging (fixed: added max lengths on subject/body, validated attachment school ownership)
- [x] payments (fixed: added parent-child ownership check on checkout, cart size limit, input max lengths)
- [x] forms (fixed: added input max lengths, access control on getTemplate, school-match on submitForm)
- [x] attendance (fixed: added reason max length, 30-day absence limit)
- [x] calendar (fixed: added input max lengths, school-ownership on rsvpToEvent and getRsvpSummary)
- [x] homework (fixed: hardened input validation and authorization)
- [x] readingDiary (fixed: hardened input validation and authorization)
- [x] visitor (fixed: hardened input validation)
- [x] mis (fixed: added input limits, strip credentials from response)
- [x] achievement (fixed: added input limits, fixed school scoping)
- [x] gallery (fixed: added input max lengths)
- [x] media (fixed: added input max lengths)
- [x] staff (fixed: added max length validation to userId inputs)
- [x] invitation (fixed: added email max length, token format validation)
- [x] settings (clean, already has proper validation)

## Lint Cleanup
- [x] Phase 3C files clean
- [x] Remaining PRD files clean
- Note: 8 pre-existing lint errors remain in files we didn't create (WellbeingScreen, attendance, reports)

## Test Coverage
- [x] Every router has 3+ tests (notification bumped from 2 to 3)

## Mobile Screens
- [ ] Homework
- [ ] Reading Diary
- [ ] Visitors
- [ ] MIS
- [ ] Achievements
- [ ] Gallery
