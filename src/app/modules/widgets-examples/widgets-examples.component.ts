import { Component, OnInit } from '@angular/core';
import { ApiCallerService, HTTPVerbs } from 'src/app/services/api-caller.service';

@Component({
  selector: 'app-widgets-examples',
  templateUrl: './widgets-examples.component.html',
  styleUrls: ['./widgets-examples.component.scss'],
})
export class WidgetsExamplesComponent implements OnInit {
  constructor(private apiService: ApiCallerService) { }

  ngOnInit(): void {

  }

 /*  getProfiles(id, data) {
     this.apiService.callApi({
       verb: HTTPVerbs.get,
       endpoint: 'api/profile/' + id,
       body : data
     }).subscribe(
       (result: any[]) => {
         if (!result || result.length <= 0)
            return;

          this.profiles = result;
          this.$active_profile.next(result[0]);
       })
   }*/
}
