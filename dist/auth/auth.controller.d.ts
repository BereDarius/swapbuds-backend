import { AuthService } from '@/auth/auth.service';
import { AuthResponseDto, LoginDto, RegisterDto } from '@/auth/dto/auth.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    register(registerDto: RegisterDto): Promise<AuthResponseDto>;
    login(loginDto: LoginDto): Promise<AuthResponseDto>;
    getMe(user: any): Promise<any>;
}
