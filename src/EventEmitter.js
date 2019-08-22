class EventEmitter {
  constructor() {
    this.handlers = new Map();
    this.oneHandlers = new Map();
  }
  one(event, fn) {
    const handlers = this.oneHandlers.get(event);
    if (typeof handlers === 'undefined') {
      this.oneHandlers.set(event, fn);
    } else if (Object.prototype.toString.call(handlers) === '[object Function]') {
      this.oneHandlers.set(event, [handlers, fn]);
    } else {
      handlers.push(fn);
    }
  }
  on(event, fn) {
    const handlers = this.handlers.get(event);
    if (typeof handlers === 'undefined') {
      this.handlers.set(event, fn);
    } else if (Object.prototype.toString.call(handlers) === '[object Function]') {
      this.handlers.set(event, [handlers, fn]);
    } else {
      handlers.push(fn);
    }
  }
  emit(event, ...args) {
    const oneHandlers = this.oneHandlers.get(event);
    const handlers = this.handlers.get(event);
    if (handlers) {
      if (Array.isArray(handlers)) {
        handlers.forEach(handler => {
          handler.apply(this, args)
        })
      } else {
        handlers.apply(this, args)
      }
    }
    if (oneHandlers) {
      if (Array.isArray(oneHandlers)) {
        oneHandlers.forEach(handler => {
          handler.apply(this, args)
        })
      } else {
        oneHandlers.apply(this, args)
      }
      this.oneHandlers.delete(event);
    }
  }
  delete(event) {
    this.oneHandlers.delete(event);
    this.handlers.delete(event);
  }
}

export default EventEmitter;