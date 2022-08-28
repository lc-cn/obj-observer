import deepProxy, {
    CallBack,
    Config,
    callBackProxy,
    deepClone,
    isEqual,
    watchConfigsSymbol,
    watchDepthSymbol, Proxied,
} from './deepProxy'
export function Watcher<T>(source:T, depth:number = 0) {
    if(source===null || typeof source!=="object") throw new Error('source must typeof object')
    source[watchDepthSymbol]=depth
    return deepProxy(source, depth)
}
export type Dispose=()=>void
export type MaybeProxy<T extends object>=T|Proxied<T>
export function watch<T extends object>(obj:T, config:Config<T>, env=this):[Proxied<T>,Dispose] {
    let target:MaybeProxy<T>=obj
    if (!obj.hasOwnProperty(callBackProxy)) {
        target = Watcher(obj)
    }
    let depth = target[watchDepthSymbol] || 0
    if (!target[watchConfigsSymbol]) {
        target[watchConfigsSymbol] = new WeakMap()
    }
    if (!target[watchConfigsSymbol].has(config)) {
        const cb:CallBack = {
            dict: {},
            before(uid) {
                let oldValue = deepClone(target, depth)
                this.dict[uid] = {}
                if(typeof config==='function'){
                    this.dict[uid]['*'] = {
                        old: oldValue,
                    }
                }else{
                    for (let k in config) {
                        if (k === '*') {
                            this.dict[uid][k] = {
                                old: oldValue,
                            }
                        } else {
                            let paths = k.split('.')
                            let data = oldValue
                            for (let p of paths) {
                                if (typeof data != 'object') {
                                    data = undefined
                                    break
                                }
                                data = data[p]
                            }
                            this.dict[uid][k] = {
                                old: data,
                            }
                        }
                    }
                }
            },
            after(uid) {
                let newValue = deepClone(target, depth)
                if (!this.dict[uid]) {
                    return
                }
                if (Object.keys(this.dict[uid]).length > 0) {
                    for (let k in this.dict[uid]) {
                        let current
                        if (k === '*') {
                            current = newValue
                        } else {
                            let paths = k.split('.')
                            let data = newValue
                            for (let p of paths) {
                                if (typeof data != 'object') {
                                    data = undefined
                                    break
                                }
                                data = data[p]
                            }
                            current = data
                        }
                        let old = this.dict[uid][k].old
                        if (!isEqual(current, old)) {
                            let fun = typeof config[k] === 'function' ? config[k] : typeof config==='function'?config:config[k].handler
                            fun && fun.call(env, current, old, target)
                        }
                    }
                }
                delete this.dict[uid]
            },
        }
        target[watchConfigsSymbol].set(config, cb)
        if (!target[callBackProxy].includes(cb)) {
            target[callBackProxy].push(cb)
        }
    }
    const dispose = () => {
        destroy(target, config)
    }
    return [target,dispose]
}

export function destroy<T>(target:T, config?) {
    if (!config) {
        target[watchConfigsSymbol] = new WeakMap()
        target[callBackProxy].splice(0)
        return
    }
    if (target[watchConfigsSymbol].has(config)) {
        let cb = target[watchConfigsSymbol].get(config)
        if (target[callBackProxy].includes(cb)) {
            target[callBackProxy].splice(target[callBackProxy].indexOf(cb), 1)
        }
        target[watchConfigsSymbol].delete(config)
    }
}
