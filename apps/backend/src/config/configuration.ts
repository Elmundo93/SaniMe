import { ConfigModuleOptions } from '@nestjs/config';
import { validateEnv } from './env.schema';

export const configModuleOptions: ConfigModuleOptions = {
  isGlobal: true,
  validate: validateEnv,
};
