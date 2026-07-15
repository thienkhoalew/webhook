import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';

import { AuthProvider } from './enums/auth-provider.enum.js';
import { UserRole } from './enums/user-role.enum.js';
import { User } from './entities/user.entity.js';

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
    ) {}

    async findByEmail(email: string): Promise<User | null> {
        return this.userRepository.findOne({ where: { email: email.toLowerCase() }});
    }

    async findById(id: string): Promise<User | null> {
        return this.userRepository.findOne({ where: { id }});
    }

    async createLocalUser(email: string, password: string): Promise<User> {
        const normalizedEmail = email.toLowerCase();

        const existingUser = await this.findByEmail(normalizedEmail);
        if (existingUser) {
            throw new ConflictException('Email already registered');
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const user = this.userRepository.create({
            email: normalizedEmail,
            passwordHash,
            role: UserRole.User,
            provider: AuthProvider.Local,
            emailVerified: false,
            isActive: true,
        });

        return this.userRepository.save(user);
    }

    async updateLastLoginAt(userId: string): Promise<void> {
        await this.userRepository.update(userId, {
            lastLoginAt: new Date(),
        });
    }

    toPublicUser(user: User) {
        return {
            id: user.id,
            email: user.email,
            role: user.role,
            provider: user.provider,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
            emailVerified: user.emailVerified,
            isActive: user.isActive,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        };
    }
}