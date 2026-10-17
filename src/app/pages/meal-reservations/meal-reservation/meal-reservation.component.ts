import {ChangeDetectorRef, Component, LOCALE_ID, OnInit, signal} from '@angular/core';
import {
  FormGroup,
  FormBuilder,
  Validators,
  FormArray,
  FormsModule,
  ReactiveFormsModule,
  AbstractControl
} from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { forkJoin } from 'rxjs';
import { CustomerProfileModel } from 'src/app/models/accounting/customerProfile.model';
import { TranslationService } from 'src/app/modules/i18n';
import { CustomerProfileService } from 'src/app/services/accounting/customer-profile.service';
import { MainSalesClassService } from 'src/app/services/sales-classes-tree/main-sales-class.service';
import { nationalities } from 'src/app/utils/nationality-data';
import { formatDateOnlyToString } from 'src/app/utils/dateUtils';
import {ReservationMealModel} from "../../../models/accounting/reservation-meal-model";
import {ReservationMealService} from "../../../services/reservation-meal/reservation-meal.service";
import { ActivatedRoute, Router } from '@angular/router';
import {DomSanitizer, SafeResourceUrl} from "@angular/platform-browser";
import {AttachmentService} from "../../../services/attachments/attachment.service";
import {ConfirmationService, MessageService} from "primeng/api";
import {MealReservationModel} from "../../../models/meal-reservation/meal-reservation.model";
import {MealReservationEntryModel} from "../../../models/meal-reservation/meal-reservation-entry.model";
import {MealReservationService} from "../../../services/meal-reservation/meal-reservation.service";
import { DetailActionsMenuComponent, ActionButton, NavigationControls } from '../../../shared-components/detail-actions-menu/detail-actions-menu.component';

@Component({
  selector: 'app-meal-reservation',
  templateUrl: './meal-reservation.component.html',
  styleUrl: './meal-reservation.component.scss',
  providers: [MessageService, ConfirmationService, {provide: LOCALE_ID, useValue: 'ar-SA'}]
})
export class MealReservationComponent implements OnInit {

  loadingSignal = signal<boolean>(false);
  get loading() {
    return this.loadingSignal()
  }
  set loading(value: boolean) {
    this.loadingSignal.set(value)
  }

  nationalities = nationalities.map(x => ({
    label: this.activeLanguage === 'en' ? x.englishName : x.arabicName,
    value: this.activeLanguage === 'en' ? x.englishName : x.arabicName
  }))
  mealReservationForm!: FormGroup;

  translate: TranslateService;
  activeLanguage: string = "en";



  reservationMealSignal = signal<ReservationMealModel[]>([])
  get reservationMeals(){
    return this.reservationMealSignal()
  }
  set reservationMeals(value){
    this.reservationMealSignal.set(value)
  }
  get reservationMealOptions (){
    return this.reservationMeals.map(x=>({
      label: this.activeLanguage === 'en' ? x.englishName : x.arabicName,
      value: x.id
    }))
  }

  customerProfilesSignal = signal<CustomerProfileModel[]>([])
  get customerProfiles(){
    return this.customerProfilesSignal()
  }
  set customerProfiles(value){
    this.customerProfilesSignal.set(value)
  }
  get customerProfilesOptions(){
    return this.customerProfiles.map(x => ({
      label: this.activeLanguage === 'en' ? x.englishName : x.arabicName,
      value: x.id
    }))
  }

  mealReservation: MealReservationModel;
  minDepartureDate!: string;
  salesAmountSignal = signal(0);
  get salesAmount (){
    return this.salesAmountSignal();
  }
  set salesAmount (value){
    this.salesAmountSignal.set(value);
  }
  costAmountSignal = signal(0);
  get costAmount (){
    return this.costAmountSignal();
  }
  set costAmount (value){
    this.costAmountSignal.set(value);
  }

