# 📧 Resend Domain Verification Guide

## 🏢 การยืนยัน Domain สำหรับบริษัทที่มีอีเมลอยู่แล้ว

### 🤔 คำถามหลัก: ต้องเสียเงินเพิ่มไหม?

**คำตอบ**: **ไม่ต้องเสียเงินเพิ่มสำหรับการ verify DNS!** แต่จะมีค่าใช้จ่ายใน Resend service plan เท่านั้น

---

## 💰 ค่าใช้จ่ายที่แน่นอน

### 🆓 ส่วนที่ไม่เสียเงิน (FREE)

| รายการ | ค่าใช้จ่าย | หมายเหตุ |
|--------|-----------|----------|
| **DNS Verification** | 🆓 FREE | แค่เพิ่ม DNS records |
| **Domain (มีอยู่แล้ว)** | 🆓 ไม่เปลี่ยนแปลง | ใช้ domain เดิม |
| **Email Hosting เดิม** | 🆓 ไม่เปลี่ยนแปลง | Google Workspace/M365 |
| **การเพิ่ม DNS Records** | 🆓 FREE | ใช้ DNS management ที่มี |

### 💰 ส่วนที่เสียเงิน (PAID)

| Plan | ค่าใช้จ่าย | อีเมล/เดือน | ข้อจำกัด | เหมาะสำหรับ |
|------|-----------|-------------|----------|-------------|
| **Free** | 🆓 $0 | 3,000 | Verified contacts only | Development |
| **Pro** | 💰 $20 | 50,000 | None | Production |
| **Business** | 💰 $85 | 500,000 | None | Enterprise |

---

## 🔄 ขั้นตอนการ Verify Domain (มีอีเมลแจ้งเตือน)

### Step 1: เพิ่ม Domain ใน Resend Dashboard

```bash
# 1. ไปที่ https://resend.com/domains
# 2. คลิก "Add Domain"
# 3. ใส่ domain ของบริษัท เช่น: yourcompany.com
# 4. เลือก region: Asia Pacific (Singapore) สำหรับไทย
```

### Step 2: 📧 Resend ส่งอีเมลแจ้งเตือนครั้งแรก

**ผู้รับ**: อีเมล admin ใน Resend account + standard domain emails
```typescript
const notificationEmails = [
  'admin@yourcompany.com',     // Admin email ใน Resend account
  'hostmaster@yourcompany.com', // Standard domain admin email
  'webmaster@yourcompany.com',  // Alternative admin email
  'postmaster@yourcompany.com'  // Mail admin email
];
```

**เนื้อหาอีเมล**:
```html
From: Resend <noreply@resend.com>
To: admin@yourcompany.com
Subject: Domain Verification Required for yourcompany.com

Hi,

You've added yourcompany.com to your Resend account. 
To start sending emails from this domain, please add these DNS records:

MX Record:
Name: @
Value: feedback-smtp.resend.com
Priority: 10

TXT Record (SPF):
Name: @
Value: "v=spf1 include:_spf.resend.com ~all"

TXT Record (DKIM):
Name: resend._domainkey  
Value: "p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC..."

TXT Record (Verification):
Name: _resend
Value: "resend-verification=abc123xyz..."

After adding these records, click "Verify Domain" in your dashboard.

Best regards,
Resend Team
```

### Step 3: เพิ่ม DNS Records (ไม่กระทบอีเมลเดิม)

**DNS Records ที่ต้องเพิ่ม**:

```bash
# MX Record (Mail Exchange)
Type: MX
Name: @ หรือ root domain
Value: feedback-smtp.resend.com
Priority: 10
TTL: 3600

# SPF Record (Sender Policy Framework)
Type: TXT
Name: @ หรือ root domain  
Value: "v=spf1 include:_spf.resend.com ~all"
TTL: 3600

# DKIM Record (DomainKeys Identified Mail)
Type: TXT
Name: resend._domainkey
Value: "p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC..." (ค่ายาวที่ Resend ให้)
TTL: 3600

# Domain Verification Record
Type: TXT  
Name: _resend
Value: "resend-verification=abc123xyz..." (unique code จาก Resend)
TTL: 3600
```

