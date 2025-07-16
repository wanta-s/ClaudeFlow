# ユーザーモデル詳細仕様書

## 概要
Sequelizeを使用したUserテーブルの定義とCRUD操作の実装仕様

## インターフェース定義

### 1. ユーザーモデル属性

```typescript
// User属性インターフェース
export interface UserAttributes {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: 'user' | 'admin';
  emailVerified: boolean;
  emailVerifiedAt?: Date | null;
  image?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// User作成時の入力インターフェース
export interface UserCreationAttributes extends Omit<UserAttributes, 'id' | 'createdAt' | 'updatedAt' | 'emailVerifiedAt'> {
  id?: string;
  emailVerifiedAt?: Date | null;
}

// User更新時の入力インターフェース
export interface UserUpdateAttributes extends Partial<Omit<UserAttributes, 'id' | 'email' | 'createdAt' | 'updatedAt'>> {}
```

### 2. Sequelizeモデル定義

```typescript
import { Model, DataTypes, Sequelize, Optional } from 'sequelize';

export class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: string;
  public email!: string;
  public passwordHash!: string;
  public name!: string;
  public role!: 'user' | 'admin';
  public emailVerified!: boolean;
  public emailVerifiedAt!: Date | null;
  public image!: string | null;
  
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  
  // アソシエーション
  public readonly tasks?: Task[];
  
  // ヘルパーメソッド
  public isEmailVerified(): boolean {
    return this.emailVerified && this.emailVerifiedAt !== null;
  }
  
  public isAdmin(): boolean {
    return this.role === 'admin';
  }
}
```

### 3. モデル初期化関数

```typescript
export function initUserModel(sequelize: Sequelize): typeof User {
  User.init(
    {
      id: {
        type: DataTypes.STRING,
        primaryKey: true,
        defaultValue: () => generateCUID(), // CUID生成関数を使用
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true,
          notEmpty: true,
          len: [3, 255],
        },
      },
      passwordHash: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'password_hash',
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
          len: [1, 100],
        },
      },
      role: {
        type: DataTypes.ENUM('user', 'admin'),
        allowNull: false,
        defaultValue: 'user',
      },
      emailVerified: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'email_verified',
      },
      emailVerifiedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'email_verified_at',
      },
      image: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          isUrl: true,
        },
      },
    },
    {
      sequelize,
      tableName: 'users',
      underscored: true,
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ['email'],
        },
        {
          fields: ['created_at'],
        },
        {
          fields: ['role'],
        },
      ],
    }
  );
  
  return User;
}
```

## 主要メソッドのシグネチャ

### 1. UserRepository インターフェース

```typescript
export interface IUserRepository {
  // 基本的なCRUD操作
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(data: UserCreationAttributes): Promise<User>;
  update(id: string, data: UserUpdateAttributes): Promise<User | null>;
  delete(id: string): Promise<boolean>;
  
  // 拡張操作
  findAll(options?: FindOptions<UserAttributes>): Promise<User[]>;
  count(where?: WhereOptions<UserAttributes>): Promise<number>;
  verifyEmail(id: string): Promise<boolean>;
  updatePassword(id: string, newPasswordHash: string): Promise<boolean>;
  
  // バルク操作
  bulkCreate(users: UserCreationAttributes[]): Promise<User[]>;
  bulkDelete(ids: string[]): Promise<number>;
}
```

### 2. UserRepository 実装

```typescript
export class SequelizeUserRepository implements IUserRepository {
  constructor(private readonly userModel: typeof User) {}
  
  async findById(id: string): Promise<User | null> {
    return await this.userModel.findByPk(id);
  }
  
  async findByEmail(email: string): Promise<User | null> {
    return await this.userModel.findOne({
      where: { email },
    });
  }
  
  async create(data: UserCreationAttributes): Promise<User> {
    return await this.userModel.create(data);
  }
  
  async update(id: string, data: UserUpdateAttributes): Promise<User | null> {
    const [updatedRows, [updatedUser]] = await this.userModel.update(data, {
      where: { id },
      returning: true,
    });
    
    return updatedRows > 0 ? updatedUser : null;
  }
  
  async delete(id: string): Promise<boolean> {
    const deletedRows = await this.userModel.destroy({
      where: { id },
    });
    
    return deletedRows > 0;
  }
  
  async verifyEmail(id: string): Promise<boolean> {
    const [updatedRows] = await this.userModel.update(
      {
        emailVerified: true,
        emailVerifiedAt: new Date(),
      },
      {
        where: { id },
      }
    );
    
    return updatedRows > 0;
  }
  
  async updatePassword(id: string, newPasswordHash: string): Promise<boolean> {
    const [updatedRows] = await this.userModel.update(
      { passwordHash: newPasswordHash },
      { where: { id } }
    );
    
    return updatedRows > 0;
  }
}
```

## エラーケース

