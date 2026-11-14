import {
  type RenderPipeline,
  RenderTarget,
  UnsignedByteType,
  type WebGPURenderer,
} from 'three/webgpu';

/**
 * Shows the rendered frame to the user.
 *
 * The usual presenter lets the renderer draw into the canvas. The read-back presenter renders
 * into a texture, reads its pixels and paints them onto the canvas through a 2D context: it is
 * for environments in which a WebGPU device can render but cannot present to a canvas, such as
 * headless browsers running on a software rasteriser.
 */
export interface Presenter {
  /** Sets the size of the drawing buffer, in physical pixels. */
  resize(width: number, height: number): void;
  /** Renders a frame; resolves once it is visible. */
  present(): Promise<void>;
  dispose(): void;
}

export function createCanvasPresenter(pipeline: RenderPipeline): Presenter {
  return {
    resize: () => undefined,
    present() {
      pipeline.render();
      return Promise.resolve();
    },
    dispose: () => undefined,
  };
}

export function createReadbackPresenter(
  renderer: WebGPURenderer,
  pipeline: RenderPipeline,
  canvas: HTMLCanvasElement,
  rowsAreBottomUp: boolean,
): Presenter {
  const context = canvas.getContext('2d');
  if (context === null) {
    throw new Error('The canvas cannot provide a 2D context for the read-back presenter.');
  }
  const target = new RenderTarget(1, 1, { type: UnsignedByteType, depthBuffer: true });

  const resize = (width: number, height: number): void => {
    canvas.width = width;
    canvas.height = height;
    target.setSize(width, height);
  };

  const present = async (): Promise<void> => {
    renderer.setRenderTarget(target);
    pipeline.render();
    renderer.setRenderTarget(null);
    const { width, height } = target;
    const pixels = await renderer.readRenderTargetPixelsAsync(target, 0, 0, width, height);
    if (width !== canvas.width || height !== canvas.height) {
      return;
    }
    const image = context.createImageData(width, height);
    const rowBytes = width * 4;
    for (let row = 0; row < height; row += 1) {
      const sourceRow = rowsAreBottomUp ? height - 1 - row : row;
      image.data.set(
        pixels.subarray(sourceRow * rowBytes, (sourceRow + 1) * rowBytes),
        row * rowBytes,
      );
    }
    context.putImageData(image, 0, 0);
  };

  return { resize, present, dispose: () => target.dispose() };
}