**⚠️ สำคัญ**: การเพิ่ม DNS records เหล่านี้ **ไม่กระทบอีเมลเดิม**

```bash
# อีเมลเดิมยังคงทำงานได้ปกติ:
info@yourcompany.com      ✅ ยังรับส่งได้เหมือนเดิม (Google Workspace)
sales@yourcompany.com     ✅ ไม่มีผลกระทบ (Microsoft 365)
support@yourcompany.com   ✅ ทำงานต่อไปตามปกติ (Hosting Provider)

# อีเมลใหม่สำหรับระบบ (Resend API):
noreply@yourcompany.com   ← เพิ่มใหม่สำหรับ notifications
alerts@yourcompany.com    ← เพิ่มใหม่สำหรับ system alerts
```

### Step 4: 📧 Resend ส่งอีเมลแจ้งสถานะ

**หลังจากเพิ่ม DNS records แล้ว**:

#### Email 2: DNS Configuration Detected
```html
From: Resend <noreply@resend.com>
To: admin@yourcompany.com
Subject: DNS Records Detected for yourcompany.com

Hi,

We've detected DNS records for yourcompany.com:

✅ MX Record: Found
✅ SPF Record: Found
✅ DKIM Record: Found
⏳ Verification Record: Checking...

Domain verification is in progress. You'll receive another email once complete.

Best regards,
Resend Team
```

#### Email 3: Verification Success
```html
From: Resend <noreply@resend.com>
To: admin@yourcompany.com
Subject: ✅ Domain Verified Successfully - yourcompany.com

Congratulations!

Your domain yourcompany.com has been successfully verified.

You can now:
✅ Send emails from any address @yourcompany.com
✅ Use your domain in production
✅ Access analytics and webhooks
✅ Remove sandbox limitations

Next steps:
1. Upgrade to Pro plan ($20/month) for production use
2. Update your EMAIL_FROM environment variable
3. Start sending emails to any recipient

Dashboard: https://resend.com/domains/yourcompany.com

Best regards,
Resend Team
```

### Step 5: 🎯 Configuration for Production

```bash
# Environment Variables (.env.production)
RESEND_API_KEY=re_production_key_here
EMAIL_FROM=Support Team <support@yourcompany.com>
```

```typescript
// ตอนนี้สามารถส่งอีเมลได้แล้ว:
await sendEmail({
  from: 'Support Team <support@yourcompany.com>',
  to: 'customer@anydomain.com',  // ส่งไปยังใครก็ได้!
  subject: 'Your ticket has been created',
  html: ticketTemplate
});
```

---

## 📅 Timeline การ Verify Domain

| ขั้นตอน | เวลาประมาณ | การแจ้งเตือน |
|---------|-------------|--------------|
| เพิ่ม Domain | ทันที | ✅ อีเมลแจ้ง DNS records |
| เพิ่ม DNS Records | 5-30 นาที | - |
| DNS Propagation | 1-24 ชั่วโมง | ✅ อีเมลแจ้งสถานะ detection |
| Verification Check | ทันทีหลัง propagation | ✅ อีเมลยืนยันสำเร็จ |
| Ready to Use | ทันที | ✅ อีเมลพร้อมใช้งาน |

---

## 🔍 ตัวอย่างการใช้งานจริง

### กรณี: บริษัท ABC Company

#### อีเมลเดิม (ไม่เปลี่ยนแปลง):
```bash
# ผ่าน Google Workspace - ใช้งานต่อไปตามปกติ
info@abccompany.com       ← ติดต่อทั่วไป
sales@abccompany.com      ← ทีมขาย  
hr@abccompany.com         ← ทีมบุคคล
accounting@abccompany.com ← ทีมบัญชี
```

#### อีเมลใหม่ (Resend API):
```bash
# สำหรับ Support Ticket System
noreply@abccompany.com      ← การแจ้งเตือนระบบ
support-system@abccompany.com ← ตั๋วสนับสนุน
alerts@abccompany.com       ← การเตือนภัย SLA
notifications@abccompany.com ← การแจ้งเตือนทั่วไป
```

