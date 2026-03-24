import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRole } from './enums/user-role.enum';
import { User } from './entities/user.entity';

type CreateUserInput = {
  email: string;
  passwordHash: string;
  role?: UserRole;
};

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async create(input: CreateUserInput): Promise<User> {
    const user = this.usersRepository.create({
      email: input.email,
      passwordHash: input.passwordHash,
      role: input.role ?? UserRole.PROFESSIONAL,
    });

    return this.usersRepository.save(user);
  }
}
