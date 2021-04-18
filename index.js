// 定义状态常量
const PEDDING = 'pedding'; // 等待
const FULFILLED = 'fulfilled'; // 成功
const REJECTED = 'rejected'; // 失败
class MyPromise {
  // 使用构造器接受执行器
  constructor(executor) {
    try {
      // 执行器是立即执行的，调用执行器，并传递 resolve 和 reject
      executor(this.resolve, this.reject);
    } catch (e) {
      this.reject(e);
    }
  }
  // 定义状态，默认等待
  status = PEDDING;
  // 定义成功之后的值
  value = undefined;
  // 定义失败之后的原因
  reason = undefined;
  // 成功回调，更改这里为空数组
  sucCb = [];
  // 失败回调，更改这里为空数组
  failCb = [];
  _statusHandle = (status) => {
    // 如果状态不是等待，则阻止继续向下执行，保证状态一旦改变就不会再发生变化
    if (this.status !== PEDDING) return;
    // 更改状态
    this.status = status;
  }
  // 定义resolve
  resolve = (value) => {
    // 更改状态为成功
    this._statusHandle(FULFILLED);
    // 保存成功之后的值
    this.value = value;
    // 判断成功回调是否存在，存在则调用，更改这里，遍历每个回调
    while (this.sucCb.length) this.sucCb.shift()();
  }
  // 定义reject
  reject = (reason) => {
    // 更改状态为失败
    this._statusHandle(REJECTED);
    // 保存成功之后的原因
    this.reason = reason;
    // 判断失败回调是否存在，存在则调用，更改这里，遍历每个回调
    while (this.failCb.length) this.failCb.shift()();
  }
  // 将then挂载在原型上
  // 更改 then
  then(sucCb, failCb) {
    // 是否存在成功回调，不存在则补充一个 value => value
    sucCb = sucCb || (value => value);
    // 是否存在错误回调，不存在则向下抛出错误
    failCb = failCb || (reason => { throw reason });
    let p = new MyPromise((resolve, reject) => {
      // 判断状态执行回调
      if (this.status === FULFILLED) {
        setTimeout(() => {
          try {
            // 存储成功回调返回的值，通过helpReturnPromise传递给下一个then
            let v = sucCb(this.value);
            helpReturnPromise(p, v, resolve, reject);
          } catch (e) {
            reject(e);
          }
        }, 0);
      } else if (this.status === REJECTED) {
        setTimeout(() => {
          try {
            // 存储失败回调返回的值，通过helpReturnPromise传递给下一个then
            let v = failCb(this.reason);
            helpReturnPromise(p, v, resolve, reject);
          } catch (e) {
            reject(e);
          }
        }, 0);
      } else {
        // 异步处理
        // 等待
        // 将成功回调和失败回调存储起来，更改这里，使用push来存储
        this.sucCb.push(() => {
          setTimeout(() => {
            try {
              // 存储成功回调返回的值，通过helpReturnPromise传递给下一个then
              let v = sucCb(this.value);
              helpReturnPromise(p, v, resolve, reject);
            } catch (e) {
              reject(e);
            }
          }, 0);
        });
        this.failCb.push(() => {
          setTimeout(() => {
            try {
              // 存储失败回调返回的值，通过helpReturnPromise传递给下一个then
              let v = failCb(this.reason);
              helpReturnPromise(p, v, resolve, reject);
            } catch (e) {
              reject(e);
            }
          }, 0);
        });
      }
    });
    return p;
  }
  // 将finally挂载在原型上
  // 传递一个回调函数作为其参数
  finally(cb) {
    // 调用 then 获取 Promise 的状态
    // 在then内部将回调返回的值使用 Promise.resolve 处理后再返回，用来传递给之后的then处理
    // 返回 then，也就是返回了一个 Promise
    // 如果finally之前成功在Promise.resolve后的then内部通过 return value 往后传递值
    // 如果finally之前失败在Promise.resolve后的then内部通过 throw reason 的方式往后抛出错误原因
    return this.then(value => {
      return MyPromise.resolve(cb()).then(v => {
        console.log('finally', v);
        return value;
      }, e => {
        console.log('finally', e);
        return value;
      });
    }, reason => {
      return MyPromise.resolve(cb()).then(v => {
        console.log('finally', v);
        throw reason;
      }, e => {
        console.log('finally', e);
        throw reason;
      });
    });
  }
  // 将catch挂载在原型上
  // 传递一个失败回调作为其参数
  catch(failCb) {
    return this.then(undefined, failCb);
  }
  // 添加静态方法 all
  static all(array) {
    // 返回一个 Promise
    return new MyPromise((resolve, reject) => {
      // 结果数组
      let result = [];
      // 用于比较参数数组是否全部执行完毕
      // 在循环中等待结果后才输出
      let idx = 0;
      array.forEach((item, index) => {
        if (item instanceof MyPromise) {
          // 当前值是一个 Promise 对象
          item.then(value => {
            result[index] = value;
            // 执行完毕后才resole，保证异步方法也进入了结果数组
            if (++idx === array.length) resolve(result);
          }, reason => {
            // 如果失败，直接 reject
            reject(reason);
          });
        } else {
          // 当前值是一个普通值
          result[index] = item;
          // 执行完毕后才resole，保证异步方法也进入了结果数组
          if (++idx === array.length) resolve(result);
        }
      });
    });
  }
  // 添加静态方法 race
  static race(array) {
    // 返回一个 Promise
    return new MyPromise((resolve, reject) => {
      // 判断是否已经有值传递出去
      let flag = false;
      for (let i = 0; i < array.length; i++) {
        if (array[i] instanceof MyPromise) {
          // 当前值是一个 Promise 对象
          array[i].then(value => {
            if (flag) return;
            // 如果成功，直接 resolve
            resolve(value);
            flag = true;
          }, reason => {
            if (flag) return;
            // 如果失败，直接 reject
            reject(reason);
            flag = true;
          });
        } else {
          // 当前值是一个普通值
          if (flag) break;
          resolve(array[i]);
          flag = true;
        }
      }
    });
  }
  // 添加静态方法 resolve
  static resolve(v) {
    if (v instanceof MyPromise) return v;
    return new MyPromise(resolve => resolve(v));
  }
}

function helpReturnPromise(p, v, resolve, reject) {
  // 如果循环调用报错直接reject
  // 并return 这个reject 阻止方法向下执行，在helpReturnPromise顶部添加
  if (p === v) {
    // 系统报错信息
    // return reject(new TypeError('Chaining cycle detected for promise #<Promise>'));
    // 我们可以写一个自己的报错信息
    return reject(new TypeError('then 发生了循环调用'));
  }
  // 判断 v 是否是 Promise 对象
  if (v instanceof MyPromise) {
    // 通过then方法查看状态
    v.then(
      /**
       * 以下传递，完全的写法是
       * value => resolve(value),
       * reason => reject(reason)
       * 因为这里仅仅是传递某个值，没有其他逻辑，所以可以用下面的简写方式
       */
      // 状态成功，通过resolve往下传递
      resolve,
      // 状态失败，通过reject往下传递
      reject
    );
  } else {
    // 普通值直接通过resolve往下传递
    resolve(v);
  }
}