  // Navigation controls for actions menu
  allMealReservationIds: string[] = [];
  currentIndex: number = -1;
  navigationControls: NavigationControls | undefined;
  customButtons: ActionButton[] = [];
  currentMealReservation: MealReservationModel = null;
  constructor(
    private salesClassService: MainSalesClassService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private translateService: TranslateService,
    public translationService: TranslationService,
    public reservationMealService : ReservationMealService,
    public mealReservationService : MealReservationService,
    public customerProfileService : CustomerProfileService,
    public router: Router,
    private route: ActivatedRoute,
    private sanitizer: DomSanitizer,
    private attachmentService: AttachmentService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {
    this.translate = translateService;
    this.activeLanguage = translationService.getSelectedLanguage();

    this.mealReservationForm = this.fb.group({
      id: [null],
      referenceNumber: [''],
      customerProfileId: [null, Validators.required],
    
      // 🟢 أضف الحقول الجديدة هنا
      customerReservationNumber: [''],
      description: [''],
      notes: [''],
    
      mealReservationEntries: this.fb.array([], Validators.required),
    });
    

    // Update minimum departure date when arrival date changes
    /*this.mealReservationForm.get('arrivalDate')?.valueChanges.subscribe((arrivalDate) => {
      if (arrivalDate) {
        const minDate = new Date(arrivalDate);
        minDate.setDate(minDate.getDate() + 1); // Add 1 day
        this.minDepartureDate = this.formatDate(minDate); // Format as yyyy-MM-dd

        // Automatically adjust departure date if it's before the new min date
        const departureDate = this.reservationForm.get('departureDate')?.value;
        if (departureDate && new Date(departureDate) < minDate) {
          this.reservationForm.get('departureDate')?.setValue(null); // Reset if invalid
        }
      } else {
        this.minDepartureDate = ''; // Clear min date if no arrival date
      }
    });*/


  }
  mealReservationId:string;
  isEditMode: boolean = false;

  ngOnInit(): void {

    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      this.mealReservationId = id;
      this.isEditMode = !!id;
      if (id) {
        this.getById(id);
        this.loadAllMealReservationIds();
      }
    });

    this.calculateTotals();

    // If totals depend on form changes, add a subscription to the form changes.
    this.mealReservationForm.valueChanges.subscribe(() => {
      this.calculateTotals();
    });

