import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { PropertiesService } from "./properties.service";
import {
  CreatePropertyDto,
  PropertyQueryDto,
  UpdatePropertyDto,
  UpdatePropertyStatusDto,
  UpsertPropertyMirrorDto,
} from "./properties.dto";
import { Public } from "../common/decorators/public.decorator";
import { CurrentUser, AuthUser } from "../common/decorators/current-user.decorator";
import { AgentPlanGuard } from "../common/guards/agent-plan.guard";
import { SanityService } from "../sanity/sanity.service";

@ApiTags("properties")
@Controller("properties")
export class PropertiesController {
  constructor(
    private properties: PropertiesService,
    private sanity: SanityService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: "List property mirrors (paginated filters)" })
  list(@Query() query: PropertyQueryDto) {
    return this.properties.list(query);
  }

  @Get("mine/list")
  @ApiBearerAuth("JWT")
  @UseGuards(AgentPlanGuard)
  @ApiOperation({ summary: "List my property mirrors (paginated)" })
  mine(
    @CurrentUser() user: AuthUser,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.properties.listMine(
      user.id,
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined,
    );
  }

  @Post()
  @ApiBearerAuth("JWT")
  @UseGuards(AgentPlanGuard)
  @ApiOperation({ summary: "Create listing (Sanity + PropertyMirror)" })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreatePropertyDto) {
    return this.properties.createListing(user.id, dto);
  }

  @Put(":sanityId")
  @ApiBearerAuth("JWT")
  @UseGuards(AgentPlanGuard)
  @ApiOperation({ summary: "Update listing (Sanity + PropertyMirror)" })
  update(
    @CurrentUser() user: AuthUser,
    @Param("sanityId") sanityId: string,
    @Body() dto: UpdatePropertyDto,
  ) {
    return this.properties.updateListing(user.id, sanityId, dto);
  }

  @Patch(":sanityId/status")
  @ApiBearerAuth("JWT")
  @UseGuards(AgentPlanGuard)
  @ApiOperation({ summary: "Update listing status" })
  status(
    @CurrentUser() user: AuthUser,
    @Param("sanityId") sanityId: string,
    @Body() dto: UpdatePropertyStatusDto,
  ) {
    return this.properties.updateStatus(user.id, sanityId, dto.status);
  }

  @Delete(":sanityId")
  @ApiBearerAuth("JWT")
  @UseGuards(AgentPlanGuard)
  @ApiOperation({ summary: "Delete listing from Sanity + mirror" })
  remove(
    @CurrentUser() user: AuthUser,
    @Param("sanityId") sanityId: string,
  ) {
    return this.properties.deleteListing(user.id, sanityId);
  }

  @Post("mirror")
  @ApiBearerAuth("JWT")
  @UseGuards(AgentPlanGuard)
  @ApiOperation({ summary: "Upsert property mirror from Sanity id" })
  upsert(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpsertPropertyMirrorDto,
  ) {
    return this.properties.upsertMirror(user.id, dto);
  }

  @Delete("mirror/:sanityId")
  @ApiBearerAuth("JWT")
  @UseGuards(AgentPlanGuard)
  @ApiOperation({ summary: "Delete property mirror by Sanity id" })
  removeMirror(
    @CurrentUser() user: AuthUser,
    @Param("sanityId") sanityId: string,
  ) {
    return this.properties.deleteMirror(user.id, sanityId);
  }

  @Post("media/upload")
  @ApiBearerAuth("JWT")
  @UseGuards(AgentPlanGuard)
  @UseInterceptors(FileInterceptor("file"))
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: { file: { type: "string", format: "binary" } },
    },
  })
  @ApiOperation({ summary: "Upload listing image to Sanity assets" })
  async upload(
    @UploadedFile()
    file?: {
      buffer: Buffer;
      originalname?: string;
      mimetype?: string;
    },
  ) {
    if (!file?.buffer) {
      return { message: "No file provided" };
    }
    const asset = await this.sanity.uploadImage(
      file.buffer,
      file.originalname || "upload.jpg",
      file.mimetype || "image/jpeg",
    );
    return {
      _type: "image",
      asset: {
        _type: "reference",
        _ref: asset._id,
      },
      assetId: asset._id,
      url: asset.url,
    };
  }

  @Public()
  @Get(":id")
  @ApiOperation({ summary: "Get property by id or Sanity id" })
  get(@Param("id") id: string) {
    return this.properties.getByIdOrSanity(id);
  }
}
