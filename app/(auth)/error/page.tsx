import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader
} from "@/components/ui/card"

export default async function ErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string, details?: string }>
}) {
  const params = await searchParams;
  
  const getErrorMessage = (code: string) => {
    switch (code) {
      case "account-not-found":
        return (
          <>
            ไม่พบบัญชีผู้ใช้นี้ในระบบ
            <br />
            กรุณาลงทะเบียนก่อนเข้าสู่ระบบ
          </>
        );
      case "reset-link-expired":
        return "ลิงก์รีเซ็ตรหัสผ่านหมดอายุแล้ว กรุณาขอลิงก์ใหม่อีกครั้ง";
      case "reset-code-expired":
        return "Your password reset link has expired. Please request a new one.";
      case "invalid-reset-code":
        return "Invalid reset code. Please request a new password reset.";
      case "invalid-verification-link":
        return "ลิงก์ยืนยันไม่ถูกต้องหรือหมดอายุ กรุณาขอลิงก์ใหม่อีกครั้ง";
      case "user-session-error":
        return "User session error. Please request a new password reset.";
      case "no-user-session":
        return "No user session found. Please request a new password reset.";
      case "passwords-dont-match":
        return "Passwords don't match. Please try again.";
      case "password-too-short":
        return "Password must be at least 6 characters long.";
      case "password-update-failed":
        return "Failed to update password. Please try again.";
      case "unexpected-error":
        return "An unexpected error occurred. Please try again.";
      case "oauth-error":
        return "เกิดข้อผิดพลาดในการเข้าสู่ระบบด้วย Google กรุณาลองใหม่อีกครั้ง";
      case "auth-session-failed":
        return "ไม่สามารถสร้างเซสชันได้ กรุณาลองเข้าสู่ระบบอีกครั้ง";
      case "auth-callback-failed":
        return "เกิดข้อผิดพลาดในการยืนยันตัวตน กรุณาลองใหม่อีกครั้ง";
      default:
        return "An error occurred. Please try again.";
    }
  };

  const shouldShowResetButton = (code: string) => {
    return [
      "reset-link-expired",
      "reset-code-expired",
      "invalid-reset-code",
      "invalid-verification-link",
      "user-session-error",
      "no-user-session"
    ].includes(code);
  };

  const shouldShowSignupButton = (code: string) => {
    return code === "account-not-found";
  };

  // Clean up details - remove NEXT_REDIRECT noise
  const cleanDetails = (details: string) => {
    if (details.includes("NEXT_REDIRECT")) {
      return "Internal redirect error occurred";
    }
    return details;
  };

  return (
    <div className="flex h-screen w-full items-center justify-center px-4">
      <Card className="mx-auto max-w-3xl w-full">
        <CardHeader>
          <CardDescription className="text-center text-base">
            {getErrorMessage(params.message || "")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {params.details && !params.details.includes("NEXT_REDIRECT") && (
              <div className="text-xs text-gray-500 bg-gray-100 p-2 rounded">
                <strong>Details:</strong> {decodeURIComponent(cleanDetails(params.details))}
              </div>
            )}

            {shouldShowSignupButton(params.message || "") ? (
              <>
                <Button asChild className="w-full">
                  <Link href="/signup">
                    Sign Up
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/login">
                    Back to Login
                  </Link>
                </Button>
              </>
            ) : (
              <>
                <Button asChild className="w-full">
                  <Link href="/login">
                    Back to Login
                  </Link>
                </Button>
                
                {shouldShowResetButton(params.message || "") && (
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/forgot-password">
                      Request New Reset
                    </Link>
                  </Button>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}