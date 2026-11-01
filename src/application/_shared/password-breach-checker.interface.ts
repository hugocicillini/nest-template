export const PASSWORD_BREACH_CHECKER = Symbol('PASSWORD_BREACH_CHECKER');

export interface IPasswordBreachChecker {
  isBreached(password: string): Promise<boolean>;
}
