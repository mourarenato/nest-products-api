import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '../../../src/auth/auth.controller';
import { AuthService } from '../../../src/auth/auth.service';
import { LoginDto } from '../../../src/auth/dto/login.dto';
import { RegisterDto } from '../../../src/auth/dto/register.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let service: jest.Mocked<AuthService>;

  beforeEach(async () => {
    const authServiceMock: Partial<jest.Mocked<AuthService>> = {
      register: jest.fn(),
      login: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: authServiceMock,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get(AuthService);
  });

  it('registers user and returns token', async () => {
    const dto: RegisterDto = { email: 'admin@mail.com', password: '123456' };
    const tokenResponse = { accessToken: 'jwt-token' };
    service.register.mockResolvedValue(tokenResponse);

    await expect(controller.register(dto)).resolves.toEqual(tokenResponse);
    expect(service.register).toHaveBeenCalledWith(dto);
  });

  it('logs in user and returns token', async () => {
    const dto: LoginDto = { email: 'admin@mail.com', password: '123456' };
    const tokenResponse = { accessToken: 'jwt-token' };
    service.login.mockResolvedValue(tokenResponse);

    await expect(controller.login(dto)).resolves.toEqual(tokenResponse);
    expect(service.login).toHaveBeenCalledWith(dto);
  });
});