### 1. エラー型定義

```typescript
export enum UserErrorCode {
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  EMAIL_ALREADY_EXISTS = 'EMAIL_ALREADY_EXISTS',
  INVALID_EMAIL_FORMAT = 'INVALID_EMAIL_FORMAT',
  INVALID_PASSWORD = 'INVALID_PASSWORD',
  EMAIL_NOT_VERIFIED = 'EMAIL_NOT_VERIFIED',
  UNAUTHORIZED = 'UNAUTHORIZED',
  DATABASE_ERROR = 'DATABASE_ERROR',
}

export class UserError extends Error {
  constructor(
    public code: UserErrorCode,
    message: string,
    public statusCode: number = 400,
    public field?: string
  ) {
    super(message);
    this.name = 'UserError';
  }
}
```

### 2. エラーハンドリング例

```typescript
// ユーザー作成時のエラーハンドリング
async create(data: UserCreationAttributes): Promise<User> {
  try {
    return await this.userModel.create(data);
  } catch (error) {
    if (error instanceof UniqueConstraintError) {
      throw new UserError(
        UserErrorCode.EMAIL_ALREADY_EXISTS,
        'このメールアドレスは既に登録されています',
        409,
        'email'
      );
    }
    
    if (error instanceof ValidationError) {
      const firstError = error.errors[0];
      if (firstError.path === 'email' && firstError.type === 'Validation error') {
        throw new UserError(
          UserErrorCode.INVALID_EMAIL_FORMAT,
          '有効なメールアドレスを入力してください',
          400,
          'email'
        );
      }
    }
    
    throw new UserError(
      UserErrorCode.DATABASE_ERROR,
      'ユーザーの作成中にエラーが発生しました',
      500
    );
  }
}
```

## 依存関係

### 1. 外部パッケージ
- `sequelize`: ^6.35.0
- `sequelize-typescript`: ^2.1.6 (オプション)
- `@paralleldrive/cuid2`: ^2.2.2 (CUID生成用)
- `bcrypt`: ^5.1.1 (パスワードハッシュ化用)

### 2. 内部依存
```typescript
// 依存関係のインポート
import { Sequelize } from 'sequelize';
import { generateCUID } from '@/lib/cuid';
import { hashPassword, verifyPassword } from '@/services/passwordService';
import { Task } from '@/models/Task';
```

### 3. 環境変数
```env
DATABASE_URL=postgresql://user:password@localhost:5432/taskdb
NODE_ENV=development
```

## 使用例

### 1. モデルの初期化
```typescript
import { Sequelize } from 'sequelize';
import { initUserModel } from '@/models/User';

const sequelize = new Sequelize(process.env.DATABASE_URL!);
const User = initUserModel(sequelize);

// アソシエーションの設定
User.hasMany(Task, {
  foreignKey: 'userId',
  as: 'tasks',
});
```

### 2. リポジトリの使用
```typescript
import { SequelizeUserRepository } from '@/repositories/UserRepository';

const userRepository = new SequelizeUserRepository(User);

// ユーザー作成
const newUser = await userRepository.create({
  email: 'user@example.com',
  passwordHash: await hashPassword('password123'),
  name: '山田太郎',
  role: 'user',
  emailVerified: false,
});

// ユーザー検索
const user = await userRepository.findByEmail('user@example.com');

// ユーザー更新
const updatedUser = await userRepository.update(user.id, {
  name: '山田二郎',
});
```

## テスト仕様

### 1. ユニットテスト項目
- モデルの初期化テスト
- バリデーションテスト（email形式、必須フィールド）
- CRUD操作テスト
- エラーケーステスト
- アソシエーションテスト

### 2. テストデータ
```typescript
export const testUsers = [
  {
    email: 'test1@example.com',
    passwordHash: '$2b$10$...',
    name: 'テストユーザー1',
    role: 'user' as const,
    emailVerified: true,
  },
  {
    email: 'admin@example.com',
    passwordHash: '$2b$10$...',
    name: '管理者',
    role: 'admin' as const,
    emailVerified: true,
  },
];
```

## セキュリティ考慮事項

1. **パスワードハッシュ化**: bcryptを使用し、saltラウンドは12以上
2. **SQLインジェクション対策**: Sequelizeのパラメータバインディングを使用
3. **メールアドレスの正規化**: 小文字化とトリミング
4. **アクセス制御**: ユーザーは自分のデータのみアクセス可能
5. **監査ログ**: 重要な操作（パスワード変更、削除）はログに記録

## パフォーマンス最適化

1. **インデックス**: email、created_at、roleフィールドにインデックス
2. **選択的フィールド取得**: パスワードハッシュを除外したクエリ
3. **バルク操作**: 大量データ処理用のバルクメソッド
4. **キャッシュ**: 頻繁にアクセスされるユーザーデータのキャッシュ