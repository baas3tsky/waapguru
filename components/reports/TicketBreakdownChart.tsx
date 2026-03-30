'use client';

/**
 * Category/Priority Bar Chart Component
 * Shows ticket distribution by category or priority with horizontal bars
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CategoryBreakdown, PriorityBreakdown } from '@/types/report';

interface TicketBreakdownChartProps {
  data: CategoryBreakdown[] | PriorityBreakdown[];
  title?: string;
  description?: string;
  type: 'category' | 'priority';
}

export function TicketBreakdownChart({
  data,
  title = 'การวิเคราะห์ตามหมวดหมู่',
  description = 'จำนวน Ticket แยกตามประเภทปัญหา',
  type
}: TicketBreakdownChartProps) {
  // Get max count for percentage calculation
  const maxCount = Math.max(...data.map(item => item.count));

  // Color mapping for categories
  const getCategoryColor = (index: number) => {
    const colors = [
      'bg-blue-500',
      'bg-purple-500', 
      'bg-pink-500',
      'bg-orange-500',
      'bg-teal-500',
      'bg-indigo-500'
    ];
    return colors[index % colors.length];
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        <CardDescription className="text-sm text-gray-600">{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.map((item, index) => {
          const name = type === 'category' 
            ? (item as CategoryBreakdown).category 
            : (item as PriorityBreakdown).priority;
          
          const widthPercentage = (item.count / maxCount) * 100;
          const colorClass = getCategoryColor(index);

          return (
            <div key={index} className="space-y-2">
              {/* Category name and count */}
              <div className="flex justify-between items-center text-sm">
                <span className="font-medium text-gray-700">{name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-gray-500">
                    {item.count} ({item.percentage.toFixed(0)}%)
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className={`${colorClass} h-2.5 rounded-full transition-all duration-500`}
                  style={{ width: `${widthPercentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
