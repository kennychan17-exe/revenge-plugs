import patch0 from './patches/MessageHandlers';
import patch1 from './patches/RowManager';

let patches: any[] = [];

export default {
  onLoad: () => {
    try {
      patches.push(patch0());
    } catch (e) {
      console.error('[FileContentPreview] MessageHandlers patch failed', e);
    }
    try {
      patches.push(patch1());
    } catch (e) {
      console.error('[FileContentPreview] RowManager patch failed', e);
    }
  },
  onUnload: () => {
    for (let unpatch of patches) {
      try {
        unpatch?.();
      } catch {}
    }
    patches = [];
  },
};
