# Cloudflare Email Routing Setup for acadistra.com

## Overview

Cloudflare Email Routing is 100% FREE with:
- ✅ Unlimited email addresses
- ✅ Unlimited forwarding
- ✅ Spam protection
- ✅ No user limits
- ✅ Send emails via Gmail integration

## Prerequisites

- Domain: acadistra.com (purchased from Vercel)
- Personal Gmail account (for receiving forwarded emails)
- Access to domain registrar (Vercel)

---

## Step 1: Create Cloudflare Account

1. Go to https://dash.cloudflare.com/sign-up
2. Enter your email and create password
3. Click **"Create Account"**
4. Verify your email (check inbox)

---

## Step 2: Add Domain to Cloudflare

1. After login, click **"Add a Site"** or **"+ Add Site"** (top right)
2. Enter your domain: **acadistra.com**
3. Click **"Add Site"**
4. Select **"Free"** plan (scroll down if needed)
5. Click **"Continue"**

---

## Step 3: Review DNS Records

Cloudflare will scan your existing DNS records from Vercel.

1. Cloudflare shows all current DNS records
2. **Review the list** - should include:
   - A records (pointing to your server IP)
   - CNAME records (for www, api, etc.)
   - TXT records (if any)
3. Click **"Continue"**

**Important**: All your existing DNS records will be transferred to Cloudflare automatically.

---

## Step 4: Change Nameservers

Cloudflare will display 2 nameservers like:
```
ns1.cloudflare.com
ns2.cloudflare.com
```

### Update Nameservers in Vercel:

**Option A: If domain is managed in Vercel Dashboard**

1. Go to https://vercel.com/dashboard
2. Navigate to **Settings** → **Domains**
3. Find **acadistra.com**
4. Look for **"Nameservers"** section
5. Click **"Edit"** or **"Change"**
6. Replace existing nameservers with Cloudflare's:
   - `ns1.cloudflare.com`
   - `ns2.cloudflare.com`
7. Click **"Save"**

**Option B: If domain was purchased through Vercel but managed elsewhere**

Vercel might redirect you to the actual registrar (e.g., Namecheap, GoDaddy). Follow their interface to update nameservers.

**Option C: Contact Vercel Support**

If you can't find nameserver settings, contact Vercel support with:
- Domain: acadistra.com
- Request: Update nameservers to Cloudflare
- Provide the 2 nameservers Cloudflare gave you

---

## Step 5: Wait for DNS Propagation

1. After updating nameservers, return to Cloudflare
2. Click **"Done, check nameservers"**
3. Cloudflare will check periodically (can take 1-24 hours)
4. You'll receive an email when domain is active

**Check Status**: https://dash.cloudflare.com → Select acadistra.com → Status shows "Active"

**Speed up check**: Use https://www.whatsmydns.net
- Enter: acadistra.com
- Type: NS
- Should show cloudflare nameservers globally

---

## Step 6: Enable Email Routing

Once domain is active on Cloudflare:

1. Go to Cloudflare Dashboard: https://dash.cloudflare.com
2. Select **acadistra.com**
3. In left sidebar, click **"Email"** → **"Email Routing"**
4. Click **"Get started"** or **"Enable Email Routing"**

---

## Step 7: Add Destination Email

This is where all forwarded emails will be sent.

1. Cloudflare shows **"Destination addresses"** section
2. Click **"Add destination address"** or **"+"**
3. Enter your personal Gmail: **your-email@gmail.com**
4. Click **"Send verification email"**
5. **Check your Gmail inbox**
6. Click the verification link in the email from Cloudflare
7. Return to Cloudflare - status should show **"Verified"**

---

## Step 8: Configure DNS Records (Automatic)

Cloudflare will automatically add required DNS records:

1. Click **"Add records and enable"** or **"Continue"**
2. Cloudflare adds these automatically:
   - MX records (for receiving emails)
   - TXT records (SPF, DKIM for authentication)
3. Click **"Enable Email Routing"**

**Status should show**: ✅ Email Routing is enabled

---

## Step 9: Create Email Addresses (Routes)

Now create all your acadistra.com email addresses:

1. In Email Routing page, find **"Routing rules"** section
2. Click **"Create address"** or **"+ Create"**

### Create Each Email Address:

**Email 1: support@acadistra.com**
- Custom address: `support`
- Action: Send to → Select your verified Gmail
- Click **"Save"**

