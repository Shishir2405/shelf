import { env, pipeline, type FeatureExtractionPipeline } from '@huggingface/transformers';
import { MODEL_FOLDERS } from './categories.js';
import { decide, dot, type Scored } from './decide.js';
import { PROTOTYPES } from './prototypes.js';
import type { Sorter } from './plan.js';

/**
 * Open-weight sentence embedder. Apache-2.0 (sentence-transformers/all-MiniLM-L6-v2, ONNX export
 * by Xenova). About 25 MB at 8-bit, so it is cheap enough to download on first use.
 */
export const MODEL = {
  id: 'Xenova/all-MiniLM-L6-v2',
  dtype: 'q8',
} as const;

const SNIPPET_MAX_CHARS = 1000;

export class MiniLMSorter implements Sorter {
  private extract?: FeatureExtractionPipeline;
  private prototypes = new Map<string, Float32Array[]>();

  constructor(cacheDir: string) {
    env.cacheDir = cacheDir;
  }

  async load(onStatus: (message: string) => void): Promise<void> {
    onStatus(`Loading ${MODEL.id} (about 25 MB on first run)…`);
    this.extract = await pipeline('feature-extraction', MODEL.id, { dtype: MODEL.dtype });
    for (const folder of MODEL_FOLDERS) {
      const vectors = await Promise.all(PROTOTYPES[folder].map((t) => this.embed(t)));
      this.prototypes.set(folder, vectors);
    }
  }

  async choose(snippet: string): Promise<string | null> {
    if (!this.extract) throw new Error('Model is not loaded');
    const text = snippet.slice(0, SNIPPET_MAX_CHARS);
    const vector = await this.embed(text);
    const scores: Scored[] = [...this.prototypes].map(([folder, protos]) => ({
      folder,
      similarity: Math.max(...protos.map((p) => dot(vector, p))),
    }));
    return decide(scores);
  }

  private async embed(text: string): Promise<Float32Array> {
    const output = await this.extract!(text, { pooling: 'mean', normalize: true });
    return Float32Array.from(output.data as Float32Array);
  }
}
