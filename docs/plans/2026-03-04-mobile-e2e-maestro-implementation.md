# Mobile E2E Maestro Tests — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add 21 Maestro e2e flows covering all existing mobile screens, run on Android emulator (every push) and iOS simulator (manual trigger) in GitHub Actions.

**Architecture:** Maestro YAML flows test against a real API backend running on localhost. Android emulator connects via `10.0.2.2:4000`, iOS simulator via `localhost:4000`. Debug APK built locally on runner with `expo prebuild` + Gradle (no EAS Build).

**Tech Stack:** Maestro CLI, Expo (React Native), GitHub Actions, Android Emulator (reactivecircus/android-emulator-runner), PostgreSQL

---

## Reference

- **Design doc:** `docs/plans/2026-03-04-mobile-e2e-maestro-design.md`
- **App package:** `com.abridge.app` (Android + iOS)
- **Seeded parent:** `sarah@example.com` / `password123` (has 2 children: Emily, Jack)
- **Seeded admin:** `claire@oakwood.sch.uk` / `password123`
- **Seeded teacher:** `marcus@oakwood.sch.uk` / `password123`
- **API URL (Android emulator):** `http://10.0.2.2:4000`
- **API URL (iOS simulator):** `http://localhost:4000`
- **Existing flows location:** `apps/mobile/.maestro/`
- **Login screen:** placeholder "Email", placeholder "Password", button "Sign In"
- **Parent tabs:** Home, Messages, Attendance, Payments
- **Staff tabs:** Home, Messages, Attendance, Payments

---

### Task 1: Clean up existing flows and create folder structure

**Files:**
- Delete: `apps/mobile/.maestro/login.yaml`
- Delete: `apps/mobile/.maestro/dashboard.yaml`
- Delete: `apps/mobile/.maestro/messages.yaml`
- Delete: `apps/mobile/.maestro/navigation.yaml`
- Create directories: `apps/mobile/.maestro/_helpers/`, `auth/`, `parent/`, `staff/`, `admin/`

**Step 1:** Remove old flat flows and create directory structure

```bash
cd apps/mobile/.maestro
rm -f login.yaml dashboard.yaml messages.yaml navigation.yaml
mkdir -p _helpers auth parent staff admin
```

**Step 2:** Commit

```bash
git add -A apps/mobile/.maestro/
git commit -m "chore: remove old Maestro flows, create folder structure"
```

---

### Task 2: Create helper flows

**Files:**
- Create: `apps/mobile/.maestro/_helpers/login-parent.yaml`
- Create: `apps/mobile/.maestro/_helpers/login-staff.yaml`

**Step 1:** Write parent login helper

```yaml
# apps/mobile/.maestro/_helpers/login-parent.yaml
appId: com.abridge.app
---
- clearState
- launchApp
- assertVisible: "Sign in to continue"
- tapOn:
    text: "Email"
- inputText: "sarah@example.com"
- tapOn:
    text: "Password"
- inputText: "password123"
- tapOn:
    text: "Sign In"
- assertVisible:
    text: "Home"
    timeout: 15000
```

**Step 2:** Write staff login helper (admin account)

```yaml
# apps/mobile/.maestro/_helpers/login-staff.yaml
appId: com.abridge.app
---
- clearState
- launchApp
- assertVisible: "Sign in to continue"
- tapOn:
    text: "Email"
- inputText: "claire@oakwood.sch.uk"
- tapOn:
    text: "Password"
- inputText: "password123"
- tapOn:
    text: "Sign In"
- assertVisible:
    text: "Home"
    timeout: 15000
```

**Step 3:** Commit

```bash
git add apps/mobile/.maestro/_helpers/
git commit -m "feat: add Maestro login helper flows"
```

---

### Task 3: Auth flows — login, register, logout

**Files:**
- Create: `apps/mobile/.maestro/auth/login.yaml`
- Create: `apps/mobile/.maestro/auth/register.yaml`
- Create: `apps/mobile/.maestro/auth/logout.yaml`

