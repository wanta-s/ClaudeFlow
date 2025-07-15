// クライアント側の使用例
import axios, { AxiosInstance, AxiosError } from 'axios';
import { 
  UserRegistrationRequest, 
  UserLoginRequest,
  ApiResponse, 
  AuthResponse,
  PasswordStrength 
} from '../types/auth.types';

// APIクライアントクラス
class AuthApiClient {
  private axios: AxiosInstance;
  private token: string | null = null;

  constructor(baseURL: string = 'http://localhost:3000/api') {
    this.axios = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // リクエストインターセプター（認証トークンの自動付与）
    this.axios.interceptors.request.use(
      (config) => {
        if (this.token) {
          config.headers.Authorization = `Bearer ${this.token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // レスポンスインターセプター（エラーハンドリング）
    this.axios.interceptors.response.use(
      (response) => response,
      (error: AxiosError<ApiResponse>) => {
        if (error.response?.status === 401) {
          // トークンが無効な場合の処理
          this.token = null;
          // リダイレクトなどの処理
        }
        return Promise.reject(error);
      }
    );
  }

  // ユーザー登録
  async register(data: UserRegistrationRequest): Promise<AuthResponse> {
    try {
      const response = await this.axios.post<ApiResponse<AuthResponse>>('/auth/register', data);
      
      if (response.data.success && response.data.data) {
        this.token = response.data.data.token;
        return response.data.data;
      }
      
      throw new Error(response.data.error || 'Registration failed');
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(error.response.data.error || 'Registration failed');
      }
      throw error;
    }
  }

  // パスワード強度チェック
  async checkPasswordStrength(password: string): Promise<PasswordStrength> {
    const response = await this.axios.post<ApiResponse<{ strength: PasswordStrength }>>(
      '/auth/check-password-strength',
      { password }
    );
    
    if (response.data.success && response.data.data) {
      return response.data.data.strength;
    }
    
    throw new Error('Failed to check password strength');
  }

  // トークンの設定
  setToken(token: string): void {
    this.token = token;
  }

  // トークンのクリア
  clearToken(): void {
    this.token = null;
  }
}

// 使用例1: 基本的な登録フロー
async function basicRegistrationExample() {
  const client = new AuthApiClient();
  
  try {
    // パスワード強度をチェック
    const strength = await client.checkPasswordStrength('MyPassword123!');
    console.log('Password strength:', strength.level);
    
    if (strength.score < 4) {
      console.log('Password is too weak:', strength.feedback);
      return;
    }
    
    // ユーザー登録
    const authData = await client.register({
      email: 'newuser@example.com',
      password: 'MyPassword123!',
      name: '新規ユーザー'
    });
    
    console.log('Registration successful!');
    console.log('User ID:', authData.user.id);
    console.log('Token:', authData.token);
    
    // トークンをローカルストレージに保存（ブラウザ環境の場合）
    if (typeof window !== 'undefined') {
      localStorage.setItem('authToken', authData.token);
    }
    
  } catch (error) {
    console.error('Registration failed:', error);
  }
}

// 使用例2: React/Vue.jsコンポーネントでの使用
export function useAuthApi() {
  const client = new AuthApiClient();
  
  return {
    async register(formData: UserRegistrationRequest) {
      try {
        const authData = await client.register(formData);
        // 状態管理ストアに保存（Redux, Vuex, Piniaなど）
        return { success: true, data: authData };
      } catch (error) {
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    },
    
    async validatePassword(password: string) {
      try {
        const strength = await client.checkPasswordStrength(password);
        return strength;
      } catch (error) {
        console.error('Password validation failed:', error);
        return null;
      }
    }
  };
}

// 使用例3: フォームバリデーション付き
class RegistrationForm {
  private client = new AuthApiClient();
  
  async validateAndSubmit(formData: UserRegistrationRequest) {
    // クライアント側バリデーション
    const errors: Record<string, string> = {};
    
    // メールバリデーション
    if (!this.isValidEmail(formData.email)) {
      errors.email = '有効なメールアドレスを入力してください';
    }
    
    // パスワードバリデーション
    if (formData.password.length < 8) {
      errors.password = 'パスワードは8文字以上必要です';
    }
    
    // 名前バリデーション
    if (formData.name.trim().length === 0) {
      errors.name = '名前を入力してください';
    }
    
    if (Object.keys(errors).length > 0) {
      return { success: false, errors };
    }
    
    // サーバー側のパスワード強度チェック
    const strength = await this.client.checkPasswordStrength(formData.password);
    if (strength.score < 4) {
      return {
        success: false,
        errors: { password: 'パスワードが弱すぎます: ' + strength.feedback.join(', ') }
      };
    }
    
    // 登録処理
    try {
      const authData = await this.client.register(formData);
      return { success: true, data: authData };
    } catch (error) {
      return {
        success: false,
        errors: { general: error instanceof Error ? error.message : '登録に失敗しました' }
      };
    }
  }
  
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

// 使用例4: エラーハンドリングとリトライ
class RobustAuthClient {
  private client = new AuthApiClient();
  private maxRetries = 3;
  
  async registerWithRetry(data: UserRegistrationRequest, retries = 0): Promise<AuthResponse> {
    try {
      return await this.client.register(data);
    } catch (error) {
      if (retries < this.maxRetries && this.isRetryableError(error)) {
        console.log(`Retrying registration (attempt ${retries + 1}/${this.maxRetries})...`);
        await this.delay(1000 * Math.pow(2, retries)); // Exponential backoff
        return this.registerWithRetry(data, retries + 1);
      }
      throw error;
    }
  }
  
  private isRetryableError(error: any): boolean {
    // ネットワークエラーや一時的なサーバーエラーの場合はリトライ
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      return !status || status >= 500;
    }
    return false;
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// エクスポート
export { AuthApiClient, RegistrationForm, RobustAuthClient };

// 実行例（Node.js環境）
if (require.main === module) {
  basicRegistrationExample();
}