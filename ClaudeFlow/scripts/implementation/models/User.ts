/**
 * User model definition
 */
import { Model, DataTypes, Sequelize } from 'sequelize';

/**
 * User attributes interface
 */
export interface UserAttributes {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User creation attributes interface
 */
export interface UserCreationAttributes {
  email: string;
  name: string;
  passwordHash: string;
}

/**
 * User model class
 */
export class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: string;
  public email!: string;
  public name!: string;
  public passwordHash!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  /**
   * Get user's display name
   * @returns {string} Display name
   */
  public getDisplayName(): string {
    return this.name || this.email.split('@')[0];
  }

  /**
   * Convert user to safe JSON (without password)
   * @returns {object} User object without sensitive data
   */
  public toSafeJSON(): Omit<UserAttributes, 'passwordHash'> {
    const { passwordHash, ...safeUser } = this.toJSON();
    return safeUser;
  }
}

/**
 * Initialize User model
 * @param {Sequelize} sequelize - Sequelize instance
 * @returns {typeof User} User model
 */
export function initUser(sequelize: Sequelize): typeof User {
  User.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        validate: {
          isEmail: {
            msg: 'Invalid email format'
          },
          len: {
            args: [1, 255],
            msg: 'Email must be between 1 and 255 characters'
          }
        }
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: {
          len: {
            args: [1, 100],
            msg: 'Name must be between 1 and 100 characters'
          }
        }
      },
      passwordHash: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'User',
      tableName: 'users',
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ['email']
        }
      ],
      hooks: {
        beforeCreate: (user) => {
          user.email = user.email.toLowerCase();
        },
        beforeUpdate: (user) => {
          if (user.changed('email')) {
            user.email = user.email.toLowerCase();
          }
        }
      }
    }
  );

  return User;
}