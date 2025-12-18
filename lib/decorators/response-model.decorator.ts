import { applyDecorators, SetMetadata } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { ClassConstructor } from 'class-transformer';
import { RESPONSE_METADATA_KEY } from '../constants/metadata.constant';

export function ResponseModel(
    responseClass: ClassConstructor<object>,
    isArray?: boolean,
    isAllowEmpty?: boolean
): MethodDecorator;
export function ResponseModel(
    responseClass: ClassConstructor<object>,
    options?: { isArray?: boolean; isAllowEmpty?: boolean }
): MethodDecorator;
export function ResponseModel(
    responseClass: ClassConstructor<object>,
    isArrayOrOptions?: boolean | { isArray?: boolean; isAllowEmpty?: boolean },
    isAllowEmpty?: boolean
): MethodDecorator {
    let isArray: boolean;
    let allowEmpty: boolean;

    if (typeof isArrayOrOptions === 'object') {
        isArray = isArrayOrOptions?.isArray ?? false;
        allowEmpty = isArrayOrOptions?.isAllowEmpty ?? false;
    } else {
        isArray = isArrayOrOptions ?? false;
        allowEmpty = isAllowEmpty ?? false;
    }

    return applyDecorators(
        ApiResponse({ type: responseClass, isArray }),
        SetMetadata(RESPONSE_METADATA_KEY, {
            responseClass,
            isArray,
            isAllowEmpty: allowEmpty
        })
    );
}