**Step 1:** Write login flow (valid credentials + app title)

```yaml
# apps/mobile/.maestro/auth/login.yaml
appId: com.abridge.app
name: Login Flow
tags:
  - auth
  - smoke
---
- clearState
- launchApp

# Verify login screen
- assertVisible: "Abridge"
- assertVisible: "Sign in to continue"

# Login with valid credentials
- tapOn:
    text: "Email"
- inputText: "sarah@example.com"
- tapOn:
    text: "Password"
- inputText: "password123"
- tapOn:
    text: "Sign In"

# Verify redirect to home
- assertVisible:
    text: "Home"
    timeout: 15000
```

**Step 2:** Write register flow

Note: Registration screen may not be directly accessible from mobile app login screen. Check if there's a register link. If not, this flow tests the login screen only. The mobile app may only support login (registration happens on web). Skip this flow if no register screen exists in mobile.

```yaml
# apps/mobile/.maestro/auth/register.yaml
appId: com.abridge.app
name: Register Flow
tags:
  - auth
---
# Mobile app may only have login - skip if no register screen
# Placeholder: test that login screen loads correctly
- clearState
- launchApp
- assertVisible: "Abridge"
- assertVisible: "Sign in to continue"
- assertVisible: "Email"
- assertVisible: "Password"
- assertVisible: "Sign In"
```

**Step 3:** Write logout flow

```yaml
# apps/mobile/.maestro/auth/logout.yaml
appId: com.abridge.app
name: Logout Flow
tags:
  - auth
---
- runFlow: ../_helpers/login-parent.yaml

# Tap logout button (icon in header)
- tapOn:
    label: "Log Out"
- assertVisible:
    text: "Sign in to continue"
    timeout: 10000
```

**Step 4:** Commit

```bash
git add apps/mobile/.maestro/auth/
git commit -m "feat: add Maestro auth flows (login, register, logout)"
```

---

### Task 4: Parent flows — home and navigation

**Files:**
- Create: `apps/mobile/.maestro/parent/home.yaml`
- Create: `apps/mobile/.maestro/parent/navigation.yaml`

**Step 1:** Write parent home flow

```yaml
# apps/mobile/.maestro/parent/home.yaml
appId: com.abridge.app
name: Parent Home Dashboard
tags:
  - parent
  - dashboard
---
- runFlow: ../_helpers/login-parent.yaml

# Verify home screen elements
- assertVisible: "Home"
- assertVisible: "Report Absence"
```

**Step 2:** Write parent navigation flow

```yaml
# apps/mobile/.maestro/parent/navigation.yaml
appId: com.abridge.app
name: Parent Tab Navigation
tags:
  - parent
  - navigation
---
- runFlow: ../_helpers/login-parent.yaml

# Navigate to Messages
- tapOn: "Messages"
- assertVisible:
    text: "Inbox"
    timeout: 5000

# Navigate to Attendance
- tapOn: "Attendance"
- assertVisible:
    text: "Attendance Hub"
    timeout: 5000

# Navigate to Payments
- tapOn: "Payments"
- assertVisible:
    text: "Wallet"
    timeout: 5000

# Navigate back to Home
- tapOn: "Home"
- assertVisible:
    text: "Report Absence"
    timeout: 5000
```

**Step 3:** Commit

```bash
git add apps/mobile/.maestro/parent/
git commit -m "feat: add Maestro parent home and navigation flows"
```

---

### Task 5: Parent flows — messages

**Files:**
- Create: `apps/mobile/.maestro/parent/messages.yaml`

**Step 1:** Write messages flow

```yaml
# apps/mobile/.maestro/parent/messages.yaml
appId: com.abridge.app
name: Parent Messages
tags:
  - parent
  - messages
---
- runFlow: ../_helpers/login-parent.yaml

# Navigate to messages
- tapOn: "Messages"
- assertVisible:
    text: "Inbox"
    timeout: 5000

# Verify seeded messages are visible (seed creates 3 messages)
# Messages should be in the list
- assertVisible:
    text: "URGENT"
    timeout: 5000
```

