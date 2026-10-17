import { ReservationActionLogResponseDto } from './reservation-action-log-response.model';

export interface ConfirmReservationResponseDto {
  id: string;
  isConfirmed: boolean;
  confirmedAt: string;
  lastLog: ReservationActionLogResponseDto | null;
}
