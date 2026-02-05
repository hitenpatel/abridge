# Email Service Setup Guide (Resend)

**Date:** 2026-02-05
**Service:** Resend
**Status:** ✅ Implemented

## 🎯 Quick Setup (5 minutes)

### Step 1: Sign up for Resend

1. Go to [resend.com](https://resend.com)
2. Sign up with your email
3. No credit card required for free tier

### Step 2: Get your API Key

1. After signup, go to **API Keys** in the dashboard
2. Click **Create API Key**
3. Name it: `SchoolConnect Development`
4. Copy the API key (starts with `re_`)

### Step 3: Add to Environment

Add to `apps/api/.env`:

```bash
RESEND_API_KEY=re_your_actual_api_key_here
FROM_EMAIL=SchoolConnect <onboarding@resend.dev>
```

### Step 4: Test It!

Start the API server and send a test invitation:

```bash
cd apps/api
pnpm dev
```

Then invite a staff member from the admin dashboard - they'll receive an email! 📧

---

## 📧 Email Types Implemented

### 1. Staff Invitation Email

**Trigger:** Admin sends staff invitation
**Template:** Professional gradient design with CTA button
**Includes:**
- School name
- Role being assigned
- Accept invitation button
- Invitation expiry date
- Direct link as backup

**Endpoint:** `invitation.send` mutation

---

### 2. Notification Email (Fallback)

**Trigger:** Push notification fails
**Template:** Clean message display
**Includes:**
- Subject line
- Message content
- School name signature

**Function:** `sendNotificationEmail()` (ready for integration)

---

### 3. Payment Receipt Email

**Trigger:** Payment completed
**Template:** Professional receipt with UC compliance note
**Includes:**
- Amount paid
- Receipt number
- Download PDF button (if provided)
- UC childcare cost claim notice

**Function:** `sendReceiptEmail()` (ready for integration)

---

## 🎨 Email Design Features

✅ **Responsive:** Works on mobile and desktop
✅ **Professional:** Gradient header, clean layout
✅ **Branded:** SchoolConnect colors and styling
✅ **Accessible:** Good contrast, readable fonts
✅ **UC-Compliant:** Receipt emails mention Universal Credit

---

## 🔧 Configuration Options

### Custom Domain (Optional)

To send from your own domain (e.g., `noreply@schoolconnect.com`):

1. In Resend dashboard: **Domains** → **Add Domain**
2. Add your domain: `schoolconnect.com`
3. Add DNS records (provided by Resend)
4. Verify domain
5. Update `.env`:

```bash
FROM_EMAIL=SchoolConnect <noreply@schoolconnect.com>
```

**Benefits:**
- More professional
- Better deliverability
- Custom branding

**Cost:** Free on all plans

---

### Environment Variables

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `RESEND_API_KEY` | ✅ Yes | - | Resend API authentication |
| `FROM_EMAIL` | ⚠️ Optional | `SchoolConnect <onboarding@resend.dev>` | Sender email address |
| `WEB_URL` | ⚠️ Optional | `http://localhost:3000` | Web app URL for links |

---

## 📊 Free Tier Limits

- **3,000 emails/month**
- **100 emails/day**
- **1 custom domain**
- **30-day email logs**

### Usage Estimates

**Single school pilot (50 parents, 5 staff):**
- Staff invitations: ~5-10/month
- Notification fallbacks: ~50-100/month (assuming 90% push success)
- Receipt emails: ~50-100/month
- **Total:** ~150-200 emails/month ✅ Well under limit

**10 schools:**
- **Total:** ~1,500-2,000 emails/month ✅ Still under limit

---

## 🚀 Integration Points

### Already Integrated ✅

1. **Staff Invitations** (`apps/api/src/router/invitation.ts`)
   - Sends email when invitation created
   - Includes invitation link and expiry
   - Logs success/failure

### Ready to Integrate 🔧

2. **Notification Fallback** (`apps/api/src/services/email.ts`)
   - Function: `sendNotificationEmail()`
   - Use in: `apps/api/src/jobs/notification-fallback.ts`
   - When: Push notification fails

3. **Payment Receipts** (`apps/api/src/services/email.ts`)
   - Function: `sendReceiptEmail()`
   - Use in: Payment completion webhook
   - When: Payment status = COMPLETED

---

## 📝 Testing

### Test Staff Invitation

1. Log in as admin
2. Go to Staff Management
3. Send invitation to your email
4. Check inbox (and spam folder)
5. Click invitation link
6. Should redirect to registration page

### Monitor Emails

1. Resend Dashboard → **Emails**
2. See all sent emails
3. View delivery status
4. Check bounce/error rates

---

## 🔍 Debugging

### Email not sending?

**Check:**
1. `RESEND_API_KEY` is set correctly in `.env`
2. API server restarted after adding key
3. Console logs for errors: `grep "email" logs`
4. Resend dashboard for failed sends

### Email in spam?

**Solutions:**
1. Add custom domain (improves reputation)
2. Ask recipients to whitelist `resend.dev` or your domain
3. Check SPF/DKIM records (auto-added by Resend)

### Wrong sender email?

**Check:**
1. `FROM_EMAIL` in `.env`
2. If using custom domain, verify it's verified in Resend
3. Format: `Name <email@domain.com>`

---

## 🎓 Best Practices

### Do's ✅

- Use descriptive subject lines
- Keep emails concise
- Include clear CTAs
- Test on mobile and desktop
- Monitor delivery rates
- Respond to bounces

### Don'ts ❌

- Don't send marketing emails (use separate service)
- Don't exceed daily limits (100/day)
- Don't use generic subjects like "Notification"
- Don't forget unsubscribe links (not required for transactional)
- Don't ignore bounce notifications

---

## 📈 Monitoring & Logs

### Server Logs

All email sends are logged with structured data:

```typescript
logger.info("Staff invitation email sent", {
  messageId: result.data?.id,
  recipient: email,
  school: schoolName,
});
```

**View logs:**
```bash
# In API directory
tail -f logs/app.log | grep "email"
```

### Resend Dashboard

**Metrics available:**
- Total emails sent
- Delivery rate
- Bounce rate
- Spam complaints
- Open rates (if enabled)

---

## 🔄 Future Enhancements

1. **Email Templates in Code**
   - Move to React Email components
   - Better template management
   - Preview emails in development

2. **Scheduled Sends**
   - Queue emails for later
   - Respect quiet hours
   - Batch processing

3. **Email Preferences**
   - Let parents opt-out of certain emails
   - Choose delivery frequency
   - Digest mode

4. **Rich Content**
   - Add school logos
   - Include images
   - Better formatting options

---

## 🆘 Support

### Resend Support

- Documentation: [resend.com/docs](https://resend.com/docs)
- Status: [status.resend.com](https://status.resend.com)
- Support: [resend.com/support](https://resend.com/support)

### SchoolConnect Email Code

- Service: `apps/api/src/services/email.ts`
- Integration: `apps/api/src/router/invitation.ts`
- Logger: `apps/api/src/lib/logger.ts`

---

## ✅ Checklist

Setup complete when:

- [ ] Resend account created
- [ ] API key added to `.env`
- [ ] Test invitation email sent and received
- [ ] Email appears professional in inbox
- [ ] Links work correctly
- [ ] Email logs show in Resend dashboard

---

**Setup Time:** ~5 minutes
**Cost:** Free (3,000 emails/month)
**Difficulty:** Easy ⭐
**Status:** Production Ready ✅
