import { Injectable } from '@angular/core';
import { Servers } from 'src/app/enums/servers';
import { ApiCallerService } from '../api-caller.service';
import { ServiceBase } from '../base/service-base.service';
import { MealReservationModel } from 'src/app/models/meal-reservation/meal-reservation.model';

@Injectable({
  providedIn: 'root'
})
export class MealReservationService extends ServiceBase<MealReservationModel> {
  constructor(apiCaller: ApiCallerService) {
    super(apiCaller, "mealReservation", MealReservationModel, Servers.baseApi);
  }
}