#### Configuration:
```bash
# .env.production
RESEND_API_KEY=re_abc_company_production_key
EMAIL_FROM=ABC Support <support-system@abccompany.com>
```

---

## ⚠️ ปัญหาที่อาจเจอและการแก้ไข

### ❌ ไม่ได้รับอีเมลแจ้งเตือนจาก Resend

**สาเหตุ**:
- อีเมลไปใน spam/junk folder
- อีเมล admin ไม่ถูกต้องใน Resend account
- Mail server บล็อค external emails

**วิธีแก้**:
```bash
1. เช็ค spam/junk folder ทุกกล่องจดหมาย
2. เพิ่ม noreply@resend.com ใน email whitelist
3. ตรวจสอบ admin email ใน Resend account settings
4. ลองเพิ่ม alternative email ใน account
```

### ❌ DNS Records ไม่ถูกต้อง

**สาเหตุ**:
- DNS propagation ยังไม่เสร็จ
- Records ใส่ผิด format
- TTL สูงเกินไป

**วิธีแก้**:
```bash
# 1. ตรวจสอบ DNS records ด้วย command line:
nslookup -type=MX yourcompany.com
nslookup -type=TXT yourcompany.com
nslookup -type=TXT resend._domainkey.yourcompany.com

# 2. ใช้ online DNS checker:
https://dnschecker.org/
https://mxtoolbox.com/
https://whatsmydns.net/

# 3. แก้ไข records และรอ propagation
```

### ❌ Domain Verification ล้มเหลว

**สาเหตุ**:
- DNS records ยังไม่ propagate ทั่วโลก
- Records มีปัญหา syntax
- Resend server ไม่สามารถเข้าถึง DNS

**วิธีแก้**:
```bash
1. รอ DNS propagation เพิ่มเติม (สูงสุด 48 ชั่วโมง)
2. ลบ DNS records แล้วเพิ่มใหม่
3. ตรวจสอบ DNS server configuration
4. ติดต่อ Resend support หากยังไม่ได้
```

---

## 🧪 วิธีทดสอบ DNS Records

### Command Line Testing:
```bash
# Windows (Command Prompt / PowerShell)
nslookup -type=MX yourcompany.com
nslookup -type=TXT yourcompany.com
nslookup -type=TXT resend._domainkey.yourcompany.com
nslookup -type=TXT _resend.yourcompany.com

# Linux/Mac
dig MX yourcompany.com
dig TXT yourcompany.com
dig TXT resend._domainkey.yourcompany.com
dig TXT _resend.yourcompany.com

# ตรวจสอบ SPF Record
dig TXT yourcompany.com | grep "v=spf1"
```

### Online DNS Checker Tools:
```bash
# Global DNS Propagation Check:
https://dnschecker.org/
- ใส่ domain และเลือก record type
- ดูผลลัพธ์จาก servers ทั่วโลก

# MX Record & Email Configuration:
https://mxtoolbox.com/
- ตรวจสอบ MX, SPF, DKIM records
- วิเคราะห์ email deliverability

# DNS Propagation Status:
https://whatsmydns.net/
- ตรวจสอบ DNS propagation status
- แสดงผลจากหลาย locations
```

---

## 🎯 Production Readiness Checklist

### ก่อนใช้งานจริง:

#### Domain Verification:
- [ ] Domain added to Resend successfully
- [ ] ได้รับอีเมลแจ้ง DNS records จาก Resend
- [ ] เพิ่ม DNS records ครบทั้ง 4 records
- [ ] DNS records propagated (ตรวจสอบด้วย online tools)
- [ ] Domain verified successfully ใน Resend dashboard
- [ ] ได้รับอีเมลยืนยันสำเร็จจาก Resend

