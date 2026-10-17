import {Injectable} from '@angular/core';
import {ServiceBase} from "../base/service-base.service";
import {ApiCallerService} from "../api-caller.service";
import { Servers } from '../../enums/servers';
import {RecipeModel} from "../../models/recipes/recipe.model";

@Injectable({
  providedIn: 'root'
})
export class RecipeService extends ServiceBase<RecipeModel> {
  constructor(apiCaller: ApiCallerService) {
    super(apiCaller, "recipe", RecipeModel, Servers.baseApi);
  }
}
