import { EntityBase } from "../base/entity-base";
import { ReservationRoomEntryModel } from "./reservation-room-entry-model";
import { ReservationServiceEntryModel } from "./reservation-service-entry-model";
import { AttachmentModel } from "../Attachments/attachment.model";

export class ReservationModel extends EntityBase {
  referenceNumber: string;
  guestName: string;
  guestPhone: string;
  guestEmail: string;
  nationality: string;
  arrivalDate: Date | string;
  departureDate: Date | string;
  numberOfNights: number;

  reservationCompanyId: string;
  reservationClientCompanyId: string;
  salesRepresentativeId: string;
  hotelId: string;
  reservationSeasonId: string;

  reservationType: "AgentDirect" | "HotelDirect" | "Allotment";
  reservationRoomEntries: ReservationRoomEntryModel[];
  reservationServiceEntries: ReservationServiceEntryModel[];

  attachments: AttachmentModel[];
  transactionId: string;

  isSentToZatca: boolean;
  invoiceHash: string;
  generatedQR: string;
  isFrontal: boolean;
  bankAccountId: string;
  companyPhoneId: string;
  companyPolicyId: string;
  // إضافة isConfirmed هنا
  isConfirmed?: boolean; // جعلها اختيارية، لأنه يمكن أن تعتمد على بعض الشروط الأخرى.
isCancelled?: boolean;
  saleInvoiceId?: number;
  hotelRemarks?: string;
  clientRemarks?: string;
  createdByName?: string;

  hotelArabicName?: string;
  hotelEnglishName?: string;
  reservationCompanyArabicName?: string;
  reservationCompanyEnglishName?: string;
  reservationClientCompanyArabicName?: string;
  reservationClientCompanyEnglishName?: string;
  salesRepresentativeArabicName?: string;
  salesRepresentativeEnglishName?: string;
  reservationSeasonArabicName?: string;
  reservationSeasonEnglishName?: string;
  bankAccountArabicName?: string;
  bankAccountEnglishName?: string;
  companyPhoneName?: string;
  companyPolicyArabicName?: string;
  companyPolicyEnglishName?: string;
  constructor(data?: Partial<ReservationModel>) {
    super(data);
    if (data) {
      Object.assign(this, data);
    }
  }

  override validate(): boolean {
    return super.validate()
      && !!this.guestName
      && !!this.nationality
      && !!this.arrivalDate
      && !!this.departureDate
      && !!this.numberOfNights
      && !!this.reservationCompanyId
      && !!this.reservationClientCompanyId
      && !!this.hotelId
      && !!this.reservationSeasonId
      && !!this.reservationType;
  }
}
