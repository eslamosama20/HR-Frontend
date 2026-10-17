import { AssetPostDto, AssetPutDto, AssetResponseDto } from "../Assets/assets";
import { BillAccountPostDto, BillAccountPutDto, BillAccountResponseDto } from "../billAccounts/billAccounts";

export class BillOfSalePostDto {
    totalPrice: number;
    description?: string;
    asset?: AssetPostDto;
    billNo: string;
    sellerId: string;
    treasuryId?: string;
    isActive?: boolean;
    createdBy?: string;
    billOfSalesCreatedAt: Date;
    billAccounts: BillAccountPostDto[];
}

export class BillOfSalePutDto {
    id: string; // Use string for Guid
    totalPrice: number;
    description?: string;
    asset?: AssetPutDto;
    billNo: string;
    sellerId: string;
    treasuryId?: string;
    isActive?: boolean;
    createdBy?: string;
    billOfSalesCreatedAt: Date;
    billAccounts: BillAccountPutDto[];
}

export class BillOfSaleResponseDto {
    id: string; // Use string for Guid
    totalPrice: number;
    description?: string;
    billNo: string;
    sellerId: string;
    treasuryId?: string;
    isActive?: boolean;
    createdBy?: string;
    billOfSalesCreatedAt: Date;
    asset?: AssetResponseDto;
    billAccounts: BillAccountResponseDto[];
}