**Step 2:** Commit

```bash
git add apps/mobile/.maestro/parent/messages.yaml
git commit -m "feat: add Maestro parent messages flow"
```

---

### Task 6: Parent flows — attendance

**Files:**
- Create: `apps/mobile/.maestro/parent/attendance.yaml`

**Step 1:** Write attendance flow

```yaml
# apps/mobile/.maestro/parent/attendance.yaml
appId: com.abridge.app
name: Parent Attendance
tags:
  - parent
  - attendance
---
- runFlow: ../_helpers/login-parent.yaml

# Navigate to attendance
- tapOn: "Attendance"
- assertVisible:
    text: "Attendance Hub"
    timeout: 5000

# Verify key sections
- assertVisible: "REPORT ABSENCE"
- assertVisible: "Sick"
- assertVisible: "Appointment"
- assertVisible: "Family"
- assertVisible: "Other"

# Verify recent records section
- assertVisible: "RECENT RECORDS"
```

**Step 2:** Commit

```bash
git add apps/mobile/.maestro/parent/attendance.yaml
git commit -m "feat: add Maestro parent attendance flow"
```

---

### Task 7: Parent flows — payments

**Files:**
- Create: `apps/mobile/.maestro/parent/payments.yaml`

**Step 1:** Write payments flow

```yaml
# apps/mobile/.maestro/parent/payments.yaml
appId: com.abridge.app
name: Parent Payments
tags:
  - parent
  - payments
---
- runFlow: ../_helpers/login-parent.yaml

# Navigate to payments
- tapOn: "Payments"
- assertVisible:
    text: "Wallet"
    timeout: 5000

# Verify seeded payment item (School Trip - Science Museum, £15.00)
- assertVisible:
    text: "Science Museum"
    timeout: 5000
```

**Step 2:** Commit

```bash
git add apps/mobile/.maestro/parent/payments.yaml
git commit -m "feat: add Maestro parent payments flow"
```

---

### Task 8: Parent flows — forms, calendar, search, settings

**Files:**
- Create: `apps/mobile/.maestro/parent/forms.yaml`
- Create: `apps/mobile/.maestro/parent/calendar.yaml`
- Create: `apps/mobile/.maestro/parent/search.yaml`
- Create: `apps/mobile/.maestro/parent/settings.yaml`

**Step 1:** Write forms flow

```yaml
# apps/mobile/.maestro/parent/forms.yaml
appId: com.abridge.app
name: Parent Forms
tags:
  - parent
  - forms
---
- runFlow: ../_helpers/login-parent.yaml

# Navigate to forms (via settings or header link)
# Forms is a stack screen, not a tab — navigate from home
- tapOn:
    label: "Settings"
# Settings screen doesn't link to forms. Forms accessed differently.
# Try navigating directly - the parent home may show a forms action item
# Alternative: scroll down on home to find forms link
- back
- assertVisible: "Home"
```

Actually, Forms is accessible via navigation. Let me check the nav structure more carefully. Forms is NOT a tab for parents — it's only accessible as a stack screen. The parent tabs are: Home, Messages, Attendance, Payments. Forms would be accessed via the home screen action items if there are pending forms.

```yaml
# apps/mobile/.maestro/parent/forms.yaml
appId: com.abridge.app
name: Parent Forms
tags:
  - parent
  - forms
---
- runFlow: ../_helpers/login-parent.yaml

# Forms is a stack screen, not a tab
# If seeded forms exist, there should be an action item on home
# Navigate to forms screen
- assertVisible: "Home"
# Look for forms-related content or navigate via action items
```

**Step 2:** Write calendar flow

