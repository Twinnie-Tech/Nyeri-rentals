import { createParamDecorator, type ExecutionContext } from "@nestjs/common";

export type AuthUser = {
  id: string;
  phone: string | null;
  email: string | null;
  roles: string[];
};

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
