function patchHandlers(handlers: any) {
  if (handlers[isPatchedSymbol]) return;
  handlers[isPatchedSymbol] = true;
  _handlers = handlers;
  for (let [a, val] of pendingPatches) {
    patches.set(a, before(val[0], _handlers, val[1]));
    pendingPatches.delete(a);
  }
}

/** Init the patcher — safe if APIs are gone */
function start() {
  if (origGetParams) {
    console.error(`Tried to start the MessageHandlersPatcher when it's already started`);
    return;
  }

  // NEW: bail if module or descriptor is missing
  if (!MessagesHandlers?.prototype) {
    console.warn('[FileContentPreview] MessagesHandlers not found — tap patch disabled');
    return;
  }

  const desc = Object.getOwnPropertyDescriptor(MessagesHandlers.prototype, 'params');
  if (!desc?.get) {
    console.warn('[FileContentPreview] MessagesHandlers.params getter missing — tap patch disabled');
    return;
  }

  origGetParams = desc.get;
  Object.defineProperty(MessagesHandlers.prototype, 'params', {
    configurable: true,
    get() {
      this && patchHandlers(this);
      return origGetParams.call(this);
    },
  });
}

/** Un-do everything done by start() */
function end() {
  if (!origGetParams) {
    // was never patched — fine
    return;
  }
  if (MessagesHandlers?.prototype) {
    Object.defineProperty(MessagesHandlers.prototype, 'params', {
      configurable: true,
      get: origGetParams,
    });
  }
  if (_handlers) _handlers[isPatchedSymbol] = false;
  _handlers = undefined;
  origGetParams = undefined;
}

export const UnpatchALL = Symbol('unpatchALL');

/**
 * Adds a message handlers patch, also inits the patcher if it's the first patch
 */
export function patch(fn: KnownHandlers, callback: (args: any[]) => any) {
  if (!origGetParams) start();

  // NEW: if start() failed, still return a no-op unpatch so onLoad doesn't explode
  if (!origGetParams && !MessagesHandlers?.prototype) {
    return () => {};
  }

  let a = Symbol('patch');
  if (_handlers) {
    patches.set(a, before(fn, _handlers, callback));
  } else if (origGetParams) {
    // start succeeded; handler not seen yet — queue it
    pendingPatches.set(a, [fn, callback]);
  } else {
    // start failed — nothing to do
    return () => {};
  }
  return () => unpatch(a);
}

export function unpatch(patch: symbol) {
  if (patch == UnpatchALL) {
    for (let undo of patches.values()) undo();
    patches.clear();
  } else if (pendingPatches.has(patch)) {
    pendingPatches.delete(patch);
  } else if (patches.has(patch)) {
    patches.get(patch)!();
    patches.delete(patch);
  } else {
    console.error(
      `MessageHandlersPatcher.unpatch should be used like: unpatch(patch) or unpatch(UnpatchALL). ${String(patch)} was given instead.`,
    );
  }
  if (!patches.size) end();
}

export default { patch, unpatch, UnpatchALL };
