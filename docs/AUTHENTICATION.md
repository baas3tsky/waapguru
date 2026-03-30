# 🔐 Authentication System Documentation

ระบบ Authentication ของ Support Ticket System ถูกออกแบบเป็น **Custom Passwordless Authentication** (Magic Link) โดยไม่ใช้ Library สำเร็จรูปอย่าง NextAuth แต่ใช้การผสมผสานระหว่าง Standard Web Security practices และ SharePoint List เป็น Database

## 🏗 System Overview

ระบบประกอบด้วย 3 ส่วนหลัก:
1.  **Frontend**: หน้า Login รับ Email Input
2.  **Backend Logic**: 
    -   สร้างและตรวจสอบ Verification Token
    -   จัดการ Session เป็น JWT (JSON Web Token)
    -   ใช้ `jose` library สำหรับ Cryptographic operations
3.  **Database & Services**:
    -   **SharePoint Lists ("Users")**: เก็บข้อมูลผู้ใช้และ Token
    -   **Resend Service**: จัดส่งอีเมล Magic Link

## 🔄 Authentication Flow

### 1. Login Request (Sign In)
- **User Action**: ผู้ใช้กรอกอีเมลในหน้า Login
- **Process**:
  1.  System ตรวจสอบ `Allowed Domains` (เช่น @rhd.co.th) เพื่อจำกัดสิทธิ์ผู้ใช้งาน
  2.  System สร้าง **Verification Token** (Random Hex String) และ **Expiry Time** (Default 1 ชั่วโมง)
  3.  บันทึก Token ลงในคอลัมน์ `VerificationToken` ของผู้ใช้ใน **SharePoint Users List**
  4.  ส่งอีเมลผ่าน **Resend API** พร้อมลิงก์ยืนยัน:
      `GET /api/auth/verify?token=...&email=...`

### 2. Verification (Magic Link Click)
- **User Action**: ผู้ใช้กดลิงก์ในอีเมล
- **Process**:
  1.  Route Handler (`/api/auth/verify`) รับค่า token และ email
  2.  System ค้นหา user ใน SharePoint ด้วยอีเมล
  3.  ตรวจสอบความถูกต้อง:
      -   Token ตรงกันหรือไม่
      -   Token หมดอายุหรือยัง (Expiry Time)
  4.  หากถูกต้อง -> **Verify Successful**

### 3. Session Creation
- **Process**: หลังยืนยันตัวตนสำเร็จ
  1.  สร้าง **JWT Token** ด้วย library `jose` ประกอบด้วย payload:
      -   `userId`: SharePoint ID
      -   `email`: User Email
      -   `name`: Full Name
  2.  Sign Token ด้วย `JWT_SECRET` (HS256)
  3.  ตั้งค่า **HTTP-Only Cookie** ชื่อ `session-token`
  4.  Redirect ผู้ใช้เข้าสู่ Dashboard

### 4. Session Verification & Protection
- **Middleware / Server Actions**:
  -   ทุก Request ที่ต้องการ Authentication จะอ่านค่าจาก cookie `session-token`
  -   ใช้ `jwtVerify` ตรวจสอบ Signature และ Expiration ของ JWT
  -   หาก Token ไม่ถูกต้องหรือหมดอายุ -> Redirect ไปหน้า Login

## 🛠 Technical Implementation Details

### Key Libraries
-   **jose**: ใช้สำหรับ Sign และ Verify JWT (Lightweight & Edge Runtime compatible)
-   **crypto**: ใช้สร้าง Random Verification Token
-   **@microsoft/microsoft-graph-client**: เชื่อมต่อกับ SharePoint List

### Configuration
การตั้งค่าที่สำคัญใน `lib/auth-utils.ts` และ `.env`:
-   `JWT_SECRET`: Secret Key สำหรับ Sign JWT
-   `SESSION_COOKIE_NAME`: ชื่อ cookie (default: `session-token`)
-   `MAX_AGE`: อายุของ Session (default: 7 วัน)

### Database Schema (SharePoint List: Users)
| Column Name | Type | Description |
|------------|------|-------------|
| Title | Text | Email Address (Primary Key) |
| FullName | Text | ชื่อ-นามสกุล |
| VerificationToken | Text | Token สำหรับยืนยันตัวตนปัจจุบัน |
| TokenExpiry | DateTime | เวลาหมดอายุของ Token |
| EmailVerified | Boolean | สถานะการยืนยันอีเมล |