    this.loadData();
  }

  private wireEntryDateSubscriptions(entryGroup: FormGroup) {
    const arrivalCtrl = entryGroup.get('arrivalDate');
    const departureCtrl = entryGroup.get('departureDate');
    const nightsCtrl = entryGroup.get('numberOfNights');

    if (!arrivalCtrl || !departureCtrl || !nightsCtrl) return;

    // When arrival or departure changes -> update nights
    arrivalCtrl.valueChanges.subscribe((arrival) => {
      const departure = departureCtrl.value;
      if (arrival && departure) {
        const start = new Date(arrival);
        const end = new Date(departure);
        const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays !== nightsCtrl.value) {
          nightsCtrl.setValue(diffDays, { emitEvent: false });
        }
      }
    });
    departureCtrl.valueChanges.subscribe((departure) => {
      const arrival = arrivalCtrl.value;
      if (arrival && departure) {
        const start = new Date(arrival);
        const end = new Date(departure);
        const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays !== nightsCtrl.value) {
          nightsCtrl.setValue(diffDays, { emitEvent: false });
        }
      }
    });

    // When arrival or nights changes -> update departure
    const updateDeparture = () => {
      const arrival = arrivalCtrl.value;
      const nights = nightsCtrl.value;
      if (arrival && nights != null) {
        const start = new Date(arrival);
        const newDeparture = new Date(start);
        newDeparture.setDate(start.getDate() + Number(nights));
        const departureStr = formatDateOnlyToString(newDeparture);
        if (departureCtrl.value !== departureStr) {
          departureCtrl.setValue(departureStr, { emitEvent: false });
        }
      }
    };
    arrivalCtrl.valueChanges.subscribe(updateDeparture);
    nightsCtrl.valueChanges.subscribe(updateDeparture);

    // Disable price/cost until a meal is selected
    const mealCtrl = entryGroup.get('reservationMealId');
    const rateCtrl = entryGroup.get('mealRate');
    const costCtrl = entryGroup.get('mealCost');
    if (mealCtrl && rateCtrl && costCtrl) {
      const updatePricesEnabled = () => {
        const hasMeal = !!mealCtrl.value;
        if (hasMeal) {
          rateCtrl.enable({ emitEvent: false });
          costCtrl.enable({ emitEvent: false });
        } else {
          rateCtrl.disable({ emitEvent: false });
          costCtrl.disable({ emitEvent: false });
          rateCtrl.setValue(null, { emitEvent: false });
          costCtrl.setValue(null, { emitEvent: false });
        }
      };
      // initialize
      updatePricesEnabled();
      // react to changes
      mealCtrl.valueChanges.subscribe(updatePricesEnabled);
    }
  }


  getById(id: string): void {
    this.loading = true;
    this.mealReservationService.getById(id).subscribe({
      next: (res) => {
        this.mealReservation = res;
        this.currentMealReservation = res;

        // Populate the form with the retrieved data
        this.mealReservationForm.patchValue({
          id: res.id,
          referenceNumber: res.referenceNumber,
          customerProfileId: res.customerProfileId,
          customerReservationNumber: res.customerReservationNumber,
          description: res.description,
          notes: res.notes,
        },
          { emitEvent: true }
        );
        this.setMealReservationEntries(res.mealReservationEntries || []);
        
        // Setup navigation after loading
        this.setupCustomButtons();
        this.updateNavigationControls();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error fetching meal reservation', error);
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  get mealReservationEntries(): FormArray {
    return this.mealReservationForm.get('mealReservationEntries') as FormArray;
  }

  addMealReservationEntry(): void {
    const mealReservationEntry = this.fb.group({
      id: [null],
      arrivalDate: [null, Validators.required],
      departureDate: [null, Validators.required],
      numberOfNights: [null, Validators.required],
      reservationMealId: [null, Validators.required],
      numberOfPersons: [null, Validators.required],
      frees: [null, Validators.required],
      mealRate: [null, Validators.required],
      mealCost: [null, Validators.required],
      guestName: [null, Validators.required],
      nationality: [null, Validators.required],
      entringMeal: [null, Validators.required],
      exitingMeal: [null, Validators.required],
      mealReservationId: [null],
    });
    this.mealReservationEntries.push(mealReservationEntry);
    this.wireEntryDateSubscriptions(mealReservationEntry);
  }

  setMealReservationEntries(entries: MealReservationEntryModel[]): void {
    const mealReservationEntriesFormArray = this.mealReservationForm.get('mealReservationEntries') as FormArray;
    mealReservationEntriesFormArray.clear(); // Clear existing entries
    entries.forEach(entry => {
      const entryGroup = this.fb.group({
        id: [entry.id, Validators.required],
        arrivalDate: [entry.arrivalDate, Validators.required],
        departureDate: [entry.departureDate, Validators.required],
        numberOfNights: [entry.numberOfNights, Validators.required],
        reservationMealId: [entry.reservationMealId, Validators.required],
        numberOfPersons: [entry.numberOfPersons, Validators.required],
        frees: [entry.frees, Validators.required],
        mealRate: [entry.mealRate, Validators.required],
        mealCost: [entry.mealCost, Validators.required],
        guestName: [entry.guestName, Validators.required],
        nationality: [entry.nationality, Validators.required],
        entringMeal: [entry.entringMeal, Validators.required],
        exitingMeal: [entry.exitingMeal, Validators.required],
        mealReservationId: [entry.mealReservationId],
      });
      mealReservationEntriesFormArray.push(entryGroup);
      this.wireEntryDateSubscriptions(entryGroup);
    });
  }

  getMealReservationEntryTotalSalesPrice(mealReservationEntry: AbstractControl){
    const numberOfNights = mealReservationEntry.get('numberOfNights')?.value
    const mealRate = mealReservationEntry.get('mealRate')?.value

    const numberOfPersons = mealReservationEntry.get('numberOfPersons')?.value
    const frees = mealReservationEntry.get('frees')?.value ?? 0
    const totalPersonsAfterFrees = numberOfPersons - frees


    if (numberOfNights == null || mealRate == null || numberOfPersons == null ){
      return 0
    }
    return totalPersonsAfterFrees * numberOfNights * mealRate
  }

  getMealReservationEntryTotalCostPrice(mealReservationEntry: AbstractControl){
    const numberOfNights = mealReservationEntry.get('numberOfNights')?.value

    const numberOfPersons = mealReservationEntry.get('numberOfPersons')?.value
    const frees = mealReservationEntry.get('frees')?.value ?? 0
    const totalPersonsAfterFrees = numberOfPersons - frees

    const mealCost = mealReservationEntry.get('mealCost')?.value ?? 0

    if (numberOfNights == null || mealCost == null || numberOfPersons == null ){
      return 0
    }
    return totalPersonsAfterFrees * numberOfNights * mealCost
  }

  getMealReservationEntrySalesVatAmount(mealReservationEntry : AbstractControl)
  {
    const mealReservationEntryTotalSalesPrice = this.getMealReservationEntryTotalSalesPrice(mealReservationEntry)
    return Math.round(mealReservationEntryTotalSalesPrice * 0.15)
  }
  getMealReservationEntryCostVatAmount(mealReservationEntry : AbstractControl)
  {
    const mealReservationEntryTotalCostPrice = this.getMealReservationEntryTotalCostPrice(mealReservationEntry)
    return Math.round(mealReservationEntryTotalCostPrice * 0.15)
  }

  removeMealReservationEntry(index: number): void {
    this.mealReservationEntries.removeAt(index);
  }

  onSubmit(): void {
     if (this.mealReservationEntries.length === 0) {
    alert('Please add at least one meal reservation entry!');
    return;
  }
    if (this.mealReservationForm.valid) {
      const mealReservation: MealReservationModel = this.mealReservationForm.value;
      if (mealReservation.id){
        const mealReservationEntity = new MealReservationModel(mealReservation);
        mealReservationEntity.mealReservationEntries = mealReservation.mealReservationEntries.map(x => new MealReservationEntryModel({...x, mealReservationId: mealReservation.id}));
        this.mealReservationService.update(mealReservationEntity).subscribe({
          next: res => {
            this.router.navigate(['/meal-reservations/']);
          },
          error: error => {
            console.log('Error Saving Reservation', error);
            alert("ERROR")
          }
        });

      }else{
        const mealReservationEntity = new MealReservationModel(mealReservation);
        mealReservationEntity.mealReservationEntries = mealReservation.mealReservationEntries.map(x => new MealReservationEntryModel(x));
        this.mealReservationService. create(mealReservationEntity).subscribe({
          next: res => {
            this.router.navigate(['/meal-reservations/']);
          },
          error: error => {
            console.log('Error Saving Reservation', error);
            alert("ERROR")
          }
        });
      }
    } else {
      console.log('Form is invalid');
      this.mealReservationForm.markAllAsTouched();
    }
  }



  loadData(): void {
    this.loading = true;
    forkJoin({
      customerProfiles: this.customerProfileService.getAll(),
      reservationMeals: this.reservationMealService.getAll(),
    }).subscribe({
      next: (res) => {
        this.reservationMeals = res.reservationMeals || [];
        // Assign all results after ensuring data has loaded
        this.customerProfiles = (res.customerProfiles || [])
          .filter(x => x.mainAccountId != null);
        this.calculateTotals();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading data', err);
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }


  getMealReservationTotals() {
    let totalSalesPrice = 0
    this.mealReservationEntries.controls.map(x => {
      totalSalesPrice += this.getMealReservationEntryTotalSalesPrice(x)
    })
    let totalCostPrice = 0;
    this.mealReservationEntries.controls.map(x => {
      totalCostPrice += this.getMealReservationEntryTotalCostPrice(x)
    })
    return {
      totalSalesPrice: totalSalesPrice,
      totalCostPrice: totalCostPrice,
    };
  }


  calculateTotals(): void {
    const reservationMealTotals = this.getMealReservationTotals();

    this.salesAmount = reservationMealTotals.totalSalesPrice ;
    this.costAmount = reservationMealTotals.totalCostPrice ;
  }

   // Calculate departure date or number of nights based on inputs
   /*calculateDepartureDateOrNights(): void {
    const arrivalDate = this.reservationForm.get('arrivalDate')?.value;
    const numberOfNights = this.reservationForm.get('numberOfNights')?.value;

    if (arrivalDate && numberOfNights) {
      const arrival = new Date(arrivalDate);
      const departure = new Date(arrival.getTime() + numberOfNights * 24 * 60 * 60 * 1000); // Add days
      this.reservationForm.get('departureDate')?.setValue(this.formatDate(departure), { emitEvent: false });
    }
  }*/

  // Calculate number of nights based on arrival and departure dates
  /*calculateNumberOfNights(): void {
    const arrivalDate = this.reservationForm.get('arrivalDate')?.value;
    const departureDate = this.reservationForm.get('departureDate')?.value;

    if (arrivalDate && departureDate) {
      const arrival = new Date(arrivalDate);
      const departure = new Date(departureDate);
      const differenceInTime = departure.getTime() - arrival.getTime();
      const numberOfNights = Math.ceil(differenceInTime  / (1000 * 3600 * 24)); // Calculate days
      this.reservationForm.get('numberOfNights')?.setValue(numberOfNights, { emitEvent: false });
    }
  }*/

  // Calculate VAT (15%)
  calculateVAT(amount: number): number {
    return +(amount * 0.15).toFixed(2);
  }

  // Calculate Total (Amount + VAT)
  calculateTotal(amount: number): number {
    return +(amount + this.calculateVAT(amount)).toFixed(2);
  }

  // Calculate Profit Difference (Sales - Cost)
  calculateDifference(sales: number, cost: number): number {
    return +(sales - cost).toFixed(2);
  }


  // Format date to yyyy-MM-dd
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  getMinDepartureDate(detail: AbstractControl){
    const numberOfNights = this.mealReservationForm.get('numberOfNights')?.value
    const arrivalDate = this.mealReservationForm.get('arrivalDate')?.value
    if (arrivalDate && numberOfNights) {
      const arrival = new Date(arrivalDate);
      const departure = new Date(arrival.getTime() + numberOfNights * 24 * 60 * 60 * 1000); // Add days
      return this.formatDate(departure); // Format as yyyy-MM-dd
    }
    return ''
  }

  getFreesMax(detail: AbstractControl){
    const numberOfPersons = detail.get('numberOfPersons')?.value
    if (numberOfPersons) {
      return numberOfPersons - 1
    }
    return 0
  }
  getMealReservationEntryTotalPersonsAfterFrees(detail: AbstractControl){
    const numberOfPersons = detail.get('numberOfPersons')?.value
    const frees = detail.get('frees')?.value ?? 0
    if (numberOfPersons && frees) {
      return numberOfPersons - frees
    }
    return 0
  }


  /*get attachments(): AttachmentModel[] {
    return this.reservation?.attachments || [];
  }
  loadAttachments() {
    this.getById(this.reservationId)
  }


  deleteAttachment(attachmentId: string) {
    this.loading = true;
    this.attachmentService.delete(attachmentId).subscribe(res => {
      this.messageService.add({ severity: 'info', summary: this.translate.instant('FINANCE.CONFIRMED'), detail: this.translate.instant('FINANCE.ATTACHMENT_DELETED') });
      this.loadAttachments();
    });
  }

  viewDialogSignal = signal(false);
  get viewDialog() {
    return this.viewDialogSignal();
  }
  set viewDialog(value) {
    this.viewDialogSignal.set(value);
  }
  currentPdfUrlSignal = signal<SafeResourceUrl>(null);
  get currentPdfUrl() {
    return this.currentPdfUrlSignal();
  }
  set currentPdfUrl(value) {
    this.currentPdfUrlSignal.set(value);
  }


  onView(pdf: AttachmentModel) {
    this.attachmentService.downloadAttachment(pdf.id).subscribe(res => {
      // Decode the Base64 string into a binary array
      const byteCharacters = atob(res.fileData); // Decode Base64 to binary string
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i); // Get char codes
      }
      const byteArray = new Uint8Array(byteNumbers); // Convert to Uint8Array

      // Create a Blob from the byte array
      const blob = new Blob([byteArray], { type: pdf.fileType });
      const blobUrl = URL.createObjectURL(blob); // Create object URL
      this.currentPdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(blobUrl); // Sanitize URL

      this.viewDialog = true; // Open the dialog to view the PDF
    });
  }

  onUpdate(event: any,pdf: AttachmentModel) {
    const reservationId = this.route.snapshot.paramMap.get('id');
    if (!reservationId) return;
    const file = event.files[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'نوع الملف غير مدعوم',
      });
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64File = reader.result as string;
      const requestData = new AttachmentModel();
      requestData.file = base64File.split(',')[1];
      requestData.fileName = file.name;
      requestData.fileType = file.type;
      requestData.reservationId = reservationId;
      requestData.id = pdf.id;
      this.attachmentService.update(requestData).subscribe({
        next: (res) => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'File uploaded successfully.',
          });
          this.viewDialog = false;
          this.loadAttachments();
        },
        error: (err) => {
          console.error(err);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to upload file.',
          });
        },
      });
    };
    reader.readAsDataURL(file)
    reader.onerror = (error) => {
      console.error('FileReader error:', error);
    };
  }
  onDelete(pdf: AttachmentModel) {
    this.attachmentService.delete(pdf.id).subscribe({
      next: (res) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'File deleted successfully.',
        });
        this.loadAttachments();
      },
      error: (err) => {
        console.error(err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to delete file.',
        });
      },
    });
  }
  onFileSelected(event: any) {
    const reservationId = this.route.snapshot.paramMap.get('id');
    if (!reservationId) return;
    const file = event.files[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'نوع الملف غير مدعوم',
      });
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64File = reader.result as string;
      const requestData = new AttachmentModel();
      requestData.file = base64File.split(',')[1];
      requestData.fileName = file.name;
      requestData.fileType = file.type;
      requestData.reservationId = reservationId;
      this.attachmentService.create(requestData).subscribe({
        next: (res) => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'File uploaded successfully.',
          });
          this.loadAttachments();
        },
        error: (err) => {
          console.error(err);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to upload file.',
          });
        },
      });
    };
    reader.readAsDataURL(file); // Convert file to base64
    reader.onerror = (error) => {
      console.error('FileReader error:', error);
    };
  }*/

  // ============= Detail Actions Menu Handlers =============
  
  // Load all meal reservation IDs for navigation
  loadAllMealReservationIds(): void {
    this.mealReservationService.getAll().subscribe({
      next: (mealReservations) => {
        this.allMealReservationIds = mealReservations.map(reservation => reservation.id);
        this.updateNavigationControls();
      },
      error: (err) => {
        console.error('Error loading meal reservation IDs', err);
      }
    });
  }

  // Update navigation controls based on current position
  updateNavigationControls(): void {
    if (!this.mealReservationId || this.allMealReservationIds.length === 0) {
      this.navigationControls = undefined;
      return;
    }

    this.currentIndex = this.allMealReservationIds.indexOf(this.mealReservationId);
    
    if (this.currentIndex !== -1) {
      this.navigationControls = {
        currentPage: this.currentIndex + 1,
        totalPages: this.allMealReservationIds.length,
        onNext: () => this.navigateToNext(),
        onPrevious: () => this.navigateToPrevious()
      };
    }
  }

  // Navigate to next meal reservation
  navigateToNext(): void {
    if (this.currentIndex < this.allMealReservationIds.length - 1) {
      const nextId = this.allMealReservationIds[this.currentIndex + 1];
      this.router.navigate(['/meal-reservations', nextId]);
    }
  }

  // Navigate to previous meal reservation
  navigateToPrevious(): void {
    if (this.currentIndex > 0) {
      const prevId = this.allMealReservationIds[this.currentIndex - 1];
      this.router.navigate(['/meal-reservations', prevId]);
    }
  }

  // Delete action handler
  onDeleteClick(): void {
    this.confirmationService.confirm({
      message: this.translate.instant('DATA.CONFIRM_MEAL_RESERVATION_DELETE', {referenceNumber: this.currentMealReservation?.referenceNumber || this.mealReservationId}),
      header: this.translate.instant('DATA.MEAL_RESERVATION_DELETE_CONFIRMATION'),
      icon: 'pi pi-info-circle',
      acceptButtonStyleClass: "p-button-danger p-button-text rounded-md ",
      rejectButtonStyleClass: "p-button-text p-button-text rounded-md ",
      acceptIcon: "none",
      rejectIcon: "none",
      acceptLabel: this.translate.instant('FINANCE.YES'),
      rejectLabel: this.translate.instant('FINANCE.NO'),
      accept: () => {
        this.deleteMealReservation();
      },
    });
  }

  deleteMealReservation() {
    this.loading = true;
    this.mealReservationService.delete(this.mealReservationId).subscribe({
      next: () => {
        this.messageService.add({ 
          severity: 'info', 
          summary: this.translate.instant('FINANCE.CONFIRMED'), 
          detail: this.translate.instant('DATA.MEAL_RESERVATION_DELETED') 
        });
        this.router.navigate(['/meal-reservations']);
      },
      error: (err) => {
        this.messageService.add({ 
          severity: 'error', 
          summary: this.translate.instant('FINANCE.ERROR'), 
          detail: this.translate.instant('DATA.MEAL_RESERVATION_DELETION_ERROR') 
        });
        this.loading = false;
      }
    });
  }

  // Setup custom buttons
  setupCustomButtons(): void {
    this.customButtons = [];
    
    // Add "Payments" button (الدفعات)
    this.customButtons.push({
      label: 'PAYMENTS.ACTION_BUTTON',
      icon: 'pi pi-wallet',
      color: 'info',
      action: () => this.navigateToPayments(),
      visible: true
    });
  }

  // Navigate to Payments page
  navigateToPayments(): void {
    this.router.navigate(['/payments'], {
      queryParams: {
        invoiceId: this.mealReservationId,
        invoiceType: 4 // PaymentInvoiceType.MealReservation
      }
    });
  }

  // Save and Continue functionality
  saveAndContinue(): void {
    if (this.mealReservationEntries.length === 0) {
      this.messageService.add({ 
        severity: 'error', 
        summary: this.translate.instant('FINANCE.ERROR'), 
        detail: 'Please add at least one meal reservation entry!' 
      });
      return;
    }
    
    if (!this.mealReservationForm.valid) {
      this.messageService.add({ 
        severity: 'error', 
        summary: this.translate.instant('FINANCE.ERROR'), 
        detail: this.translate.instant('DATA.MEAL_RESERVATION_SAVING_ERROR') 
      });
      this.mealReservationForm.markAllAsTouched();
      return;
    }

    const mealReservation: MealReservationModel = this.mealReservationForm.value;
    const mealReservationEntity = new MealReservationModel(mealReservation);
    mealReservationEntity.mealReservationEntries = mealReservation.mealReservationEntries.map(x => new MealReservationEntryModel(x));
    
    this.mealReservationService.create(mealReservationEntity).subscribe({
      next: res => {
        this.messageService.add({ 
          severity: 'success', 
          summary: this.translate.instant('FINANCE.CONFIRMED'), 
          detail: this.translate.instant('DATA.MEAL_RESERVATION_CREATED') 
        });
        
        // Reset form for new entry
        this.resetFormForNewEntry();
      },
      error: error => {
        console.log('Error Saving Meal Reservation', error);
        this.messageService.add({ 
          severity: 'error', 
          summary: this.translate.instant('FINANCE.ERROR'), 
          detail: this.translate.instant('DATA.MEAL_RESERVATION_SAVING_ERROR') 
        });
      }
    });
  }

  // Reset form for creating a new entry
  resetFormForNewEntry(): void {
    this.mealReservationForm.reset({
      mealReservationEntries: []
    });
    
    // Clear the meal reservation entries form array
    const entriesArray = this.mealReservationForm.get('mealReservationEntries') as FormArray;
    entriesArray.clear();
    
    // Reset totals
    this.salesAmount = 0;
    this.costAmount = 0;
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}


