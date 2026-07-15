import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { UserRole } from "../enums/user-role.enum.js";
import { AuthProvider } from "../enums/auth-provider.enum.js";

@Entity('users')
export class User {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Index({ unique: true })
    @Column({ length: 255 })
    email!: string;

    @Column({ name: 'password_hash', type: 'varchar', length: 255, nullable: true })
    passwordHash!: string | null;

    @Column({
        type: 'varchar',
        length: 50,
        default: UserRole.User,
    })
    role!: UserRole;

    @Column({
        type: 'varchar',
        length: 50,
        default: AuthProvider.Local,
    })
    provider!: AuthProvider;

    @Index({ unique: true })
    @Column({ name: 'google_id', type: 'varchar', length: 255, nullable: true })
    googleId!: string | null;

    @Column({ name: 'display_name', type: 'varchar', length: 255, nullable: true })
    displayName!: string | null;

    @Column({ name: 'avatar_url', type: 'text', nullable: true })
    avatarUrl!: string | null;

    @Column({ name: 'email_verified', type: 'boolean', default: false })
    emailVerified!: boolean;

    @Column({ name: 'is_active', type: 'boolean', default: true })
    isActive!: boolean;

    @Column({ name: 'last_login_at', type: 'timestamp', nullable: true })
    lastLoginAt!: Date | null;

    @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
    createdAt!: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
    updatedAt!: Date;
}