import {exportToCanvas} from '@excalidraw/excalidraw';
import type {ExcalidrawElement, NonDeleted} from '@excalidraw/excalidraw/element/types';

// Export the same pressure, rotation and brush geometry the person sees on the board.
// Do not replace it with a thin polyline or add colored endpoint markers.
export function renderInk(elements: readonly NonDeleted<ExcalidrawElement>[]) {
  return exportToCanvas({
    elements,
    files: {},
    appState: {exportBackground: true, viewBackgroundColor: '#ffffff', exportWithDarkMode: false},
    exportPadding: 16,
    getDimensions(width: number, height: number) {
      const scale = Math.min(4, 720 / Math.max(width, height, 1));
      return {width: Math.ceil(width * scale), height: Math.ceil(height * scale), scale};
    },
  });
}
