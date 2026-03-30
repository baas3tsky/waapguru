'use client';

/**
 * Priority Distribution Pie Chart Component
 * แสดงการกระจายความเร่งด่วนของ Ticket ในรูปแบบกราฟวงกลม
 * รองรับข้อมูลจริงจากฐานข้อมูล พร้อม tooltip และ animation
 */

import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PriorityBreakdown } from '@/types/report';

interface PriorityPieChartProps {
  data: PriorityBreakdown[];
  title?: string;
  description?: string;
}

// สีสำหรับแต่ละระดับความเร่งด่วน - เรียงจากสูงไปต่ำ
const PRIORITY_COLORS: Record<string, string> = {
  High: '#F97316',      // Orange-500 (สูง)
  Medium: '#FBBF24',    // Amber-400 (ปานกลาง)
  Low: '#10B981'        // Green-500 (ต่ำ)
};

// ชื่อความเร่งด่วนภาษาไทย
const PRIORITY_LABELS: Record<string, string> = {
  High: 'High',
  Medium: 'Medium',
  Low: 'Low'
};

// Emoji สำหรับแต่ละระดับความเร่งด่วน
const PRIORITY_EMOJIS: Record<string, string> = {
  High: '🟠',
  Medium: '🟡',
  Low: '🟢'
};

export function PriorityPieChart({
  data,
  title = 'การกระจายตามความเร่งด่วน',
  description = 'สัดส่วน Ticket ตามระดับความเร่งด่วน'
}: PriorityPieChartProps) {
  // Validate data
  if (!data || !Array.isArray(data)) {
    console.warn('[PriorityPieChart] Invalid data received:', data);
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-96">
          <p className="text-gray-500">ไม่มีข้อมูลที่จะแสดง</p>
        </CardContent>
      </Card>
    );
  }

  // Ensure all 3 priorities are present
  const allPriorities: Array<'High' | 'Medium' | 'Low'> = [
    'High', 
    'Medium', 
    'Low'
  ];
  
  // สร้างข้อมูลครบทุกระดับ (กรอกค่า 0 สำหรับระดับที่ไม่มีข้อมูล)
  const completeData = allPriorities.map(priority => {
    const found = data.find(item => item.priority === priority);
    return {
      priority,
      count: found?.count || 0,
      percentage: found?.percentage || 0
    };
  });
  
  // คำนวณจำนวน Ticket ทั้งหมด
  const totalTickets = completeData.reduce((sum, item) => sum + item.count, 0);
  
  // แปลงข้อมูลสำหรับกราฟ
  const chartData = completeData.map(item => ({
    name: PRIORITY_LABELS[item.priority] || item.priority,
    value: item.count,
    percentage: item.percentage,
    priority: item.priority
  }));

  // แสดงข้อความเมื่อไม่มี Ticket
  if (totalTickets === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-96">
          <div className="text-center">
            <p className="text-gray-500 mb-2">ไม่มี Ticket ในช่วงเวลาที่เลือก</p>
            <p className="text-sm text-gray-400">กรุณาเลือกช่วงเวลาอื่น หรือสร้าง Ticket ใหม่</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Custom Tooltip
  interface TooltipProps {
    active?: boolean;
    payload?: Array<{
      name: string;
      value: number;
      payload: {
        priority: string;
        percentage: number;
      };
    }>;
  }

  const CustomTooltip = ({ active, payload }: TooltipProps) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
          <p className="font-semibold text-gray-900 mb-1">{data.name}</p>
          <p className="text-sm text-gray-600">จำนวน: {data.value} Ticket{data.value !== 1 ? 's' : ''}</p>
          <p className="text-sm text-gray-600">
            สัดส่วน: {data.payload.percentage.toFixed(1)}%
          </p>
        </div>
      );
    }
    return null;
  };

  // Custom label renderer - แสดงเปอร์เซ็นต์บนกราฟ
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderLabel = (props: any) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, percentage, value } = props;
    
    // ไม่แสดง label ถ้าค่าเป็น 0
    if (value === 0 || percentage === 0) return null;
    
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="black"
        textAnchor="middle"
        dominantBaseline="central"
        className="font-semibold"
        style={{ fontSize: '14px' }}
      >
        {`${percentage.toFixed(1)}%`}
      </text>
    );
  };

  return (
    <Card className="w-full shadow-sm h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <span>{title}</span>
          <span className="text-sm font-normal text-gray-500">
            ทั้งหมด {totalTickets} Ticket{totalTickets !== 1 ? 's' : ''}
          </span>
        </CardTitle>
        <CardDescription className="text-sm">{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <div className="flex-1" style={{ minHeight: '250px', maxHeight: '300px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderLabel}
                outerRadius={80}
                innerRadius={45}
                fill="#8884d8"
                dataKey="value"
                paddingAngle={2}
                animationBegin={0}
                animationDuration={800}
                animationEasing="ease-out"
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={PRIORITY_COLORS[entry.priority] || '#8884d8'}
                    style={{ 
                      outline: 'none',
                      filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))'
                    }}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        {/* Compact Legend */}
        <div className="flex flex-wrap justify-center gap-2 mt-4">
          {chartData.map((item, index) => {
            const emoji = PRIORITY_EMOJIS[item.priority];
            return (
              <div 
                key={`legend-${index}`} 
                className="flex items-center gap-1.5 px-2 py-1.5 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
              >
                <span className="text-sm flex-shrink-0">
                  {emoji}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-gray-700 whitespace-nowrap">
                    {item.name} {item.value} ({item.percentage.toFixed(1)}%)
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
