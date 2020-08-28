/**
 * 自定义Promise函数模块：IIFE
 */

 (function (window){

    const PENDING = 'pending'
    const RESOLVED = 'resolved'
    const REJECTED = 'rejected'

    class Promise {
        /**
         * Promise构造函数
         * excutor:执行器函数（同步执行）
         */
        constructor(excutor){

            //将当前promise对象保存起来 ES5的方法
            const self = this

            self.status = PENDING //给promise对象指定status属性，初始值为pending
            self.data = undefined //给promise对象指定一个用于存储结果数据的属性
            self.callbacks = [] //每个元素的结构：{onResolved() {},onRejected() {}}

            function resolve(value){
                //如果当前状态不是pending，直接结束 
                if (self.status!==PENDING){
                    return
                }

                // 将状态改为resolved
                self.status = RESOLVED
                //保存value数据
                self.data = value
                //如果有待执行的callback函数，立即异步执行回调onResolved
                if (self.callbacks.length > 0) {
                    setTimeout(() =>{ //放入队列中执行所有成功的回调
                        self.callbacks.forEach(callbacksObj => {
                            callbacksObj.onResolved(value)
                        });
                    })
                }
            }

            function reject(reason){
                //如果当前状态不是pending，直接结束 
                if (self.status!==PENDING){
                    return
                }

                // 将状态改为rejected
                self.status = REJECTED
                //保存reason数据
                self.data = reason
                //如果有待执行的callback函数，立即异步执行回调onRejected
                if (self.callbacks.length > 0) {
                    setTimeout(() =>{ //放入队列中执行所有成功的回调
                        self.callbacks.forEach(callbacksObj => {
                            callbacksObj.onRejected(reason)
                        });
                    })
                }
            }

            //立即同步执行executor
            try {
                excutor(resolve,reject)
            } catch (error) {  //如果执行器抛出异常，promise对象变为rejected状态
                reject(error)
            }
        }

        /**
         * Promise原型对象的then()
         * 指定成功和失败的回调函数
         * 返回一个新的promise对象
         */
        then (onResolved,onRejected){

            //指定回调函数的默认值（必须是函数）
            onResolved = typeof onResolved === 'function' ? onResolved : value => value  //向后传递成功的value

            //指定默认的失败的回调(实现错误/异常传透的关键步骤)
            onRejected = typeof onRejected === 'function' ? onRejected : reason =>{throw reason}  //向后传递失败的reason

            const self = this

            //返回一个新的promise对象
            return new Promise((resolve,reject) => {

                /**
                 * 调用指定的回调函数处理，根据执行的结果，改变return的promise的状态
                 * 理解：即“改变状态，让其停下，避免一直套娃”。调用resolve()、reject()，以及‘3’去让promise确定状态，停下来，如果后续还有then，再跑
                 * @param {*} callback 
                 */
                function handle(callback) {
                    /**
                     * 1.如果回调函数执行抛出异常，return的promise就会失败，reason就是error
                     * 2.如果回调函数执行返回非promise，return的promise就会成功，value就是返回值
                     * 3.如果回调函数返回是promise，return的promise结果就是这个promise的结果
                     */

                    try {
                        const result = callback(self.data)  
                        if(result instanceof Promise){
                            //3.如果回调函数返回是promise，return的promise结果就是这个promise的结果
                            //使用promise的时候要用执行器，执行器中必须有resolve或者reject方法
                            result.then( //这个.then就是在执行return的promise
                                value => resolve(value), //当result成功时，让return的promise也成功
                                reason => reject(reason)  //当result失败时，让return的promise也失败
                            )

                            //简洁版
                            //then是回调啊，回调promise，得好好理解
                            // result.then(resolve,reject)
                        }else{
                            //2.如果回调函数执行返回非promise，return的promise就会成功，value就是返回值
                            resolve(result)
                        }                    
                        } catch (error) {
                            //1.如果回调函数执行抛出异常，return的promise就会失败，reason就是error
                            reject(error)
                        }                
                }

                if (self.status === PENDING){
                    //当前状态是pending状态，保存一个函数，这个函数会去调用回调函数
                    self.callbacks.push({
                        onResolved(value){ //这里的value可以留可以不留，用不上，因为handle函数里调用了self.data
                            handle(onResolved)
                        },
                        onRejected(reason){
                            handle(onRejected)
                        }
                    })
                }else if (self.status === RESOLVED){ //如果当前是resolved状态，异步执行onResolve并改变return的promise状态
                    setTimeout(() => {
                        handle(onResolved)
                    });
                }else{ //'rejected'
                    setTimeout(() => {
                        handle(onRejected)
                    });
                }
        
            })

        }

        /**
         * Promise原型对象的catch()
         * 指定失败的回调函数
         * 返回一个新的promise对象
         */
        catch (onRejected){
            return this.then(undefined,onRejected)
        }

        /**
         * Promise函数对象的方法，resolve
         * 返回一个指定结果的成功的promise
         */
        static resolve = function(value){
            //返回一个成功/失败的promise
            return new Promise((resolve,reject) => {
                // value是promise
                if (value instanceof Promise) { //使用value的结果作为promise的结果
                    value.then(resolve,reject)
                }else{ //value不是promise => promise变为成功，数据是value
                    resolve(value)
                }   
            })
        }

        /**
         * Promise函数对象的方法，reject
         * 返回一个指定reason的失败的promise
         */
        static reject = function(reason){
            //返回一个失败的promise
            return new Promise((resolve,reject) => {
                reject(reason)
            })
        }

        /**
         * Promise函数对象的方法，all
         * 返回一个promise，只有当所有promise都成功时才成功，否则只要有一个失败，就失败
         */
        static all = function(promises){

            //用来保存所有成功value的数组
            const values = new Array(promises.length) 
            //用来保存成功promise的数量
            let resolvedCount = 0
            //返回一个新的promise
            return new Promise((resolve,reject)=>{
                // 遍历获取每个promise的结果
                promises.forEach((p,index) => {
                    Promise.resolve(p).then(
                        value => { 
                            resolvedCount++  //成功的数量+1
                            //p成功，将成功的value保存到values
                            values[index] = value

                            // 如果全部成功了，将return的promise变成成功
                            if(resolvedCount === promises.length){
                            resolve(values) 
                            }
                        },
                        reason => { //只要一个失败了，return的promise就失败
                            reject(reason)
                        }
                    )
                })
            })
        }

        /**
         * Promise函数对象的方法，race
         * 返回一个promise，其结果由第一个完成的（注意是第一个完成的，不是第一个，成功的失败的完成了都算）promise决定
         */
        static race = function(promises){
            //返回一个promise
            return new Promise((resolve,reject) => {
                // 遍历获取每个promise的结果
                promises.forEach((p,index) => {
                    Promise.resolve(p).then( //这里用promise包装起来是为了防止传入进来的有非promise对象
                        value => { //一旦有成功了，将return的promise变为成功
                            resolve(value)
                        },
                        reason => { //一旦有失败了，将return的promise变为失败   
                            reject(reason)
                        }
                    )
                })        
            })
        }

        /**
         * 返回一个promise对象，它在指定时间后才确定结果
         * @param {*} value 
         * @param {*} time 
         */
        static resolveDelay = function (value,time) {
            //返回一个成功/失败的promise
            return new Promise((resolve,reject) => {
                setTimeout(() => {
                    // value是promise
                    if (value instanceof Promise) { //使用value的结果作为promise的结果
                        value.then(resolve,reject)
                    }else{ //value不是promise => promise变为成功，数据是value
                        resolve(value)
                    }   
                }, time);
            })
        }

        /**
         * 返回一个promise对象，它在指定时间后才失败
         * @param {*} value 
         * @param {*} time 
         */
        static rejectDelay = function (reason,time) {
            //返回一个失败的promise
            return new Promise((resolve,reject) => {
                setTimeout(() => {
                    reject(reason)
                }, time);
            })
        }

    }


    //向外暴露Promise函数
    window.Promise = Promise
 })(window)