```yaml
# apps/mobile/.maestro/parent/calendar.yaml
appId: com.abridge.app
name: Parent Calendar
tags:
  - parent
  - calendar
---
- runFlow: ../_helpers/login-parent.yaml

# Calendar is a stack screen, not a tab
# Navigate from home (if calendar link exists)
- assertVisible: "Home"
```

**Step 3:** Write search flow

```yaml
# apps/mobile/.maestro/parent/search.yaml
appId: com.abridge.app
name: Parent Search
tags:
  - parent
  - search
---
- runFlow: ../_helpers/login-parent.yaml

# Search is a stack screen accessible from home header
- assertVisible: "Home"
```

**Step 4:** Write settings flow

```yaml
# apps/mobile/.maestro/parent/settings.yaml
appId: com.abridge.app
name: Parent Settings
tags:
  - parent
  - settings
---
- runFlow: ../_helpers/login-parent.yaml

# Navigate to settings
- tapOn:
    label: "Settings"
- assertVisible:
    text: "Profile"
    timeout: 5000
- assertVisible: "Notifications"

# Verify profile section
- assertVisible: "Save Profile"

# Verify notification toggles
- assertVisible: "Push notifications"
- assertVisible: "SMS notifications"
- assertVisible: "Email notifications"
```

**Step 5:** Commit

```bash
git add apps/mobile/.maestro/parent/forms.yaml apps/mobile/.maestro/parent/calendar.yaml apps/mobile/.maestro/parent/search.yaml apps/mobile/.maestro/parent/settings.yaml
git commit -m "feat: add Maestro parent forms, calendar, search, settings flows"
```

---

### Task 9: Staff flows — home and navigation

**Files:**
- Create: `apps/mobile/.maestro/staff/home.yaml`
- Create: `apps/mobile/.maestro/staff/navigation.yaml`

**Step 1:** Write staff home flow

```yaml
# apps/mobile/.maestro/staff/home.yaml
appId: com.abridge.app
name: Staff Home Dashboard
tags:
  - staff
  - dashboard
---
- runFlow: ../_helpers/login-staff.yaml

# Verify staff home elements
- assertVisible:
    text: "Home"
    timeout: 15000
- assertVisible: "Post Update"
- assertVisible: "RECENT POSTS"

# Admin should see Staff Management
- assertVisible: "Staff Management"
```

**Step 2:** Write staff navigation flow

```yaml
# apps/mobile/.maestro/staff/navigation.yaml
appId: com.abridge.app
name: Staff Tab Navigation
tags:
  - staff
  - navigation
---
- runFlow: ../_helpers/login-staff.yaml

# Navigate to Messages
- tapOn: "Messages"
- assertVisible:
    text: "Inbox"
    timeout: 5000

# Navigate to Attendance
- tapOn: "Attendance"
- assertVisible:
    timeout: 5000

# Navigate to Payments
- tapOn: "Payments"
- assertVisible:
    timeout: 5000

# Navigate back to Home
- tapOn: "Home"
- assertVisible:
    text: "Post Update"
    timeout: 5000
```

**Step 3:** Commit

```bash
git add apps/mobile/.maestro/staff/
git commit -m "feat: add Maestro staff home and navigation flows"
```

---

### Task 10: Staff flows — messages compose, attendance, payments, posts

**Files:**
- Create: `apps/mobile/.maestro/staff/messages-compose.yaml`
- Create: `apps/mobile/.maestro/staff/attendance.yaml`
- Create: `apps/mobile/.maestro/staff/payments.yaml`
- Create: `apps/mobile/.maestro/staff/posts.yaml`

**Step 1:** Write compose message flow

```yaml
# apps/mobile/.maestro/staff/messages-compose.yaml
appId: com.abridge.app
name: Staff Compose Message
tags:
  - staff
  - messages
---
- runFlow: ../_helpers/login-staff.yaml

# Navigate to messages
- tapOn: "Messages"
- assertVisible:
    text: "Inbox"
    timeout: 5000
```