#### Resend Configuration:
- [ ] อัพเกรด Resend plan เป็น Pro ($20/month)
- [ ] ตั้งค่า EMAIL_FROM environment variable
- [ ] ทดสอบส่งอีเมลไปยังอีเมลภายนอก
- [ ] ตรวจสอบ email deliverability rate
- [ ] Setup email analytics และ monitoring

#### System Integration:
- [ ] อัพเดต email service configuration
- [ ] ทดสอบ ticket creation notifications
- [ ] ทดสอบ status change notifications
- [ ] ทดสอบ SLA warning notifications
- [ ] ตรวจสอบ error handling และ logging

### Environment Configuration:

#### Development:
```bash
# .env.local
RESEND_API_KEY=re_development_key
# ไม่ต้องตั้ง EMAIL_FROM (ใช้ sandbox mode)
```

#### Production:
```bash
# .env.production
RESEND_API_KEY=re_production_key_here
EMAIL_FROM=Support Team <support@yourcompany.com>
```

---

## 📊 สรุปความแตกต่าง: มีอีเมลอยู่แล้ว vs Verify Domain

| | มีอีเมลอยู่แล้ว | Verify Domain ใน Resend |
|---|---|---|
| **จุดประสงค์** | รับส่งอีเมลธุรกิจ | ส่งอีเมลผ่าน API |
| **Provider** | Google Workspace, M365, Hosting | Resend Service |
| **การใช้งาน** | อีเมลปกติ, ติดต่อลูกค้า | การแจ้งเตือนระบบ |
| **ผู้รับ** | ลูกค้า, พันธมิตร, ภายใน | ผู้ใช้ระบบ, ลูกค้า |
| **กระทบกัน** | ❌ ไม่กระทบ | ❌ ไม่กระทบ |
| **ค่าใช้จ่าย** | ตามแผนเดิม | $20/month (Pro plan) |
| **จำเป็น** | ✅ สำหรับธุรกิจ | ✅ สำหรับ Support System |

---

## 💡 คำแนะนำสำหรับการใช้งาน

### 🧪 Development Phase:
1. เริ่มด้วย sandbox mode (`onboarding@resend.dev`)
2. เพิ่มอีเมลทีมพัฒนาใน Resend Contacts
3. ทดสอบระบบ notification ทั้งหมด
4. ตรวจสอบ email templates และ content

### 🚀 Production Phase:
1. ยืนยัน domain ที่มีอยู่ใน Resend
2. อัพเกรด Resend Pro plan ($20/month)
3. ตั้งค่า custom from address
4. Monitor deliverability และ performance

### 📧 Email Strategy:
```bash
# แยกประเภทอีเมลให้ชัดเจน:

# Business Emails (ผ่าน Google Workspace/M365):
info@company.com         ← ติดต่อทั่วไป
sales@company.com        ← ทีมขาย
support@company.com      ← ฝ่ายลูกค้าสัมพันธ์

# System Emails (ผ่าน Resend API):
noreply@company.com      ← ระบบแจ้งเตือน
alerts@company.com       ← การเตือนภัย
system@company.com       ← ระบบอัตโนมัติ
```

### 🎯 Cost Optimization:
- **Development**: ใช้ Free plan ($0) + sandbox mode
- **Small Production**: Pro plan ($20/month) + 50K emails
- **Large Production**: Business plan ($85/month) + 500K emails

---

## 📞 การติดต่อขอความช่วยเหลือ

### Resend Support:
- **Email**: support@resend.com
- **Documentation**: https://resend.com/docs
- **Community**: https://resend.com/discord

### DNS Support:
- **Domain Registrar**: ติดต่อที่ซื้อ domain
- **Hosting Provider**: ติดต่อ hosting company
- **DNS Tools**: ใช้ online checker tools

---

**🎯 สรุป**: การ verify domain ใน Resend สำหรับบริษัทที่มีอีเมลอยู่แล้ว **ไม่เสียเงินเพิ่มสำหรับ DNS verification** แค่ต้องจ่าย $20/month สำหรับ Resend Pro plan เพื่อใช้งานจริงใน Production และ Resend จะส่งอีเมลแจ้งเตือนตลอดกระบวนการ verification!
