/* eslint-disable @typescript-eslint/no-unsafe-function-type */
import { ClassConstructor, ClassTransformOptions, TransformFnParams, TransformOptions } from 'class-transformer';

type TransformFn = (params: TransformFnParams) => unknown;

type CachedTransform = {
    fn: TransformFn;
    options?: TransformOptions;
};

type PropertyTransform = {
    propertyName: string;
    transforms: CachedTransform[];
};

type NestedPlan = {
    propertyName: string;
    plan: TransformPlan;
};

type TransformPlan = {
    propertyTransforms: PropertyTransform[];
    nestedPlans: NestedPlan[];
};

type TransformMetadataEntry = { transformFn: TransformFn; options?: TransformOptions };
type TypeMetadataEntry = { typeFunction?: (options?: unknown) => Function };
type MetadataStorage = {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    _transformMetadatas: Map<Function, Map<string, TransformMetadataEntry[]>>;
    // eslint-disable-next-line @typescript-eslint/naming-convention
    _typeMetadatas: Map<Function, Map<string, TypeMetadataEntry>>;
};

const plainToClassType = 0;
const emptyOptions: ClassTransformOptions = Object.freeze({});

const planCache = new WeakMap<Function, TransformPlan>();

let metadataStorage: MetadataStorage | null = null;

function getMetadataStorage(): MetadataStorage | null {
    if (metadataStorage !== null) {
        return metadataStorage;
    }
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        metadataStorage = require('class-transformer/cjs/storage').defaultMetadataStorage;
    } catch {
        try {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            metadataStorage = require('class-transformer/storage').defaultMetadataStorage;
        } catch {
            metadataStorage = null;
        }
    }
    return metadataStorage;
}

export function applyTransforms<T extends object>(
    data: T,
    target: ClassConstructor<object>,
    options?: ClassTransformOptions
): T {
    const storage = getMetadataStorage();
    if (!storage) {
        return data;
    }
    if (typeof target !== 'function') {
        return data;
    }
    const plan = getOrBuildPlan(target, storage, new Set());
    if (!plan.propertyTransforms.length && !plan.nestedPlans.length) {
        return data;
    }
    runPlan(data, plan, options ?? emptyOptions);
    return data;
}

function runPlan(data: unknown, plan: TransformPlan, options: ClassTransformOptions): void {
    if (data === null || data === undefined || typeof data !== 'object') {
        return;
    }
    const obj = data as Record<string, unknown>;

    for (const { propertyName, transforms } of plan.propertyTransforms) {
        let value = obj[propertyName];
        let mutated = false;
        for (const { fn, options: metaOptions } of transforms) {
            if (!matchesGroups(metaOptions, options) || !matchesVersion(metaOptions, options)) {
                continue;
            }
            value = fn({
                value,
                key: propertyName,
                obj,
                type: plainToClassType,
                options
            } as TransformFnParams);
            mutated = true;
        }
        if (mutated) {
            obj[propertyName] = value;
        }
    }

    for (const { propertyName, plan: nestedPlan } of plan.nestedPlans) {
        const value = obj[propertyName];
        if (Array.isArray(value)) {
            for (const item of value) {
                runPlan(item, nestedPlan, options);
            }
        } else {
            runPlan(value, nestedPlan, options);
        }
    }
}

function matchesGroups(metaOptions: TransformOptions | undefined, callOptions: ClassTransformOptions): boolean {
    const metaGroups = metaOptions?.groups;
    if (!metaGroups || metaGroups.length === 0) {
        return true;
    }
    const callGroups = callOptions.groups;
    if (!callGroups || callGroups.length === 0) {
        return false;
    }
    for (const group of metaGroups) {
        if (callGroups.includes(group)) {
            return true;
        }
    }
    return false;
}

function matchesVersion(metaOptions: TransformOptions | undefined, callOptions: ClassTransformOptions): boolean {
    const version = callOptions.version;
    if (version === undefined) {
        return true;
    }
    const since = metaOptions?.since;
    const until = metaOptions?.until;
    return (since === undefined || version >= since) && (until === undefined || version < until);
}

function getOrBuildPlan(target: Function, storage: MetadataStorage, visiting: Set<Function>): TransformPlan {
    const cached = planCache.get(target);
    if (cached) {
        return cached;
    }
    if (visiting.has(target)) {
        return { propertyTransforms: [], nestedPlans: [] };
    }
    visiting.add(target);

    const propertyTransforms: PropertyTransform[] = [];
    const nestedPlans: NestedPlan[] = [];
    const seenTransform = new Set<string>();
    const seenNested = new Set<string>();

    for (const cls of collectClassChain(target)) {
        collectPropertyTransforms(cls, storage, seenTransform, propertyTransforms);
        collectNestedPlans(cls, storage, visiting, seenNested, nestedPlans);
    }

    const plan: TransformPlan = { propertyTransforms, nestedPlans };
    visiting.delete(target);
    planCache.set(target, plan);
    return plan;
}

function collectPropertyTransforms(
    cls: Function,
    storage: MetadataStorage,
    seen: Set<string>,
    out: PropertyTransform[]
): void {
    const transformMap = storage._transformMetadatas.get(cls);
    if (!transformMap) {
        return;
    }
    for (const [propertyName, metadataList] of transformMap) {
        if (seen.has(propertyName)) {
            continue;
        }
        const transforms: CachedTransform[] = [];
        for (const meta of metadataList) {
            if (meta.options?.toPlainOnly === true && meta.options.toClassOnly !== true) {
                continue;
            }
            transforms.push({ fn: meta.transformFn, options: meta.options });
        }
        if (transforms.length > 0) {
            out.push({ propertyName, transforms });
            seen.add(propertyName);
        }
    }
}

function collectNestedPlans(
    cls: Function,
    storage: MetadataStorage,
    visiting: Set<Function>,
    seen: Set<string>,
    out: NestedPlan[]
): void {
    const typeMap = storage._typeMetadatas.get(cls);
    if (!typeMap) {
        return;
    }
    for (const [propertyName, meta] of typeMap) {
        if (seen.has(propertyName)) {
            continue;
        }
        seen.add(propertyName);
        const nestedClass = resolveNestedClass(meta);
        if (!nestedClass) {
            continue;
        }
        const nestedPlan = getOrBuildPlan(nestedClass, storage, visiting);
        if (nestedPlan.propertyTransforms.length > 0 || nestedPlan.nestedPlans.length > 0) {
            out.push({ propertyName, plan: nestedPlan });
        }
    }
}

function resolveNestedClass(meta: TypeMetadataEntry): Function | undefined {
    const typeFn = meta.typeFunction;
    if (typeof typeFn !== 'function') {
        return undefined;
    }
    try {
        const resolved = typeFn();
        return typeof resolved === 'function' ? resolved : undefined;
    } catch {
        return undefined;
    }
}

function collectClassChain(target: Function): Function[] {
    const chain: Function[] = [target];
    let baseClass = Object.getPrototypeOf(target.prototype?.constructor);
    while (baseClass && baseClass.prototype) {
        chain.push(baseClass);
        baseClass = Object.getPrototypeOf(baseClass.prototype.constructor);
    }
    return chain;
}
