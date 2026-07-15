import type { AuthProvider } from '../../users/enums/auth-provider.enum.js';
import type { UserRole } from '../../users/enums/user-role.enum.js';

export type AuthenticatedUser = {
    id: string;
    email: string;
    role: UserRole;
    provider: AuthProvider;
};