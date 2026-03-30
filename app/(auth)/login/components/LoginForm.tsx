"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { sendVerificationEmail } from "@/lib/actions/auth-actions"
import { HydrationSafeWrapper } from "@/components/ui/hydration-safe-wrapper"

export function LoginForm({ message }: { message?: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState<string>("");

  async function handleSubmit(formData: FormData) {
    setIsLoading(true);
    setError("");
    
    // Construct full email from username
    const username = formData.get("username") as string;
    const fullEmail = `${username}@ruthvictor.com`;
    
    // Create new FormData with full email
    const newFormData = new FormData();
    newFormData.append("email", fullEmail);
    
    const result = await sendVerificationEmail(newFormData);
    
    setIsLoading(false);
    
    if (result.error) {
      setError(result.error);
    } else if (result.success) {
      setEmailSent(true);
    }
  }

  return (
    <HydrationSafeWrapper>
      <Card className="mx-auto max-w-md w-full border-0 shadow-none">
        <CardHeader className="px-0">
          <CardTitle className="text-3xl font-bold text-center">Welcome Back</CardTitle>
          <CardDescription className="text-center text-base">
            Enter your email to access your account
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          {emailSent ? (
            <div className="text-center py-6">
              <div className="mb-4 text-green-600">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">เช็คอีเมลของคุณ</h3>
              <p className="text-md text-muted-foreground mb-4">
                เราได้ส่งลิงก์ยืนยันไปยังที่ Outlook ของคุณแล้ว คลิกที่ลิงก์ในอีเมลเพื่อเข้าสู่ระบบ
              </p>
              <p className="text-xs text-muted-foreground">
                ลิงก์จะหมดอายุใน 1 ชั่วโมง.
              </p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setEmailSent(false)}
              >
                กลับไปหน้าเข้าสู่ระบบ
              </Button>
            </div>
          ) : (
            <form action={handleSubmit}>
              <div className="grid gap-4">
                {message && (
                  <div className="text-sm bg-blue-50 text-blue-600 p-3 rounded">
                    {message}
                  </div>
                )}
                
                {error && (
                  <div className="text-sm bg-red-50 text-red-600 p-3 rounded">
                    {error}
                  </div>
                )}
                
                <div className="grid gap-2">
                  <Label htmlFor="username">Email</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="username"
                      name="username"
                      type="text"
                      placeholder="username"
                      required
                      autoComplete="username"
                      disabled={isLoading}
                      className="flex-1 text-right"
                    />
                    <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">@ruthvictor.com</span>
                  </div>
                </div>

                <Button type="submit" className="w-full border-2 border-blue-500" disabled={isLoading}>
                  {isLoading ? "Sending..." : "Login"}
                </Button>

                <div className="text-center text-sm text-muted-foreground">
                  Only @ruthvictor.com emails are allowed
                </div>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </HydrationSafeWrapper>
  )
}