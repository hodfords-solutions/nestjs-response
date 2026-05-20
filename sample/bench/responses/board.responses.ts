import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    IsArray,
    IsBoolean,
    IsEnum,
    IsNumber,
    IsOptional,
    IsString,
    IsUUID,
    ValidateNested
} from 'class-validator';

export enum TaskType {
    TASK = 'TASK',
    STORY = 'STORY',
    EPIC = 'EPIC',
    BUG = 'BUG'
}

export enum Priority {
    LOW = 'LOW',
    MEDIUM = 'MEDIUM',
    HIGH = 'HIGH',
    CRITICAL = 'CRITICAL'
}

export enum FileType {
    IMAGE = 'IMAGE',
    VIDEO = 'VIDEO',
    AUDIO = 'AUDIO',
    DOCUMENT = 'DOCUMENT'
}

export enum FileUploadStatus {
    PENDING = 'PENDING',
    SUCCESS = 'SUCCESS',
    FAILED = 'FAILED'
}

export class CategoryResponse {
    @ApiProperty()
    @IsUUID()
    id: string;

    @ApiProperty()
    @IsString()
    name: string;

    @ApiProperty()
    @IsString()
    color: string;
}

export class StatusResponse {
    @ApiProperty()
    @IsUUID()
    id: string;

    @ApiProperty()
    @IsString()
    name: string;

    @ApiProperty()
    @IsNumber()
    position: number;

    @ApiProperty()
    @IsUUID()
    projectId: string;

    @ApiProperty({ type: () => CategoryResponse })
    @Type(() => CategoryResponse)
    @ValidateNested()
    category: CategoryResponse;
}

export class AttachmentResponse {
    @ApiProperty()
    @IsUUID()
    id: string;

    @ApiProperty()
    @IsString()
    name: string;

    @ApiProperty()
    @IsString()
    path: string;

    @ApiProperty({ enum: FileType })
    @IsEnum(FileType)
    fileType: FileType;

    @ApiProperty()
    @IsString()
    refType: string;

    @ApiProperty()
    @IsUUID()
    refId: string;

    @ApiProperty()
    @IsNumber()
    size: number;

    @ApiProperty({ enum: FileUploadStatus })
    @IsEnum(FileUploadStatus)
    status: FileUploadStatus;

    @ApiProperty()
    @IsUUID()
    userId: string;

    @ApiProperty()
    @IsString()
    signedUrl: string;
}

export class BoardTaskResponse {
    @ApiProperty()
    @IsUUID()
    id: string;

    @ApiProperty()
    @IsString()
    key: string;

    @ApiProperty()
    @IsString()
    summary: string;

    @ApiProperty({ enum: TaskType })
    @IsEnum(TaskType)
    type: TaskType;

    @ApiProperty({ enum: Priority })
    @IsEnum(Priority)
    priority: Priority;

    @ApiProperty()
    @IsUUID()
    statusId: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsUUID()
    assigneeId?: string;

    @ApiProperty({ type: [String] })
    @IsArray()
    @IsString({ each: true })
    labels: string[];

    @ApiProperty({ required: false })
    @IsOptional()
    @IsUUID()
    sprintId?: string;

    @ApiProperty()
    @IsBoolean()
    isFlagged: boolean;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsNumber()
    storyPoint?: number;

    @ApiProperty({ type: () => [AttachmentResponse] })
    @IsArray()
    @Type(() => AttachmentResponse)
    @ValidateNested({ each: true })
    attachments: AttachmentResponse[];
}

export class BoardColumnItemResponse {
    @ApiProperty()
    @IsUUID()
    id: string;

    @ApiProperty()
    @IsUUID()
    boardColumnId: string;

    @ApiProperty()
    @IsUUID()
    taskId: string;

    @ApiProperty()
    @IsNumber()
    position: number;

    @ApiProperty({ type: () => BoardTaskResponse })
    @Type(() => BoardTaskResponse)
    @ValidateNested()
    task: BoardTaskResponse;
}

export class BoardColumnResponse {
    @ApiProperty()
    @IsUUID()
    id: string;

    @ApiProperty({ type: () => StatusResponse })
    @Type(() => StatusResponse)
    @ValidateNested()
    status: StatusResponse;

    @ApiProperty()
    @IsUUID()
    projectId: string;

    @ApiProperty()
    @IsNumber()
    limit: number;

    @ApiProperty({ type: () => [BoardColumnItemResponse] })
    @IsArray()
    @Type(() => BoardColumnItemResponse)
    @ValidateNested({ each: true })
    items: BoardColumnItemResponse[];

    @ApiProperty()
    @IsNumber()
    itemCount: number;

    @ApiProperty()
    @IsBoolean()
    isOverLimit: boolean;
}

export class GroupResponse {
    @ApiProperty({ required: false })
    @IsOptional()
    @IsUUID()
    id?: string;
}

export class GroupBoardColumnResponse {
    @ApiProperty({ type: () => GroupResponse })
    @Type(() => GroupResponse)
    @ValidateNested()
    group: GroupResponse;

    @ApiProperty()
    @IsNumber()
    taskCount: number;

    @ApiProperty({ type: () => [BoardColumnResponse] })
    @IsArray()
    @Type(() => BoardColumnResponse)
    @ValidateNested({ each: true })
    boards: BoardColumnResponse[];
}
