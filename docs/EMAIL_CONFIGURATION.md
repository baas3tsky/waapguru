# 📧 การตั้งค่า Email สำหรับ Production

## ✅ ขั้นตอนการแก้ไขหลังจาก Verify Domain ใน Resend

### 1. ตั้งค่า Environment Variable

แก้ไขไฟล์ `.env.local` (ถ้ายังไม่มีให้สร้างใหม่):

```env
# Resend API Key
RESEND_API_KEY=re_xxxxxxxxxxxxx

# Email From Address - ใช้ domain ที่ verify แล้ว
EMAIL_FROM=noreply@ruthvictor.com
```

**หมายเหตุ:** 
- เปลี่ยน `noreply@ruthvictor.com` เป็น email address ที่ใช้ domain ที่คุณ verify แล้วใน Resend
- สามารถใช้ email อื่นได้ เช่น:
  - `support@ruthvictor.com`
  - `tickets@ruthvictor.com`
  - `no-reply@ruthvictor.com`

### 2. Restart Development Server

หลังจากแก้ไข `.env.local` แล้ว ต้อง restart server:

```bash
# หยุด server (Ctrl+C)
# จากนั้นเริ่มใหม่
npm run dev
```

### 3. ทดสอบส่งอีเมล

ลองสร้าง Ticket ใหม่และตรวจสอบว่าอีเมลส่งสำเร็จโดยไม่มี error

---

## 🔧 การแก้ปัญหา

### ❌ Error: "You can only send testing emails to your own email"

**สาเหตุ:** ยังไม่ได้ตั้งค่า `EMAIL_FROM` หรือใช้ email ที่ไม่ได้ verify domain

**วิธีแก้:**
1. ตรวจสอบว่า verify domain สำเร็จแล้วใน [Resend Dashboard](https://resend.com/domains)
2. ตั้งค่า `EMAIL_FROM` ในไฟล์ `.env.local` ให้ใช้ domain ที่ verify แล้ว
3. Restart server

### ❌ Email ส่งไปที่ Spam

**วิธีแก้:**
1. ตรวจสอบ DNS records (SPF, DKIM, DMARC) ให้ครบถ้วน
2. ใช้ From Name ที่เหมาะสม เช่น `"Support Team <support@ruthvictor.com>"`
3. เพิ่ม unsubscribe link ถ้าเป็น marketing email

### ✅ Best Practices

1. **From Address ที่แนะนำ:**
   - ✅ `noreply@yourdomain.com` - สำหรับ notification
   - ✅ `support@yourdomain.com` - ถ้าต้องการให้ตอบกลับได้
   - ❌ `admin@gmail.com` - ห้ามใช้ free email provider

2. **From Name:**
   ```typescript
   from: 'Support Ticket System <noreply@ruthvictor.com>'
   ```

3. **Reply-To:**
   ```typescript
   {
     from: 'noreply@ruthvictor.com',
     replyTo: 'support@ruthvictor.com', // email ที่รับการตอบกลับ
     to: recipients,
     subject: subject,
     html: html
   }
   ```

---

## 📝 ตัวอย่างการใช้งาน

### ส่งอีเมลพร้อม Custom From

```typescript
await sendEmail({
  from: 'Support Team <support@ruthvictor.com>',
  to: 'user@example.com',
  subject: 'New Ticket Created',
  html: '<p>Your ticket has been created</p>'
});
```

### ใช้ Default From (จาก ENV)

```typescript
await sendEmail({
  to: 'user@example.com',
  subject: 'New Ticket Created',
  html: '<p>Your ticket has been created</p>'
});
// จะใช้ EMAIL_FROM จาก environment variable
```

---

## 🎯 Verified Domains ที่แนะนำ

- **Production**: `ruthvictor.com` ✅
- **Staging**: `staging.ruthvictor.com`
- **Development**: ใช้ Resend sandbox (จำกัดเฉพาะ email ที่ลงทะเบียนไว้)

---

## 📚 อ่านเพิ่มเติม

- [Resend Domain Verification Guide](https://resend.com/docs/dashboard/domains/introduction)
- [DNS Configuration](https://resend.com/docs/dashboard/domains/dns-setup)
- [Email Best Practices](https://resend.com/docs/knowledge-base/email-best-practices)
