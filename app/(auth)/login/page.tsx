import React from 'react'
import Image from 'next/image'
import { LoginForm } from './components/LoginForm'
import { CheckCircle2 } from 'lucide-react'

const LoginPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>
}) => {
  const params = await searchParams;
  
  return (
    <div className="w-full max-w-5xl mx-auto overflow-hidden bg-white rounded-2xl shadow-2xl flex flex-col lg:flex-row min-h-[500px]">
      {/* Left Side - Branding & Features */}
      <div className="lg:w-1/2 bg-slate-900 text-white p-8 lg:p-12 flex flex-col justify-between relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-blue-500 blur-3xl"></div>
          <div className="absolute top-1/2 right-0 w-64 h-64 rounded-full bg-indigo-500 blur-3xl"></div>
          <div className="absolute bottom-0 left-1/4 w-80 h-80 rounded-full bg-purple-500 blur-3xl"></div>
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="relative h-12 w-12">
              <Image 
                src="/logo_ruth-removebg-preview.png" 
                alt="Ruthvictor Logo" 
                fill
                className="object-contain"
                priority
              />
            </div>
            <span className="text-2xl font-bold tracking-tight">Ruthvictor</span>
          </div>

          <h1 className="text-3xl lg:text-4xl font-bold leading-tight mb-6">
            ระบบจัดการตั๋วแจ้งปัญหาและติดตามงานบริการ
          </h1>
          
          <p className="text-slate-300 text-lg mb-8">
            ยกระดับกระบวนการซัพพอร์ตและเพิ่มประสิทธิภาพการดำเนินงานด้วยระบบจัดการ Ticket ที่ครบวงจร
          </p>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-6 w-6 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-white">ระบบจัดการ Ticket อัจฉริยะ</h3>
                <p className="text-sm text-slate-400">รองรับการทำงานหลายโครงการพร้อมกันและส่งต่อเคสอัตโนมัติ</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-6 w-6 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-white">ติดตามสถานะแบบ Real-time</h3>
                <p className="text-sm text-slate-400">ติดตามงานบริการและสามารถวัดผลตาม SLA ได้
</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-6 w-6 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-white">ระบบแจ้งเตือนตลอด 24 ชั่วโมง
</h3>
                <p className="text-sm text-slate-400">แจ้งเตือนเมื่อมี ticket ใหม่<br />
แจ้งเตือนเมื่อมีการอัปเดตสถานะ<br />
แจ้งเตือนก่อนหมดระยะเวลา SLA 80%</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 mt-12 text-sm text-slate-500">
          © {new Date().getFullYear()} Ruthvictor. All rights reserved.
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="lg:w-1/2 bg-white p-8 lg:p-12 flex items-center justify-center">
        <div className="w-full max-w-md">
          <LoginForm message={params.message} />
        </div>
      </div>
    </div>
  );
}

export default LoginPage