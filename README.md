<p align="center">
  <a href="http://opensource.hodfords.uk" target="blank"><img src="https://opensource.hodfords.uk/img/logo.svg" width="320" alt="Nest Logo" /></a>
</p>

<p align="center">
Nestjs-Response is a simple yet powerful library for managing API responses in a NestJS application. It provides decorators to handle response models, allowing easy integration with Swagger for API documentation and validation.
</p>

## Installation 🤖

To begin using it, we first install the required dependencies.

```
npm install @hodfords/nestjs-response
```

## Interceptor Setup 🚀

- `Global Interceptor (Recommended):`

Global interceptors are applied across the entire application. To set up a global interceptor, you can register it in the providers array in your module.

```typescript
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ResponseInterceptor } from '@hodfords/nestjs-response';

@Module({
    providers: [
        {
            provide: APP_INTERCEPTOR,
            useClass: ResponseInterceptor
        }
    ]
})
export class AppModule {}
```

- `Interceptor with Decorator:`

For microservices or specific scenarios, use the @UseInterceptors decorator to apply interceptors at the controller or method level. However, it's generally recommended to use global interceptors.

```typescript
import { Controller } from '@nestjs/common';
import { UseResponseInterceptor } from '@hodfords/nestjs-response';

@Controller()
@UseResponseInterceptor()
export class AppController {}
```

## Usage 🚀

`@ResponseModel()`

Use the @ResponseModel decorator when an API return single response type.

Parameter:

- `responseClass`: The class that defines the response model.
- `isArray` (optional): Set to `true` if the response is an array of `responseClass`. Defaults to `false`.
- `isAllowEmpty` (optional): Set to true if the response can be empty. Defaults to `false`.

Example of usage:

```typescript
import { ResponseModel } from '@hodfords/nestjs-response';
import { Get } from '@nestjs/common';
import { IsNotEmpty, IsString } from 'class-validator';

class UserResponse {
    @IsNotEmpty()
    @IsString()
    name: string;
}

export class UserController {
    @Get()
    @ResponseModel(UserResponse, true)
    getAllUser() {
        return [{ name: 'John' }];
    }
}
```

`@ResponseModels()`

Use the @ResponseModels decorator when an API might return multiple response types.

Parameter:

- `...responseClasses`: A list of response classes or arrays of response classes.

Example of usage:

```typescript
import { ResponseModels } from '@hodfords/nestjs-response';
import { Controller, Get, Param } from '@nestjs/common';
import { UserResponse } from './responses/user.response';
import { UserPaginationResponse } from './responses/user-pagination.response';

@Controller()
export class AppController {
    @Get('list-models/:type')
    @ResponseModels(Number, [Number], UserPaginationResponse, [UserResponse], undefined, null)
    getModels(@Param('type') type: string) {
        if (type == 'undefined') {
            return undefined;
        }
        if (type == 'pagination') {
            return {
                items: [{ name: 'John' }, { name: 'Daniel' }],
                total: 2,
                lastPage: 1,
                perPage: 10,
                currentPage: 1
            };
        }
        if (type == 'multiple') {
            return [{ name: 'John' }, { name: 'Daniel' }];
        }
        if (type == 'list-number') {
            return [123, 456];
        }
        if (type == 'number') {
            return 456;
        }
        return null;
    }
}

```

### Exception Handling

When the response data does not match the expected model, a validation exception will be raised. This ensures that the API returns data conforming to the defined structure.

Example Case: If a property is expected to be a string, but a number is returned, a validation error will occur.

```typescript
import { ResponseModel } from '@hodfords/nestjs-response';
import { Get } from '@nestjs/common';
import { IsString } from 'class-validator';

class UserResponse {
    @IsString()
    name: string;
}

export class UserController {
    @Get()
    @ResponseModel(UserResponse)
    getUser() {
        return { name: 123 }; // Error: name must be a number ...
    }
}

```

## License

This project is licensed under the MIT License
