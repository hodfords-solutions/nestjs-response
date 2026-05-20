import { randomUUID } from 'crypto';
import {
    BoardColumnResponse,
    FileType,
    FileUploadStatus,
    GroupBoardColumnResponse,
    Priority,
    TaskType
} from './board.responses';

export function makeStatus(): unknown {
    return {
        id: randomUUID(),
        name: 'In Progress',
        position: 1,
        projectId: randomUUID(),
        category: {
            id: randomUUID(),
            name: 'In Progress',
            color: 'blue'
        }
    };
}

export function makeAttachment(): unknown {
    return {
        id: randomUUID(),
        name: 'image.png',
        path: 'image.png_2026-05-20',
        fileType: FileType.IMAGE,
        refType: 'IMAGE',
        refId: randomUUID(),
        size: 1024,
        status: FileUploadStatus.SUCCESS,
        userId: randomUUID(),
        signedUrl: 'https://example.s3.amazonaws.com/image.png'
    };
}

export function makeBoardTask(): unknown {
    return {
        id: randomUUID(),
        key: 'ABC-1',
        summary: 'Implement feature X',
        type: TaskType.TASK,
        priority: Priority.MEDIUM,
        statusId: randomUUID(),
        assigneeId: randomUUID(),
        labels: [],
        sprintId: randomUUID(),
        isFlagged: false,
        storyPoint: 3,
        attachments: [makeAttachment(), makeAttachment()]
    };
}

export function makeBoardColumnItem(): unknown {
    return {
        id: randomUUID(),
        boardColumnId: randomUUID(),
        taskId: randomUUID(),
        position: 1,
        task: makeBoardTask()
    };
}

export function makeBoardColumn(taskCount: number): unknown {
    return {
        id: randomUUID(),
        status: makeStatus(),
        projectId: randomUUID(),
        limit: 100,
        items: Array.from({ length: taskCount }, () => makeBoardColumnItem()),
        itemCount: taskCount,
        isOverLimit: false
    };
}

export function makeGroupBoardColumn(columnCount: number, taskPerColumn: number): unknown {
    return {
        group: {
            id: randomUUID()
        },
        taskCount: columnCount * taskPerColumn,
        boards: Array.from({ length: columnCount }, () => makeBoardColumn(taskPerColumn))
    };
}

export function makeBoardColumns(columnCount: number, taskPerColumn: number): unknown[] {
    return Array.from({ length: columnCount }, () => makeBoardColumn(taskPerColumn));
}

export function makeGroupBoardColumns(groupCount: number, columnPerGroup: number, taskPerColumn: number): unknown[] {
    return Array.from({ length: groupCount }, () => makeGroupBoardColumn(columnPerGroup, taskPerColumn));
}

export type AnyResponseClass = typeof BoardColumnResponse | typeof GroupBoardColumnResponse;
