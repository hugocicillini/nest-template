import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PaginatedResult } from '@application/_shared/pagination';
import { FILE_ASSET_REPOSITORY } from '@application/file-asset/file-asset-repository.interface';
import type { IFileAssetRepository } from '@application/file-asset/file-asset-repository.interface';
import {
  FileAssetDto,
  toFileAssetDto,
} from '@application/file-asset/dtos/file-asset.dto';
import { ListFileAssetsQuery } from './list-file-assets.query';

@QueryHandler(ListFileAssetsQuery)
export class ListFileAssetsHandler implements IQueryHandler<
  ListFileAssetsQuery,
  PaginatedResult<FileAssetDto>
> {
  constructor(
    @Inject(FILE_ASSET_REPOSITORY)
    private readonly fileAssetRepository: IFileAssetRepository,
  ) {}

  async execute(
    query: ListFileAssetsQuery,
  ): Promise<PaginatedResult<FileAssetDto>> {
    const result = await this.fileAssetRepository.findAllForUser(query.userId, {
      page: query.page,
      limit: query.limit,
    });

    return {
      ...result,
      items: result.items.map(toFileAssetDto),
    };
  }
}
