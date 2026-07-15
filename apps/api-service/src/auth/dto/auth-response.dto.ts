import { ApiProperty } from "@nestjs/swagger";
import { AuthProvider } from "../../users/enums/auth-provider.enum.js";
import { UserRole } from "../../users/enums/user-role.enum.js";

export class AuthUserResponseDto {
    @ApiProperty()
    id!: string;

    @ApiProperty()
    email!: string;

    @ApiProperty({ enum: UserRole })
    role!: UserRole;

    @ApiProperty({ enum: AuthProvider })
    provider!: AuthProvider;
}

export class AuthResponseDto {
    @ApiProperty()
    accessToken!: string;

    @ApiProperty({ example: 'Bearer' })
    tokenType!: 'Bearer';

    @ApiProperty({ example: '1d' })
    expiresIn!: string;

    @ApiProperty({ type: AuthUserResponseDto })
    user!: AuthUserResponseDto;
}