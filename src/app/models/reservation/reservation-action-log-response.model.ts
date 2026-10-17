export interface ReservationActionLogResponseDto {
  id: string;
  reservationId: string;
  actionType: string;
  executedBy: string;
  occurredAt: string;
}
