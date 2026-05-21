import { randomUUID } from 'crypto';
import { FileType, FileUploadStatus, Priority, TaskType } from './board.responses';

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

export function makeBoardTask(attachmentCount = 2): unknown {
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
        attachments: Array.from({ length: attachmentCount }, () => makeAttachment())
    };
}

export function makeBoardColumnItem(attachmentCount = 2): unknown {
    return {
        id: randomUUID(),
        boardColumnId: randomUUID(),
        taskId: randomUUID(),
        position: 1,
        task: makeBoardTask(attachmentCount)
    };
}

export function makeBoardColumn(taskCount: number, attachmentCount = 2): unknown {
    return {
        id: randomUUID(),
        status: makeStatus(),
        projectId: randomUUID(),
        limit: 100,
        items: Array.from({ length: taskCount }, () => makeBoardColumnItem(attachmentCount)),
        itemCount: taskCount,
        isOverLimit: false
    };
}

export function makeGroupBoardColumn(columnCount: number, taskPerColumn: number, attachmentCount = 2): unknown {
    return {
        group: {
            id: randomUUID()
        },
        taskCount: columnCount * taskPerColumn,
        boards: Array.from({ length: columnCount }, () => makeBoardColumn(taskPerColumn, attachmentCount))
    };
}

export function makeAttachments(count: number): unknown[] {
    return Array.from({ length: count }, () => makeAttachment());
}

export function makeBoardColumns(columnCount: number, taskPerColumn: number, attachmentCount = 2): unknown[] {
    return Array.from({ length: columnCount }, () => makeBoardColumn(taskPerColumn, attachmentCount));
}

export function makeGroupBoardColumns(
    groupCount: number,
    columnPerGroup: number,
    taskPerColumn: number,
    attachmentCount = 2
): unknown[] {
    return Array.from({ length: groupCount }, () =>
        makeGroupBoardColumn(columnPerGroup, taskPerColumn, attachmentCount)
    );
}

export function countNodes(obj: unknown): number {
    if (obj === null || typeof obj !== 'object') {
        return 0;
    }
    if (Array.isArray(obj)) {
        return obj.reduce<number>((sum, item) => sum + countNodes(item), 0);
    }
    let n = 1;
    for (const key in obj as Record<string, unknown>) {
        n += countNodes((obj as Record<string, unknown>)[key]);
    }
    return n;
}
