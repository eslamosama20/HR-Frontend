import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, from, switchMap } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { environment } from 'src/environments/environment';
import { Servers } from 'src/app/enums/servers';
import { UserAccountModel } from 'src/app/models/auth/userAccount.model';

/** نفس الباث المستخدم في AuthHTTPService */
const API_USERS_URL = `${environment.server_urls[environment.active_server][Servers.authUrl]}Account`;


@Injectable({ providedIn: 'root' })
export class UserHTTPService {
  constructor(private http: HttpClient) {}

  // ============ Helpers ============
  private getAuthHeaders(json = true): HttpHeaders {
    const token = localStorage.getItem('authToken') || '';
    let headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
    if (json) {
      headers = headers.set('Content-Type', 'application/json');
      headers = headers.set('Accept', 'application/json');
    }
    return headers;
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    // لو الباك يرجّع رسائل، نحاول نظهر المفيد
    const msg =
      (error?.error && (error.error.message || error.error.title || error.error.detail)) ||
      error?.status === 401
        ? 'غير مصرح (401) — تأكد من تسجيل الدخول أو صلاحية التوكن'
        : error?.status === 400
        ? 'طلب غير صحيح (400) — راجع البيانات المرسلة'
        : 'حدث خطأ غير متوقع. حاول لاحقًا.';
    return throwError(() => msg);
  }

  /**
   * إزالة بادئة data URL (إن وجدت) وإرجاع Base64 الخام فقط
   * مثال: 'data:image/png;base64,AAA...' -> 'AAA...'
   */
  private stripDataUrl(input: string): string {
    if (!input) return '';
    const commaIndex = input.indexOf(',');
    if (input.startsWith('data:') && commaIndex !== -1) {
      return input.substring(commaIndex + 1);
    }
    return input;
  }

  /**
   * توحيد قيمة الصورة: تقليم، إزالة البادئة، وإرجاع null لو فاضية
   */
  private sanitizeProfilePicture(val?: string | null): string | null {
    if (!val) return null;
    const trimmed = val.trim();
    if (!trimmed) return null;
    const raw = this.stripDataUrl(trimmed);
    return raw || null;
  }

  /** محوّل ملف -> Base64 (خام بدون data URL prefix) */
  private fileToBase64(file: File): Observable<string> {
    return new Observable<string>((observer) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64Raw = this.stripDataUrl(result);
        observer.next(base64Raw);
        observer.complete();
      };
      reader.onerror = () => observer.error('فشل قراءة الملف');
      reader.readAsDataURL(file);
    });
  }

  // ============ Endpoints ============

  /**
   * جلب بيانات المستخدم الحالية (يعتمد على التوكن)
   * ملحوظة: بعض المشاريع بتستخدم GET /api/auth/Account
   */
  getMyProfile$(): Observable<UserAccountModel> {
    return this.http
      .get<UserAccountModel>(`${API_USERS_URL}`, { headers: this.getAuthHeaders(false) })
      .pipe(catchError(this.handleError));
  }

  /**
   * تحديث الملف الشخصي بصيغة JSON كما حدّدت:
   * PATCH http://localhost:5001/api/auth/Account/UpdateProfile
   * مهم: نقوم بتنظيف profilePicture قبل الإرسال
   */
  updateProfile$(dto: UserAccountModel): Observable<UserAccountModel> {
    const payload = {
      ...dto.toJSON(),
      profilePicture: this.sanitizeProfilePicture(dto.profilePicture),
    };

    return this.http
      .patch<UserAccountModel>(`${API_USERS_URL}/UpdateProfile`, payload, {
        headers: this.getAuthHeaders(true),
      })
      .pipe(catchError(this.handleError));
  }

  /**
   * مريح: نفس UpdateProfile لكن يبني الـ profilePicture من ملف الصورة (Base64 خام) تلقائيًا
   * ويضيفها للـ dto ثم ينادي UpdateProfile.
   */
  updateProfileWithFile$(
    dto: Omit<UserAccountModel, 'profilePicture'> & { profilePicture?: string | null },
    pictureFile: File
  ): Observable<UserAccountModel> {
    return from(this.validateImageFile(pictureFile)).pipe(
      switchMap(() => this.fileToBase64(pictureFile)),
      switchMap((b64Raw) => this.updateProfile$({ ...dto, profilePicture: b64Raw }))
    );
  }

  /**
   * في حالة احتجت ترفع الصورة بس كملف Multipart (لو الباك يدعم إندبوينت منفصل)
   * مثال: POST /api/auth/Account/UploadProfilePicture
   * لو مش موجود عندك، سيبه للاحتياط.
   */
  uploadProfilePicture$(file: File): Observable<any> {
    const form = new FormData();
    form.append('profilePicture', file, file.name);
    const headers = this.getAuthHeaders(false); // مهم: ما نضيفش Content-Type يدويًا مع FormData
    return this.http
      .post(`${API_USERS_URL}/UploadProfilePicture`, form, { headers })
      .pipe(catchError(this.handleError));
  }

  // ============ Validations ============
  private validateImageFile(file: File): Promise<void> {
    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    const maxSizeMb = 3;
    return new Promise((resolve, reject) => {
      if (!allowed.includes(file.type)) {
        reject(new Error('نوع الصورة غير مدعوم. المسموح: PNG, JPG, JPEG, WEBP'));
        return;
      }
      if (file.size > maxSizeMb * 1024 * 1024) {
        reject(new Error(`حجم الصورة يجب ألا يتجاوز ${maxSizeMb}MB`));
        return;
      }
      resolve();
    });
  }
}
