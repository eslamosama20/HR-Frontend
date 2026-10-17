import {Injectable} from '@angular/core';
import {ServiceBase} from "../base/service-base.service";
import {ApiCallerService, APIRequest, HTTPVerbs} from "../api-caller.service";
import { Servers } from '../../enums/servers';
import {InventoryPermitModel} from "../../models/permits/inventory-permit.model";
import {InventoryPermitEntryModel} from "../../models/permits/inventory-permit-entry.model";
import { RecipeEntryModel } from 'src/app/models/recipes/recipe-entry.model';

@Injectable({
  providedIn: 'root'
})
export class RecipeEntryService extends ServiceBase<RecipeEntryModel> {
  constructor(apiCaller: ApiCallerService) {
    super(apiCaller, "recipeEntry", RecipeEntryModel, Servers.baseApi);
  }
}
