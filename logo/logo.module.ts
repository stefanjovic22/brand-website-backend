import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/common'
import { LogoService } from './logo.service';
import { LogoResolver } from './logo.resolver';
import { UserModule } from '@module/user/user.module'
import { UserService } from '@module/user/user.service'
import { AuthModule } from '@module/auth/auth.module'
import { AuthService } from '../auth/auth.service'
import { SubscriptionModule } from '../subscription/subscription.module'
import { SubscriptionService } from '../subscription/subscription.service'

@Module({
  imports: [
    SubscriptionModule,
    UserModule,

    HttpModule.register({
      responseType: 'stream',
      headers: { 'Content-Type': 'image/png' },
    })
  ],
  providers: [LogoService, LogoResolver, UserService, SubscriptionService]
})
export class LogoModule { }
