import { Module } from '@nestjs/common';
import { RecaptchaService } from './recaptcha.service';

/**
 * Module for Google reCAPTCHA v3 integration
 *
 * Provides bot protection services for authentication and other sensitive actions.
 * Exports RecaptchaService for use in other modules (e.g., AuthModule).
 */
@Module({
  providers: [RecaptchaService],
  exports: [RecaptchaService],
})
export class RecaptchaModule {}
