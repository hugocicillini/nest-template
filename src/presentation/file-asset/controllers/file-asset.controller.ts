import { PaginatedResult } from '@application/_shared/pagination';
import { DeleteFileCommand } from '@application/file-asset/commands/delete-file/delete-file.command';
import { UploadFileCommand } from '@application/file-asset/commands/upload-file/upload-file.command';
import { FileAssetDto } from '@application/file-asset/dtos/file-asset.dto';
import type { DownloadedFile } from '@application/file-asset/queries/download-file/download-file.handler';
import { DownloadFileQuery } from '@application/file-asset/queries/download-file/download-file.query';
import { ListFileAssetsQuery } from '@application/file-asset/queries/list-file-assets/list-file-assets.query';
import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import 'multer';
import type { AuthenticatedUser } from '../../_shared/decorators/current-user.decorator';
import { CurrentUser } from '../../_shared/decorators/current-user.decorator';
import { PaginationQueryDto } from '../../_shared/dtos/pagination-query.schema';
import { ApiBearerAuth, ApiBody, ApiConsumes } from '@nestjs/swagger';

const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;

@UseGuards(AuthGuard('jwt'))
@Controller('files')
@ApiBearerAuth()
@ApiConsumes('multipart/form-data')
export class FileAssetController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
      required: ['file'],
    },
  })
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_SIZE_BYTES } }),
  )
  upload(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<FileAssetDto> {
    return this.commandBus.execute(
      new UploadFileCommand(
        file.originalname,
        file.mimetype,
        file.size,
        file.buffer,
        currentUser.id,
      ),
    );
  }

  @Get()
  list(
    @Query() query: PaginationQueryDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<PaginatedResult<FileAssetDto>> {
    return this.queryBus.execute(
      new ListFileAssetsQuery(currentUser.id, query.page, query.limit),
    );
  }

  @Get(':fileAssetId/download')
  async download(
    @Param('fileAssetId') fileAssetId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Res() res: Response,
  ): Promise<void> {
    const file: DownloadedFile = await this.queryBus.execute(
      new DownloadFileQuery(fileAssetId, currentUser.id),
    );

    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Length', file.size);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${file.fileName}"`,
    );
    file.stream.pipe(res);
  }

  @Delete(':fileAssetId')
  delete(
    @Param('fileAssetId') fileAssetId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.commandBus.execute(
      new DeleteFileCommand(fileAssetId, currentUser.id),
    );
  }
}
