/**
 * {{PROJECT_NAME}}
 * {{PROJECT_DESCRIPTION}}
 */

// ユーティリティ関数の例
export function greet(name: string = 'World'): string {
  return `Hello, ${name}!`;
}

export function add(a: number, b: number): number {
  return a + b;
}

export function multiply(a: number, b: number): number {
  return a * b;
}

// 文字列操作ユーティリティ
export function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// 配列操作ユーティリティ
export function chunk<T>(array: T[], size: number): T[][] {
  if (size <= 0) throw new Error('Size must be greater than 0');
  
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

export function unique<T>(array: T[]): T[] {
  return [...new Set(array)];
}

// 型定義の例
export interface User {
  id: number;
  name: string;
  email: string;
}

export interface Config {
  apiUrl: string;
  timeout: number;
  retries: number;
}

// クラスの例
export class ApiClient {
  private baseUrl: string;
  private timeout: number;

  constructor(config: Config) {
    this.baseUrl = config.apiUrl;
    this.timeout = config.timeout;
  }

  async get(endpoint: string): Promise<any> {
    // 実際のHTTPリクエストの実装
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ 
          data: `Mock response from ${this.baseUrl}${endpoint}`,
          status: 200 
        });
      }, 100);
    });
  }
}

// デフォルトエクスポート
export default {
  greet,
  add,
  multiply,
  capitalize,
  slugify,
  chunk,
  unique,
  ApiClient
};