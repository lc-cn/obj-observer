export const callBackProxy = Symbol('callBackProxy')
export const watchConfigsSymbol = Symbol('watchConfigsSymbol')
export const watchDepthSymbol = Symbol('watchDepthSymbol')

const isArray =Array.isArray
const isObject = function (obj) {
    return obj !== null && toString.call(obj) === '[object Object]'
}
export function isEqual<T=any[]|object>(a:T, b:T):Boolean {
    if (a === b) {
        return true
    }
    if (isArray(a) && isArray(b)) {
        let len = a.length
        if (len !== b.length) {
            return false
        }
        return a.every((item, i) => {
            return isEqual(item, b[i])
        })
    } else if (isObject(a) && isObject(b)) {
        //Objects comparison
        let keysA = Object.keys(a),
            len = keysA.length
        if (len !== Object.keys(b).length) {
            return false
        }
        return keysA.every((k) => {
            return b.hasOwnProperty && b.hasOwnProperty(k) && isEqual(a[k], b[k])
        })
    }
    return false
}
function uuid(length:number = 32) {
    let rnd = ''
    for (let i = 0; i < length; i++) rnd += Math.floor(Math.random() * 10)
    return rnd
}
export function deepClone<T>(source:T, depth:number = 0, currentDepth:number = 1, hash = new WeakMap()):T{
    if (typeof source !== 'object' || source === null) return source
    if (depth > 0 && currentDepth > depth) {
        return (Array.isArray(source) ? [] : {}) as T
    }
    if (hash.has(source)) return hash.get(source)
    const target = (Array.isArray(source) ? [] : {}) as T
    hash.set(source, target)
    for (let key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
            target[key] = deepClone(source[key], depth, currentDepth + 1, hash)
        }
    }
    return target
}
const running = new WeakSet()
export interface CallBack{
    dict:Record<string, Record<string, { old:any }>>,
    before?:(uid:string)=>void
    after?:(uin:string)=>void
}
const postNotice = (fns:CallBack[], oldV, newV, handle) => {
    if (!running.has(fns) && !isEqual(oldV, newV)) {
        running.add(fns)
        let uid = uuid(8)
        for (let fn of fns) {
            fn && fn.before && fn.before(uid)
        }
        handle(newV)
        Promise.resolve().then(() => {
            for (let fn of fns) {
                fn && fn.after && fn.after(uid)
            }
            running.delete(fns)
        })
        return true
    }
    return false
}
const checkKey = (key) => {
    return (
        key !== callBackProxy &&
        key !== watchDepthSymbol &&
        key !== watchConfigsSymbol
    )
}
const checkValue = (value, depth, currentDepth) => {
    return (
        typeof value === 'object' &&
        !value[callBackProxy] &&
        (depth === 0 || currentDepth < depth) &&
        Object.isExtensible(value)
    )
}
const deleteHandler = (target, key) => {
    if (checkKey(key)) {
        if (
            postNotice(target[callBackProxy], 0, 1, () => {
                Reflect.deleteProperty(target, key)
            })
        ) {
            return true
        }
    }
    return Reflect.deleteProperty(target,key)
}
const setHandler = (target, key, value, handle, depth, currentDepth) => {
    if (checkKey(key)) {
        if (checkValue(value, depth, currentDepth)) {
            value[callBackProxy] = target[callBackProxy]
            value = toProxy(value, depth, currentDepth + 1)
            deepProxy(value, depth, currentDepth + 1)
        }
        if (postNotice(target[callBackProxy], target[key], value, handle)) {
            return true
        }
    }
    handle(value)
    return true
}
function toProxy<T>(obj:T, depth:number = 0, currentDepth:number):T{
    return new Proxy(obj, {
        defineProperty(target, key, attributes) {
            if (!attributes.hasOwnProperty('value')) {
                return Reflect.defineProperty(target,key,attributes)
            }
            return setHandler(
                target,
                key,
                attributes.value,
                (value) => {
                    attributes.value = value
                    Reflect.defineProperty(target, key, attributes)
                },
                depth,
                currentDepth
            )
        },
        set: function (target, key, value) {
            return setHandler(
                target,
                key,
                value,
                (value) => {
                    Reflect.set(target, key, value)
                },
                depth,
                currentDepth
            )
        },
        deleteProperty: deleteHandler,
    })
}
type Cb<T=any>=(value:T,oldValue:T)=>void
export type Config<T extends object>=({
    [P in keyof T]?:Cb<T[P]>
} & {
    [P in '*']?:Cb
}) | Cb<T>
export type Proxied<T extends object>={
    [P in keyof T]:T[P] extends object?Proxied<T[P]>:T[P]
} & {
    [callBackProxy]?:CallBack[]
    [watchDepthSymbol]?:number
    [watchConfigsSymbol]?:Config<T>
}
export default function deepProxy<T extends object>(obj:T, depth:number = 0, currentDepth:number = 1):Proxied<T> {
    if(obj===null || typeof obj!=='object') return obj
    if (currentDepth === 1) {
        if (!obj[callBackProxy]) {
            obj[callBackProxy] = []
        } else {
            return obj
        }
    }
    for (let key of Object.keys(obj)) {
        if (checkValue(obj[key], depth, currentDepth)) {
            obj[key][callBackProxy] = obj[callBackProxy]
            obj[key] = toProxy(obj[key], depth, currentDepth + 1)
            deepProxy(obj[key], depth, currentDepth + 1)
        }
    }
    if (currentDepth > 1) {
        return
    }
    return toProxy(obj, depth, currentDepth)
}