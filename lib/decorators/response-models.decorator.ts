import { ResponseClass } from '../types/response-metadata.type';
import { applyDecorators, SetMetadata } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, refs } from '@nestjs/swagger';
import { RESPONSE_METADATA_KEYS } from '../constants/metadata.constant';

export function ResponseModels(...responseClasses: ResponseClass[]): MethodDecorator {
    const metadatas = responseClasses.map((metadata) => {
        const isArray = Array.isArray(metadata);
        const responseClass = isArray ? metadata[0] : metadata;
        const isAllowEmpty = metadata === undefined || metadata === null;
        return { isArray, responseClass, isAllowEmpty };
    });
    const models = metadatas.filter((metadata) => !metadata.isAllowEmpty).map((metadata) => metadata.responseClass);
    return applyDecorators(
        ApiExtraModels(...models),
        ApiOkResponse({
            schema: { anyOf: refs(...models) }
        }),
        SetMetadata(RESPONSE_METADATA_KEYS, metadatas)
    );
}
