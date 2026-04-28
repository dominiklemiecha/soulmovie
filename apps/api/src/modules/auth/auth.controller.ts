import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UsePipes,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  AcceptInviteDto,
  acceptInviteSchema,
  ErrorCodes,
  ForgotPasswordDto,
  forgotPasswordSchema,
  InviteSupplierDto,
  inviteSupplierSchema,
  LoginDto,
  loginSchema,
  RegisterSelfDto,
  registerSelfSchema,
  ResetPasswordDto,
  resetPasswordSchema,
  Role,
  verifyEmailSchema,
} from '@soulmovie/shared';
import { ZodValidationPipe } from '../../common/pipes/zod.pipe';
import { Public } from '../../common/decorators/public.decorator';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register/self')
  @HttpCode(202)
  @UsePipes(new ZodValidationPipe(registerSelfSchema))
  async registerSelf(@Body() dto: RegisterSelfDto) {
    await this.auth.registerSelf(dto);
    return { ok: true };
  }

  @Public()
  @Get('verify-email')
  async verifyEmail(@Query('token') token: string) {
    const parsed = verifyEmailSchema.parse({ token });
    await this.auth.verifyEmail(parsed.token);
    return { ok: true };
  }

  @Public()
  @Post('login')
  @UsePipes(new ZodValidationPipe(loginSchema))
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const out = await this.auth.login(dto.email, dto.password, req.ip, req.get('user-agent'));
    this.setRefreshCookie(res, out.refreshToken);
    return { accessToken: out.accessToken, user: out.user };
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const raw = (req.cookies as any)?.['sm_refresh'];
    if (!raw) {
      throw new UnauthorizedException({
        error: { code: ErrorCodes.AUTH_TOKEN_INVALID, message: 'no refresh cookie' },
      });
    }
    const out = await this.auth.refresh(raw, req.ip, req.get('user-agent'));
    this.setRefreshCookie(res, out.refreshToken);
    return { accessToken: out.accessToken, user: out.user };
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@CurrentUser() user: AuthUser, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(user.id);
    res.clearCookie('sm_refresh', { path: '/api/v1/auth' });
  }

  @Post('invite')
  @UsePipes(new ZodValidationPipe(inviteSupplierSchema))
  async invite(@CurrentUser() admin: AuthUser, @Body() dto: InviteSupplierDto) {
    if (admin.role !== Role.ADMIN) throw new ForbiddenException();
    await this.auth.inviteSupplier(dto, admin.id);
    return { ok: true };
  }

  @Public()
  @Post('accept-invite')
  @UsePipes(new ZodValidationPipe(acceptInviteSchema))
  async acceptInvite(@Body() dto: AcceptInviteDto) {
    await this.auth.acceptInvite(dto.token, dto.password);
    return { ok: true };
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(202)
  @UsePipes(new ZodValidationPipe(forgotPasswordSchema))
  async forgot(@Body() dto: ForgotPasswordDto) {
    await this.auth.forgotPassword(dto.email);
    return { ok: true };
  }

  @Public()
  @Post('reset-password')
  @UsePipes(new ZodValidationPipe(resetPasswordSchema))
  async reset(@Body() dto: ResetPasswordDto) {
    await this.auth.resetPassword(dto.token, dto.password);
    return { ok: true };
  }

  private setRefreshCookie(res: Response, raw: string) {
    res.cookie('sm_refresh', raw, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/v1/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }
}
