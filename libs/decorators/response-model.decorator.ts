import { applyDecorators, SetMetadata } from '@nestjs/common';
import { RESPONSE_METADATA_KEY } from '../constants/metadata.constant';
import { ApiResponse } from '@nestjs/swagger';

export function ResponseModel(responseClass, isArray = false): any {
    return applyDecorators(
        ApiResponse({ type: responseClass, isArray }),
        SetMetadata(RESPONSE_METADATA_KEY, {
            responseClass,
            isArray
        })
    );
}