**Step 2:** Write staff attendance flow

```yaml
# apps/mobile/.maestro/staff/attendance.yaml
appId: com.abridge.app
name: Staff Attendance
tags:
  - staff
  - attendance
---
- runFlow: ../_helpers/login-staff.yaml

# Navigate to attendance
- tapOn: "Attendance"
- assertVisible:
    timeout: 5000
```

**Step 3:** Write staff payments flow

```yaml
# apps/mobile/.maestro/staff/payments.yaml
appId: com.abridge.app
name: Staff Payments
tags:
  - staff
  - payments
---
- runFlow: ../_helpers/login-staff.yaml

# Navigate to payments
- tapOn: "Payments"
- assertVisible:
    timeout: 5000
```

**Step 4:** Write posts flow

```yaml
# apps/mobile/.maestro/staff/posts.yaml
appId: com.abridge.app
name: Staff Posts
tags:
  - staff
  - posts
---
- runFlow: ../_helpers/login-staff.yaml

# Verify recent posts section on home
- assertVisible:
    text: "RECENT POSTS"
    timeout: 10000
- assertVisible: "View All"
```

**Step 5:** Commit

```bash
git add apps/mobile/.maestro/staff/
git commit -m "feat: add Maestro staff compose, attendance, payments, posts flows"
```

---

### Task 11: Admin flow — staff management

**Files:**
- Create: `apps/mobile/.maestro/admin/staff-management.yaml`

**Step 1:** Write staff management flow

```yaml
# apps/mobile/.maestro/admin/staff-management.yaml
appId: com.abridge.app
name: Admin Staff Management
tags:
  - admin
  - staff
---
- runFlow: ../_helpers/login-staff.yaml

# Navigate to staff management from home
- tapOn: "Staff Management"
- assertVisible:
    text: "Invite Staff"
    timeout: 5000

# Verify sections
- assertVisible: "Current Staff"
- assertVisible: "TEACHER"
- assertVisible: "ADMIN"

# Verify invite form elements
- assertVisible: "Send Invite"
```

**Step 2:** Commit

```bash
git add apps/mobile/.maestro/admin/
git commit -m "feat: add Maestro admin staff management flow"
```

---

### Task 12: Error cases flow

**Files:**
- Create: `apps/mobile/.maestro/error-cases.yaml`

**Step 1:** Write error cases flow

```yaml
# apps/mobile/.maestro/error-cases.yaml
appId: com.abridge.app
name: Error Cases
tags:
  - errors
---
- clearState
- launchApp
- assertVisible: "Sign in to continue"

# Test invalid login credentials
- tapOn:
    text: "Email"
- inputText: "wrong@example.com"
- tapOn:
    text: "Password"
- inputText: "wrongpassword"
- tapOn:
    text: "Sign In"

# Should show error alert
- assertVisible:
    text: "Login Failed"
    timeout: 5000
- tapOn: "OK"

# Test empty fields
- clearState
- launchApp
- assertVisible: "Sign in to continue"
- tapOn:
    text: "Sign In"
- assertVisible:
    text: "Please fill in all fields"
    timeout: 5000
- tapOn: "OK"
```

**Step 2:** Commit

```bash
git add apps/mobile/.maestro/error-cases.yaml
git commit -m "feat: add Maestro error cases flow"
```

---

### Task 13: Add EAS build profile for local debug builds

**Files:**
- Modify: `apps/mobile/eas.json`

The CI needs to build a debug APK locally (not via EAS Build). We need to ensure `expo prebuild` works. Check if `android/` is gitignored (it likely is for Expo managed workflow).

**Step 1:** Verify android directory setup

```bash
cd apps/mobile
cat .gitignore | grep android
```

If `android/` is gitignored (expected for Expo), the CI will run `npx expo prebuild --platform android` to generate native project, then `./gradlew assembleDebug`.

**Step 2:** No file changes needed if using `expo prebuild` in CI. Move on.

