/** Declarations for the part of the Khronos glTF Validator used by `validate.ts`. */
declare module 'gltf-validator' {
  export interface ValidationMessage {
    readonly code: string;
    readonly message: string;
    readonly severity: number;
    readonly pointer?: string;
  }

  export interface ValidationReport {
    readonly validatorVersion: string;
    readonly issues: {
      readonly numErrors: number;
      readonly numWarnings: number;
      readonly numInfos: number;
      readonly numHints: number;
      readonly messages: readonly ValidationMessage[];
    };
    readonly info: Readonly<Record<string, unknown>>;
  }

  export interface ValidationOptions {
    readonly uri?: string;
    readonly format?: 'glb' | 'gltf';
    readonly writeTimestamp?: boolean;
    readonly maxIssues?: number;
  }

  export function validateBytes(
    data: Uint8Array,
    options?: ValidationOptions,
  ): Promise<ValidationReport>;
}