**Email 2: security@acadistra.com**
- Custom address: `security`
- Action: Send to → Select your verified Gmail
- Click **"Save"**

**Email 3: sales@acadistra.com**
- Custom address: `sales`
- Action: Send to → Select your verified Gmail
- Click **"Save"**

**Email 4: sysadmin@acadistra.com**
- Custom address: `sysadmin`
- Action: Send to → Select your verified Gmail
- Click **"Save"**

**Email 5: info@acadistra.com**
- Custom address: `info`
- Action: Send to → Select your verified Gmail
- Click **"Save"**

**Repeat for any other emails you need** (unlimited on free plan)

---

## Step 10: Create Catch-All (Optional)

Forward ALL emails to your Gmail (even non-existent addresses):

1. In Routing rules, click **"Catch-all address"**
2. Toggle **"Enable catch-all"**
3. Action: Send to → Select your verified Gmail
4. Click **"Save"**

**Example**: Any email to `random@acadistra.com` will forward to your Gmail.

---

## Step 11: Test Email Receiving

1. Wait 5-10 minutes for DNS propagation
2. Send test email from another account (e.g., personal email) to **support@acadistra.com**
3. Check your Gmail inbox
4. Email should arrive with:
   - From: Original sender
   - To: support@acadistra.com (forwarded to your Gmail)

**If not received**:
- Wait 30 minutes (DNS propagation)
- Check Gmail spam folder
- Verify routing rule is enabled in Cloudflare
- Check Email Routing status is "Active"

---

## Step 12: Setup Sending Emails via Gmail

Now configure Gmail to send emails FROM your acadistra.com addresses.

### Add "Send As" in Gmail:

1. Open Gmail: https://mail.google.com
2. Click **Settings** (gear icon) → **"See all settings"**
3. Go to **"Accounts and Import"** tab
4. Find **"Send mail as"** section
5. Click **"Add another email address"**

### Add Each Email Address:

**For support@acadistra.com:**

1. **Name**: Acadistra Support
2. **Email address**: support@acadistra.com
3. Uncheck **"Treat as an alias"**
4. Click **"Next Step"**

5. **SMTP Server Configuration**:
   - SMTP Server: `smtp.gmail.com`
   - Port: `587`
   - Username: `your-email@gmail.com` (your Gmail)
   - Password: (your Gmail password or App Password)
   - Leave **"Secured connection using TLS"** checked
6. Click **"Add Account"**

7. **Verify Email**:
   - Gmail sends verification code to support@acadistra.com
   - Check your Gmail inbox (forwarded from Cloudflare)
   - Copy the verification code
   - Paste in Gmail verification popup
   - Click **"Verify"**

**Repeat for all other emails**:
- security@acadistra.com
- sales@acadistra.com
- sysadmin@acadistra.com
- info@acadistra.com

---

## Step 13: Use Gmail App Password (If 2FA Enabled)

If you have 2-Factor Authentication on Gmail:

1. Go to https://myaccount.google.com/security
2. Click **"2-Step Verification"**
3. Scroll down to **"App passwords"**
4. Click **"App passwords"**
5. Select:
   - App: **Mail**
   - Device: **Other** (enter "Acadistra")
6. Click **"Generate"**
7. Copy the 16-character password
8. Use this password in Gmail SMTP setup (Step 12) instead of your regular password

---

## Step 14: Send Test Email

1. In Gmail, click **"Compose"**
2. In the **"From"** field, click and select **support@acadistra.com**
3. Send test email to your personal email
4. Check if received with correct sender

**Expected**:
- From: support@acadistra.com
- Reply-to: support@acadistra.com

---

## Step 15: Configure Backend SMTP (For Application)

Update your backend `.env` file to send emails from the application:

```env
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-gmail-app-password
SMTP_FROM=sysadmin@acadistra.com
SMTP_FROM_NAME=Acadistra System
SMTP_REPLY_TO=support@acadistra.com

# Alternative: Use different emails for different purposes
SMTP_SUPPORT_EMAIL=support@acadistra.com
SMTP_SECURITY_EMAIL=security@acadistra.com
SMTP_NOREPLY_EMAIL=noreply@acadistra.com
```

**Important**: Use Gmail App Password, not your regular Gmail password.

---

## Email Addresses Summary

After setup, you'll have:

