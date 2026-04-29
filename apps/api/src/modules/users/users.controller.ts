import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ChangePasswordDto, changePasswordSchema } from '@soulmovie/shared';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod.pipe';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  getMe(@CurrentUser() user: AuthUser) {
    return this.users.getMe(user.id);
  }

  @Post('me/password')
  @HttpCode(204)
  async changePassword(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(changePasswordSchema)) dto: ChangePasswordDto,
  ) {
    await this.users.changePassword(user.id, dto);
  }

  // Endpoint cambio email rimosso: solo admin può modificarla.
}
