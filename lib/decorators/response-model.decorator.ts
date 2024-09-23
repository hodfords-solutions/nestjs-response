import { applyDecorators, SetMetadata } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { ClassConstructor } from 'class-transformer';
import { RESPONSE_METADATA_KEY } from '../constants/metadata.constant';

export function ResponseModel(
    responseClass: ClassConstructor<object>,
    isArray = false,
    isAllowEmpty = false
): MethodDecorator {
    return applyDecorators(
        ApiResponse({ type: responseClass, isArray }),
        SetMetadata(RESPONSE_METADATA_KEY, {
            responseClass,
            isArray,
            isAllowEmpty
        })
    );
}
