'use client';

/**
 * Supplier Performance Table Component
 * Displays supplier performance metrics with Thai labels
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SupplierPerformance } from '@/types/report';

interface SupplierTableProps {
  data: SupplierPerformance[];
}

export function SupplierTable({ data }: SupplierTableProps) {
  // Helper function to format time (hours to minutes if < 1 hour)
  const formatTime = (hours: number): string => {
    const totalMinutes = Math.round(hours * 60);

    if (totalMinutes < 60) {
      return `${totalMinutes} นาที`;
    }

    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;

    if (m === 0) {
      return `${h} ชม.`;
    }

    return `${h} ชม. ${m} นาที`;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">ประสิทธิภาพของ Supplier แต่ละราย</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left p-3 text-sm font-semibold text-gray-700">Supplier</th>
                <th className="text-center p-3 text-sm font-semibold text-gray-700">Tickets</th>
                <th className="text-center p-3 text-sm font-semibold text-gray-700">แก้ไขแล้ว</th>
                <th className="text-center p-3 text-sm font-semibold text-gray-700">เวลาตอบกลับเฉลี่ย</th>
                <th className="text-center p-3 text-sm font-semibold text-gray-700">เวลาแก้ไขปัญหาเฉลี่ย</th>
                <th className="text-center p-3 text-sm font-semibold text-gray-700">SLA (%)</th>
              </tr>
            </thead>
            <tbody>
              {data.map((supplier, index) => {
                // Calculate response time display
                const responseTimeDisplay = formatTime(supplier.avgResponseTime);
                const resolutionTimeDisplay = formatTime(supplier.avgResolutionTime);

                return (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    {/* Supplier name */}
                    <td className="p-3">
                      <div className="font-medium text-gray-900">{supplier.supplierName}</div>
                      <div className="text-xs text-gray-500">{supplier.supplierEmail}</div>
                    </td>

                    {/* Assigned tickets */}
                    <td className="text-center p-3">
                      <div className="font-semibold text-gray-900">{supplier.totalAssigned}</div>
                    </td>

                    {/* Completed */}
                    <td className="text-center p-3">
                      <div className="inline-flex flex-col items-center">
                        <span className="font-semibold text-green-600">{supplier.totalCompleted}/{supplier.totalAssigned}</span>
                      </div>
                    </td>

                    {/* Avg Response Time */}
                    <td className="text-center p-3">
                      <div className="font-medium text-gray-700">
                        {responseTimeDisplay}
                      </div>
                    </td>

                    {/* Avg Resolution Time */}
                    <td className="text-center p-3">
                      <div className="font-medium text-gray-700">
                        {resolutionTimeDisplay}
                      </div>
                    </td>

                    {/* SLA */}
                    <td className="text-center p-3">
                      <div className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-semibold ${
                        supplier.slaCompliance >= 90
                          ? 'bg-green-100 text-green-700'
                          : supplier.slaCompliance >= 80
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {supplier.slaCompliance.toFixed(0)}%
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