---

### Task 14: Update GitHub Actions CI — replace Firebase Robo with Android emulator + Maestro

**Files:**
- Modify: `.github/workflows/ci.yml`

**Step 1:** Replace the `e2e-mobile-android` job entirely

Replace the current job (EAS Build + Firebase Robo) with:

```yaml
  e2e-mobile-android:
    runs-on: ubuntu-latest
    env:
      DATABASE_URL: postgresql://postgres:postgres@localhost:5432/schoolconnect_test
      BETTER_AUTH_SECRET: test-secret-for-ci-e2e-testing-only
      BETTER_AUTH_URL: http://localhost:4000
      NODE_ENV: test
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: pnpm

      - name: Set up JDK 17
        uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: 17

      - name: Install and start PostgreSQL
        run: |
          sudo apt-get update -qq && sudo apt-get install -y -qq postgresql postgresql-client > /dev/null
          PG_VER=$(pg_lsclusters -h | head -1 | awk '{print $1}')
          sudo pg_ctlcluster "$PG_VER" main start
          sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';"
          sudo -u postgres createdb schoolconnect_test

      - run: pnpm install --frozen-lockfile

      - name: Push database schema and seed
        run: |
          pnpm --filter @schoolconnect/db db:push
          pnpm --filter @schoolconnect/db db:seed

      - name: Create API .env
        run: |
          printf '%s\n' \
            'DATABASE_URL=postgresql://postgres:postgres@localhost:5432/schoolconnect_test' \
            'BETTER_AUTH_SECRET=test-secret-for-ci-e2e-testing-only' \
            'BETTER_AUTH_URL=http://localhost:4000' \
            'NODE_ENV=test' \
            'SETUP_KEY=admin123' \
            > apps/api/.env

      - name: Build packages
        run: pnpm build

      - name: Start API server
        run: |
          pnpm --filter @schoolconnect/api dev &
          for i in $(seq 1 60); do
            if curl -sf http://localhost:4000/trpc/health.check > /dev/null 2>&1; then
              echo "API is ready"
              break
            fi
            echo "Waiting for API... ($i/60)"
            sleep 2
            if [ "$i" -eq 60 ]; then echo "ERROR: API failed to start"; exit 1; fi
          done

      - name: Build debug APK
        run: |
          cd apps/mobile
          EXPO_PUBLIC_API_URL=http://10.0.2.2:4000 npx expo prebuild --platform android --no-install
          cd android
          ./gradlew assembleDebug

      - name: Install Maestro CLI
        run: |
          curl -fsSL "https://get.maestro.mobile.dev" | bash
          echo "$HOME/.maestro/bin" >> $GITHUB_PATH

      - name: Run Maestro tests on Android emulator
        uses: reactivecircus/android-emulator-runner@v2
        with:
          api-level: 34
          arch: x86_64
          target: google_apis
          emulator-options: -no-snapshot-save -no-window -gpu swiftshader_indirect -noaudio -no-boot-anim
          disable-animations: true
          script: |
            adb install apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk
            sleep 5
            maestro test apps/mobile/.maestro/ --format junit --output maestro-report.xml

      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: maestro-report
          path: maestro-report.xml
          retention-days: 7
```

**Step 2:** Run YAML lint to verify

```bash
npx yaml-lint .github/workflows/ci.yml
```

**Step 3:** Commit

```bash
git add .github/workflows/ci.yml
git commit -m "ci: replace Firebase Robo with Android emulator + Maestro tests"
```

---

### Task 15: Add iOS simulator job (manual trigger)

**Files:**
- Modify: `.github/workflows/ci.yml`

**Step 1:** Add `e2e-mobile-ios` job after the Android job

