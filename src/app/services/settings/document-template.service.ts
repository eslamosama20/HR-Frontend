import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ServiceBase } from '../base/service-base.service';
import { ApiCallerService, APIRequest, HTTPVerbs } from '../api-caller.service';
import { Servers } from '../../enums/servers';
import { DocumentTemplateModel } from '../../models/settings/document-template.model';
import { DocumentTemplateType } from '../../enums/document-enums';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DocumentTemplateService extends ServiceBase<DocumentTemplateModel> {
  constructor(private apiCallerService: ApiCallerService, private http: HttpClient) {
    super(apiCallerService, "documenttemplate", DocumentTemplateModel, Servers.settingsUrl);
  }

  getByType(templateType: DocumentTemplateType): Observable<DocumentTemplateModel> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.get;
    request.endpoint = `${this.endpoint}/type/${templateType}`;
    request.server_url = Servers.settingsUrl;

    return this.apiCallerService.callApi(request).pipe(
      map(data => new DocumentTemplateModel(data))
    );
  }

  getAllByType(templateType: DocumentTemplateType): Observable<DocumentTemplateModel[]> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.get;
    request.endpoint = `${this.endpoint}/type/${templateType}/all`;
    request.server_url = Servers.settingsUrl;

    return this.apiCallerService.callApi(request).pipe(
      map(data => data?.map((d: any) => new DocumentTemplateModel(d)) || [])
    );
  }

  downloadTemplate(templateType: DocumentTemplateType): void {
    this.getFileBlobByType(templateType).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      },
      error: () => console.error('Failed to download template file')
    });
  }

  downloadById(id: string): Observable<{fileData: string, fileType: string, fileName: string}> {
    const request = new APIRequest();
    request.verb = HTTPVerbs.get;
    request.endpoint = `${this.endpoint}/${id}/file`;
    request.server_url = Servers.settingsUrl;
    return this.apiCallerService.callApi(request);
  }

  getFileBlob(id: string): Observable<Blob> {
    const baseUrl = environment.server_urls[environment.active_server][Servers.settingsUrl];
    const url = `${baseUrl}${this.endpoint}/${id}/file`;
    return this.http.get(url, { responseType: 'blob' });
  }

  getFileBlobByType(templateType: DocumentTemplateType): Observable<Blob> {
    const baseUrl = environment.server_urls[environment.active_server][Servers.settingsUrl];
    const url = `${baseUrl}${this.endpoint}/type/${templateType}/file`;
    return this.http.get(url, { responseType: 'blob' });
  }
}
