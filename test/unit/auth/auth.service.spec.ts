import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { AuthService } from '../../../src/auth/auth.service';
import { UserRole } from '../../../src/users/enums/user-role.enum';
import { UsersService } from '../../../src/users/users.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;

  beforeEach(async () => {
    const usersServiceMock: Partial<jest.Mocked<UsersService>> = {
      findByEmail: jest.fn(),
      create: jest.fn(),
    };

    const jwtServiceMock: Partial<jest.Mocked<JwtService>> = {
      signAsync: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: usersServiceMock,
        },
        {
          provide: JwtService,
          useValue: jwtServiceMock,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('registers a new user and returns access token', async () => {
    usersService.findByEmail.mockResolvedValue(null);
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
    usersService.create.mockResolvedValue({
      id: 'user-1',
      email: 'admin@mail.com',
      passwordHash: 'hashed-password',
      role: UserRole.PROFESSIONAL,
    } as never);
    jwtService.signAsync.mockResolvedValue('signed-jwt' as never);

    await expect(
      service.register({ email: 'ADMIN@mail.com', password: '123456' }),
    ).resolves.toEqual({
      accessToken: 'signed-jwt',
    });

    expect(usersService.findByEmail).toHaveBeenCalledWith('admin@mail.com');
    expect(usersService.create).toHaveBeenCalledWith({
      email: 'admin@mail.com',
      passwordHash: 'hashed-password',
    });
  });

  it('throws conflict when email already exists on register', async () => {
    usersService.findByEmail.mockResolvedValue({
      id: 'existing',
      email: 'admin@mail.com',
      passwordHash: 'hash',
      role: UserRole.PROFESSIONAL,
    } as never);

    await expect(
      service.register({ email: 'admin@mail.com', password: '123456' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('logs in with valid credentials', async () => {
    usersService.findByEmail.mockResolvedValue({
      id: 'user-1',
      email: 'professional@mail.com',
      passwordHash: 'hash',
      role: UserRole.PROFESSIONAL,
    } as never);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    jwtService.signAsync.mockResolvedValue('signed-jwt' as never);

    await expect(
      service.login({ email: 'professional@mail.com', password: '123456' }),
    ).resolves.toEqual({
      accessToken: 'signed-jwt',
    });
  });

  it('throws unauthorized when user is not found on login', async () => {
    usersService.findByEmail.mockResolvedValue(null);

    await expect(
      service.login({ email: 'missing@mail.com', password: '123456' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('throws unauthorized when password is invalid on login', async () => {
    usersService.findByEmail.mockResolvedValue({
      id: 'user-1',
      email: 'professional@mail.com',
      passwordHash: 'hash',
      role: UserRole.PROFESSIONAL,
    } as never);
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(
      service.login({ email: 'professional@mail.com', password: 'bad-pass' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
