export class ListRolesQuery {
  constructor(
    readonly page: number = 1,
    readonly limit: number = 20,
  ) {}
}