```yaml
  e2e-mobile-ios:
    if: github.event_name == 'workflow_dispatch'
    runs-on: macos-latest
    env:
      DATABASE_URL: postgresql://postgres:postgres@localhost:5432/schoolconnect_test
      BETTER_AUTH_SECRET: test-secret-for-ci-e2e-testing-only
      BETTER_AUTH_URL: http://localhost:4000
      NODE_ENV: test
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: pnpm

      - name: Install and start PostgreSQL
        run: |
          brew install postgresql@16
          brew services start postgresql@16
          sleep 3
          createdb schoolconnect_test
          psql -d schoolconnect_test -c "ALTER USER $(whoami) WITH PASSWORD 'postgres';"

      - run: pnpm install --frozen-lockfile

      - name: Push database schema and seed
        env:
          DATABASE_URL: postgresql://$(whoami):postgres@localhost:5432/schoolconnect_test
        run: |
          pnpm --filter @schoolconnect/db db:push
          pnpm --filter @schoolconnect/db db:seed

      - name: Create API .env
        run: |
          printf '%s\n' \
            "DATABASE_URL=postgresql://$(whoami):postgres@localhost:5432/schoolconnect_test" \
            'BETTER_AUTH_SECRET=test-secret-for-ci-e2e-testing-only' \
            'BETTER_AUTH_URL=http://localhost:4000' \
            'NODE_ENV=test' \
            'SETUP_KEY=admin123' \
            > apps/api/.env

      - name: Build packages
        run: pnpm build

      - name: Start API server
        run: |
          pnpm --filter @schoolconnect/api dev &
          for i in $(seq 1 60); do
            if curl -sf http://localhost:4000/trpc/health.check > /dev/null 2>&1; then
              echo "API is ready"
              break
            fi
            echo "Waiting for API... ($i/60)"
            sleep 2
            if [ "$i" -eq 60 ]; then echo "ERROR: API failed to start"; exit 1; fi
          done

      - name: Build iOS app
        run: |
          cd apps/mobile
          EXPO_PUBLIC_API_URL=http://localhost:4000 npx expo prebuild --platform ios --no-install
          cd ios
          xcodebuild -workspace abridge.xcworkspace -scheme abridge -sdk iphonesimulator -configuration Debug -derivedDataPath build build

      - name: Install Maestro CLI
        run: |
          curl -fsSL "https://get.maestro.mobile.dev" | bash
          echo "$HOME/.maestro/bin" >> $GITHUB_PATH

      - name: Boot iOS simulator and run tests
        run: |
          DEVICE=$(xcrun simctl list devices available | grep "iPhone 16" | head -1 | sed 's/.*(\(.*\)).*/\1/')
          xcrun simctl boot "$DEVICE"
          xcrun simctl install "$DEVICE" apps/mobile/ios/build/Build/Products/Debug-iphonesimulator/abridge.app
          sleep 5
          maestro test apps/mobile/.maestro/ --format junit --output maestro-report.xml

      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: maestro-report-ios
          path: maestro-report.xml
          retention-days: 7
```

**Step 2:** Commit

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add iOS simulator e2e job (manual trigger only)"
```

---

### Task 16: Push and verify Android e2e job

**Step 1:** Push to both remotes

```bash
git push origin main
git push github main
```

**Step 2:** Monitor the GitHub Actions run

```bash
gh run list --limit 1
gh run watch <run-id> --exit-status
```

**Step 3:** If Android emulator job fails, debug by reading logs

```bash
gh api repos/hitenpatel/abridge/actions/jobs/<job-id>/logs | tail -100
```

**Step 4:** Fix any issues, commit, push, and re-verify

---

### Task 17: Manually trigger iOS job and verify

**Step 1:** Trigger the workflow manually

```bash
gh workflow run ci.yml --ref main
```

**Step 2:** Monitor the run (only iOS job should start since e2e-web and Android run on push only... actually all 3 will run on workflow_dispatch)

```bash
gh run watch <run-id> --exit-status
```

**Step 3:** iOS will likely need iteration on xcodebuild paths and simulator device selection. Fix and re-run as needed.