| Email Address | Purpose | Forwards To |
|--------------|---------|-------------|
| sysadmin@acadistra.com | System admin login | Your Gmail |
| support@acadistra.com | Customer support | Your Gmail |
| security@acadistra.com | Security issues | Your Gmail |
| sales@acadistra.com | Business inquiries | Your Gmail |
| info@acadistra.com | General info | Your Gmail |
| noreply@acadistra.com | System notifications | Your Gmail |

All emails arrive in your Gmail with labels showing which address received them.

---

## Gmail Organization Tips

### Create Labels in Gmail:

1. Gmail → Settings → Labels → **"Create new label"**
2. Create labels:
   - `Acadistra/Support`
   - `Acadistra/Security`
   - `Acadistra/Sales`
   - `Acadistra/Info`

### Create Filters:

1. Gmail → Settings → Filters and Blocked Addresses → **"Create a new filter"**
2. **For support@acadistra.com**:
   - To: `support@acadistra.com`
   - Click **"Create filter"**
   - Apply label: `Acadistra/Support`
   - Click **"Create filter"**
3. Repeat for all email addresses

Now all forwarded emails are automatically organized!

---

## DNS Records (Auto-configured by Cloudflare)

For reference, Cloudflare adds these records:

```
Type: MX    | Name: @  | Value: route1.mx.cloudflare.net | Priority: 86
Type: MX    | Name: @  | Value: route2.mx.cloudflare.net | Priority: 17
Type: MX    | Name: @  | Value: route3.mx.cloudflare.net | Priority: 56
Type: TXT   | Name: @  | Value: v=spf1 include:_spf.mx.cloudflare.net ~all
```

**You don't need to add these manually** - Cloudflare does it automatically.

---

## Troubleshooting

### Emails not receiving:
- Check Email Routing status is "Active" in Cloudflare
- Verify destination email is verified
- Check routing rules are enabled
- Wait 30 minutes for DNS propagation
- Check Gmail spam folder
- Use MX Toolbox: https://mxtoolbox.com/SuperTool.aspx?action=mx%3aacadistra.com

### Cannot send emails:
- Verify email address in Gmail (check verification email)
- Use Gmail App Password if 2FA is enabled
- Check SMTP settings (smtp.gmail.com, port 587)
- Ensure "Less secure app access" is NOT needed (use App Password instead)

### Nameserver not updating:
- Contact Vercel support
- Provide Cloudflare nameservers
- Wait 24-48 hours for propagation

### Emails going to spam:
- Cloudflare automatically configures SPF/DKIM
- Warm up domain by sending gradually
- Ask recipients to mark as "Not Spam"

---

## Security Best Practices

1. **Enable 2FA on Gmail** - Protect your main email account
2. **Use App Passwords** - Don't use your main Gmail password for SMTP
3. **Monitor Email Activity** - Check Cloudflare Email Routing logs
4. **Set up DMARC** - Cloudflare provides this automatically
5. **Regular Backups** - Export important emails from Gmail

---

## Cost Breakdown

- **Cloudflare Email Routing**: FREE forever
- **Gmail**: FREE (15GB storage)
- **Domain (acadistra.com)**: Already paid
- **Total Monthly Cost**: $0

---

## Advantages of Cloudflare Email Routing

✅ 100% Free forever
✅ Unlimited email addresses
✅ Unlimited forwarding
✅ Built-in spam protection
✅ No user limits
✅ Reliable infrastructure
✅ Easy management
✅ Automatic DNS configuration
✅ Email analytics/logs
✅ Works with existing Gmail

---

## Limitations

❌ No webmail interface (use Gmail)
❌ Must send via Gmail SMTP (not native)
❌ All emails forward to one Gmail (can add multiple destinations)
❌ No email storage on Cloudflare (stored in Gmail)

---

## Next Steps After Setup

1. ✅ Update README.md with new email addresses
2. ✅ Update CONTACT.md with email information
3. ✅ Configure backend SMTP settings
4. ✅ Test password reset emails from application
5. ✅ Set up email signatures in Gmail
6. ✅ Create Gmail filters for organization
7. ✅ Test all email addresses (send/receive)

---

## Support Resources

- **Cloudflare Email Routing Docs**: https://developers.cloudflare.com/email-routing/
- **Gmail Send As Guide**: https://support.google.com/mail/answer/22370
- **DNS Propagation Checker**: https://www.whatsmydns.net
- **MX Record Checker**: https://mxtoolbox.com

---

**Setup Time**: 30-60 minutes + 1-24 hours for nameserver propagation

**Difficulty**: Easy (mostly automated by Cloudflare)
