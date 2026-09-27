import { NextResponse } from 'next/server';
import { generateFullBusinessWorkbook } from '@/lib/exports/excel-generator';

export async function GET() {
  try {
    const buffer = await generateFullBusinessWorkbook();
    const today = new Date().toISOString().split('T')[0];
    const filename = `business-management-report-${today}.xlsx`;

    return new NextResponse(buffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error('Error generating Excel report:', error);
    return NextResponse.json(
      { error: 'Failed to generate Excel workbook' },
      { status: 500 }
    );
  }
}
