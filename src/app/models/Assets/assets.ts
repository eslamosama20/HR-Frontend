export class AssetDto {
    id: string; // Guid in C# is represented as a string in TypeScript
    base64: string;
    base64Url?: string;
    url?: string;
    publicId?: string;
}
export class AssetPostDto {
    base64: string;
    base64Url?: string;
    url?: string;
    publicId?: string;
}
export class AssetPutDto {
    id: string; // Guid in C# is represented as a string in TypeScript
    base64: string;
    base64Url?: string;
    url?: string;
    publicId?: string;
}
export class AssetResponseDto {
    id: string; // Guid in C# is represented as a string in TypeScript
    url: string; // Adjusted to use camelCase
    base64Url?: string;
    publicId?: string;
}
