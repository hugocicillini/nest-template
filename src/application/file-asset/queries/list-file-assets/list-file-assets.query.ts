export class ListFileAssetsQuery {
  constructor(
    readonly userId: string,
    readonly page: number = 1,
    readonly limit: number = 20,
  ) {}
}
