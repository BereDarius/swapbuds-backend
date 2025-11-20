export declare class RegisterDto {
    username: string;
    email: string;
    password: string;
}
export declare class LoginDto {
    email: string;
    password: string;
}
export declare class AuthResponseDto {
    accessToken: string;
    user: {
        id: string;
        email: string;
        username: string;
        avatarUrl?: string;
    };
}
