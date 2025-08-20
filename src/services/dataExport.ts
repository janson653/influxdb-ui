/**
 * 数据导出服务
 * 支持CSV、JSON、Excel格式导出
 */

import * as XLSX from 'xlsx';

export interface ExportData {
  columns: Array<{
    title: string;
    dataIndex: string;
    type?: 'string' | 'number' | 'date' | 'boolean';
  }>;
  data: Array<Record<string, any>>;
}

export interface ExportOptions {
  format: 'csv' | 'json' | 'excel';
  filename?: string;
  sheetName?: string;
  includeHeader?: boolean;
  dateColumns?: string[];
}

export class DataExportService {
  /**
   * 导出数据到指定格式
   */
  static async exportData(data: ExportData, options: ExportOptions): Promise<void> {
    const {
      format,
      filename = `export_${new Date().toISOString().split('T')[0]}`,
      sheetName = 'Sheet1',
      includeHeader = true,
      dateColumns = []
    } = options;

    try {
      let content: string | Blob;
      let mimeType: string;
      let extension: string;

      switch (format) {
        case 'csv':
          content = this.exportToCSV(data, { includeHeader });
          mimeType = 'text/csv;charset=utf-8;';
          extension = 'csv';
          break;

        case 'json':
          content = this.exportToJSON(data);
          mimeType = 'application/json;charset=utf-8;';
          extension = 'json';
          break;

        case 'excel':
          content = await this.exportToExcel(data, { sheetName, includeHeader, dateColumns });
          mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;';
          extension = 'xlsx';
          break;

        default:
          throw new Error(`不支持的导出格式: ${format}`);
      }

      // 下载文件
      this.downloadFile(content, `${filename}.${extension}`, mimeType);
    } catch (error) {
      console.error('数据导出失败:', error);
      throw new Error(`导出失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 导出为CSV格式
   */
  private static exportToCSV(exportData: ExportData, options: { includeHeader: boolean }): string {
    const { includeHeader } = options;
    const { columns, data } = exportData;

    const rows: string[] = [];

    // 添加表头
    if (includeHeader) {
      const header = columns.map(col => this.escapeCSVValue(col.title)).join(',');
      rows.push(header);
    }

    // 添加数据行
    data.forEach((row: Record<string, any>) => {
      const values = columns.map(col => {
        const value = row[col.dataIndex];
        return this.escapeCSVValue(this.formatValue(value, col.type));
      });
      rows.push(values.join(','));
    });

    // 添加BOM以支持中文
    return '\uFEFF' + rows.join('\n');
  }

  /**
   * 导出为JSON格式
   */
  private static exportToJSON(exportData: ExportData): string {
    const { columns, data } = exportData;
    
    // 格式化数据，添加更友好的结构
    const formattedData = data.map((row: Record<string, any>) => {
      const formattedRow: Record<string, any> = {};
      columns.forEach(col => {
        const value = row[col.dataIndex];
        formattedRow[col.title] = this.formatValue(value, col.type);
      });
      return formattedRow;
    });

    return JSON.stringify({
      metadata: {
        exportedAt: new Date().toISOString(),
        columnCount: columns.length,
        rowCount: data.length,
        columns: columns.map(col => ({
          title: col.title,
          dataIndex: col.dataIndex,
          type: col.type || 'string'
        }))
      },
      data: formattedData
    }, null, 2);
  }

  /**
   * 导出为Excel格式
   */
  private static async exportToExcel(
    exportData: ExportData, 
    options: { sheetName: string; includeHeader: boolean; dateColumns: string[] }
  ): Promise<Blob> {
    const { sheetName, includeHeader, dateColumns } = options;
    const { columns, data } = exportData;

    // 准备工作表数据
    const worksheetData: any[][] = [];

    // 添加表头
    if (includeHeader) {
      worksheetData.push(columns.map(col => col.title));
    }

    // 添加数据行
    data.forEach((row: Record<string, any>) => {
      const rowData = columns.map(col => {
        const value = row[col.dataIndex];
        return this.formatExcelValue(value, col.type, dateColumns.includes(col.dataIndex));
      });
      worksheetData.push(rowData);
    });

    // 创建工作簿
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    // 设置列宽
    const colWidths = columns.map(col => ({
      wch: Math.max(col.title.length, 15) // 最小宽度为15
    }));
    worksheet['!cols'] = colWidths;

    // 添加工作表到工作簿
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // 生成Excel文件
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }

  /**
   * 转义CSV值
   */
  private static escapeCSVValue(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }

    const str = String(value);
    
    // 如果包含逗号、换行符或双引号，需要用双引号包围
    if (str.includes(',') || str.includes('\n') || str.includes('"')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    
    return str;
  }

  /**
   * 格式化值
   */
  private static formatValue(value: any, type?: string): any {
    if (value === null || value === undefined) {
      return null;
    }

    switch (type) {
      case 'date':
        try {
          return new Date(value).toISOString();
        } catch {
          return value;
        }
      
      case 'number':
        if (typeof value === 'string') {
          const num = parseFloat(value);
          return isNaN(num) ? value : num;
        }
        return value;
      
      case 'boolean':
        if (typeof value === 'string') {
          return value.toLowerCase() === 'true' || value === '1';
        }
        return Boolean(value);
      
      default:
        return value;
    }
  }

  /**
   * 格式化Excel值
   */
  private static formatExcelValue(value: any, type?: string, isDateColumn?: boolean): any {
    if (value === null || value === undefined) {
      return '';
    }

    if (isDateColumn || type === 'date') {
      try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return date;
        }
      } catch {
        // 如果不是有效日期，返回原值
      }
    }

    if (type === 'number') {
      if (typeof value === 'string') {
        const num = parseFloat(value);
        return isNaN(num) ? value : num;
      }
      return value;
    }

    return value;
  }

  /**
   * 下载文件
   */
  private static downloadFile(content: string | Blob, filename: string, mimeType: string): void {
    let blob: Blob;

    if (typeof content === 'string') {
      blob = new Blob([content], { type: mimeType });
    } else {
      blob = content;
    }

    if (typeof window !== 'undefined') {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      throw new Error('下载功能仅在浏览器环境中可用');
    }
  }

  /**
   * 获取推荐的文件名
   */
  static suggestFilename(baseName: string, format: 'csv' | 'json' | 'excel'): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const extension = format === 'excel' ? 'xlsx' : format;
    return `${baseName}_${timestamp}.${extension}`;
  }

  /**
   * 检查浏览器是否支持文件下载
   */
  static isDownloadSupported(): boolean {
    return typeof window !== 'undefined' && typeof document !== 'undefined';
  }
}