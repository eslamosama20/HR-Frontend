import { AssetResponseDto } from "../Assets/assets";
import { BillAccountPostDto, BillAccountPutDto } from "../billAccounts/billAccounts";

export class BillOfExchangePostDto {
    totalPrice: number;
    description?: string;
    asset?: { base64: string }; // Assuming asset structure has at least a Base64 property
    billNo: string;
    sellerId: string;
    treasuryId?: string; // Assuming treasuryId can be a string or can be null
    isActive?: boolean; // Default to true if not specified
    createdBy?: string; // Assuming createdBy can be a string or can be null
    billOfExchangeCreatedAt: Date; // Should be a Date object
    billAccounts: BillAccountPostDto[]; // Assuming this is an array of BillAccountPost
}
export class BillOfExchangePutDto {
    id: string; // Guid in C# is represented as a string in TypeScript
    totalPrice: number;
    description?: string;
    asset?: { base64: string }; // Assuming asset structure has at least a Base64 property
    billNo: string;
    sellerId: string;
    treasuryId?: string; // Assuming treasuryId can be a string or can be null
    isActive?: boolean; // Default to true if not specified
    createdBy?: string; // Assuming createdBy can be a string or can be null
    billOfExchangeCreatedAt: Date; // Should be a Date object
    billAccounts: BillAccountPutDto[]; // Assuming this is an array of BillAccountPut
}
export class BillOfExchangeResponseDto {
    id: string; // Guid in C# is represented as a string in TypeScript
    totalPrice: number;
    description?: string;
    billNo: string;
    sellerId: string;
    treasuryId?: string; // Assuming treasuryId can be a string or can be null
    isActive?: boolean; // Default to true if not specified
    createdBy?: string; // Assuming createdBy can be a string or can be null
    billOfExchangeCreatedAt: Date; // Should be a Date object
    asset?: AssetResponseDto; // Assuming AssetResponse represents the asset structure
    assetUrl?: string;
    billAccounts: BillAccountPostDto[]; // Assuming this is an array of BillAccountsResponse
}
