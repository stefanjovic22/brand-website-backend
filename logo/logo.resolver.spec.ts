import { Test, TestingModule } from '@nestjs/testing';
import { LogoResolver } from './logo.resolver';

describe('LogoResolver', () => {
  let resolver: LogoResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LogoResolver],
    }).compile();

    resolver = module.get<LogoResolver>(LogoResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
