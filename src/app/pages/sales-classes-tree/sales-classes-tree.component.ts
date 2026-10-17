import { Component, signal , OnInit, OnChanges, SimpleChanges, Input, ChangeDetectorRef } from '@angular/core';
import { TreeNode} from 'primeng/api';
import { ClientProfileModel } from 'src/app/models/accounting/clientProfile.model';
import { DetailSalesClassModel } from 'src/app/models/sales-classes-tree/detailSalesClass.model';
import { HeaderSalesClassModel } from 'src/app/models/sales-classes-tree/headerSalesClass.model';
import { RootSalesClassModel } from 'src/app/models/sales-classes-tree/rootSalesClass.model';
import { MainSalesClassModel } from 'src/app/models/sales-classes-tree/mainSalesClass.model';
import { DetailSalesClassService } from 'src/app/services/sales-classes-tree/detail-sales-class.service';
import { HeaderSalesClassService } from 'src/app/services/sales-classes-tree/header-sales-class.service';
import { RootSalesClassService } from 'src/app/services/sales-classes-tree/root-sales-class.service';
import { MainSalesClassService } from 'src/app/services/sales-classes-tree/main-sales-class.service';
import {FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import { AuthService } from 'src/app/modules/auth';
import { UserAccountModel } from 'src/app/models/auth/userAccount.model';
import { PermissionModel } from 'src/app/models/auth/permission.model';
import { ConfirmationService, MessageService } from 'primeng/api';
import {TranslateModule, TranslateService} from "@ngx-translate/core";
import {TranslationService} from "../../modules/i18n";
import {IconDefinition} from "@fortawesome/fontawesome-svg-core";
import {UseFontAwesomeIconPackService} from "../../services/use-font-awesome-icon-pack.service";
import {FontAwesomeModule} from "@fortawesome/angular-fontawesome";
import {DividerModule} from "primeng/divider";
import {CommonModule} from "@angular/common";
import {TreeModule} from "primeng/tree";
import {ButtonModule} from "primeng/button";
import {DialogModule} from "primeng/dialog";
import {InputTextModule} from "primeng/inputtext";
import {InputTextareaModule} from "primeng/inputtextarea";
import {CardModule} from "primeng/card";
import {ConfirmDialogModule} from "primeng/confirmdialog";
import {TagModule} from "primeng/tag";
import {ToastModule} from "primeng/toast";
import {TableModule} from "primeng/table";
import {DropdownModule} from "primeng/dropdown";
import {MultiSelectModule} from "primeng/multiselect";
import {ProgressBarModule} from "primeng/progressbar";
import {InputNumberModule} from "primeng/inputnumber";
import {PaginatorModule} from "primeng/paginator";
import {OverlayPanelModule} from "primeng/overlaypanel";
import {CalendarModule} from "primeng/calendar";
import {PanelModule} from "primeng/panel";
import {
  FontAwesomeIconPickerComponent
} from "../../shared-components/font-awesome-icon-picker/font-awesome-icon-picker.component";
import {MeasurementUnitService} from "../../services/inventory/measurement-unit.service";
import {MeasurementUnitModel} from "../../models/inventory/measurementUnit.model";
import {InputSwitchModule} from "primeng/inputswitch";

enum SalesClasses {
  ROOT_SALES_CLASS,
  HEADER_SALES_CLASS,
  DETAIL_SALES_CLASS
}
@Component({
  selector: 'app-sales-classes-tree',
  templateUrl: './sales-classes-tree.component.html',
  styleUrl: './sales-classes-tree.component.scss',
  standalone: true,
  imports: [
    FontAwesomeModule,
    DividerModule,
    CommonModule,
    ReactiveFormsModule,
    TreeModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    InputTextareaModule,
    CardModule,
    ConfirmDialogModule,
    TagModule,
    ToastModule,
    TableModule,
    DropdownModule,
    MultiSelectModule,
    ProgressBarModule,
    InputNumberModule,
    TranslateModule,
    FormsModule,
    PaginatorModule,
    OverlayPanelModule,
    CalendarModule,
    PanelModule,
    FontAwesomeIconPickerComponent,
    InputSwitchModule
  ],
  providers: [ConfirmationService, MessageService]
})
export class SalesClassesTreeComponent implements OnInit {

  filesSignal = signal<TreeNode[]>([]);
  rootSalesClassVisible = false;
  headerSalesClassVisible = false;
  detailSalesClassVisible = false;
  mainSalesClassVisible = false;
  iconPack: IconDefinition[];

// =========================
// EXPERIMENT: Side Details Panel (instead of dialogs)
// =========================
  sidePanelVisible = false;

  selectedNodeType:
    | 'rootSalesClass'
    | 'headerSalesClass'
    | 'detailSalesClass'
    | 'mainSalesClass'
    | null = null;

  selectedNodeData: any = null;


  loadingSignal = signal(true);
  isSystemAdmin = false;
  showReservationItems = false;
  firstReservationRootId: string | null = null;

  classTypeOptions: Array<{ label: string, value: string }> = []
  get loading(): boolean {
    return this.loadingSignal();
  }

  set loading(value: boolean) {
    this.loadingSignal.set(value);
  }

  userPermissionsSignal = signal<PermissionModel[]>([]);

  get userPermissions(): PermissionModel[] {
    return this.userPermissionsSignal()
  }

  set userPermissions(permissions: PermissionModel[]) {
    this.userPermissionsSignal.set(permissions);
  }

  public hasPermission(permission: string): boolean {
    return this.authService.hasPermission(permission);
  }
openEditorFromNode(
  node: TreeNode,
  type: 'rootSalesClass' | 'headerSalesClass' | 'detailSalesClass' | 'mainSalesClass'
) {
  if (!this.hasPermission('MainSalesClass.Update')) {
    return;
  }
  this.selectedNodeType = type;
  this.selectedNodeData = node?.data ?? null;
  this.sidePanelVisible = true;

  switch (type) {
    case 'rootSalesClass':
      this.fillRootSalesForm(node.data as RootSalesClassModel);
      break;

    case 'headerSalesClass':
      this.fillHeaderSalesForm(node.data as HeaderSalesClassModel);
      break;

    case 'detailSalesClass':
      this.fillDetailSalesForm(node.data as DetailSalesClassModel);
      break;

    case 'mainSalesClass':
      this.fillMainSalesForm(node.data as MainSalesClassModel);
      break;
  }
}

private fillRootSalesForm(model: RootSalesClassModel | null) {
  this.rootSalesClassFormGroup.reset();
  if (!model) return;

  this.rootSalesClassFormGroup.patchValue({
    referenceCode: model.referenceCode,
    englishName: model.englishName,
    arabicName: model.arabicName,
    icon: model.icon,
    id: model.id
  });
}

private fillHeaderSalesForm(model: HeaderSalesClassModel | null) {
  this.headerSalesClassFormGroup.reset();
  if (!model) return;

  this.headerSalesClassFormGroup.patchValue({
    referenceCode: model.referenceCode,
    englishName: model.englishName,
    arabicName: model.arabicName,
    rootSalesClassId: model.rootSalesClassId,
    icon: model.icon,
    id: model.id
  });
}

private fillDetailSalesForm(model: DetailSalesClassModel | null) {
  this.detailSalesClassFormGroup.reset({ isForProjects: false });
  if (!model) return;

  this.detailSalesClassFormGroup.patchValue({
    referenceCode: model.referenceCode,
    englishName: model.englishName,
    arabicName: model.arabicName,
    headerSalesClassId: model.headerSalesClassId,
    icon: model.icon,
    isForProjects: model.isForProjects ?? false,
    id: model.id
  });
}

private fillMainSalesForm(model: MainSalesClassModel | null) {
  this.mainSalesClassFormGroup.reset();
  if (!model) return;

  this.mainSalesClassFormGroup.patchValue({
    referenceCode: model.referenceCode,
    englishName: model.englishName,
    arabicName: model.arabicName,
    detailSalesClassId: model.detailSalesClassId,
    measurementUnitId: model.measurementUnitId,
    isTaxExempted: model.isTaxExempted,
    classType: model.classType,
    icon: model.icon,
    id: model.id
  });
}

saveFromSidePanel() {
  if (!this.selectedNodeType) return;

  // ❌ ما تقفلش هنا — اقفل بعد success جوه save methods
  switch (this.selectedNodeType) {
    case 'rootSalesClass':
      this.saveRootSalesClass();
      break;
    case 'headerSalesClass':
      this.saveHeaderSalesClass();
      break;
    case 'detailSalesClass':
      this.saveDetailSalesClass();
      break;
    case 'mainSalesClass':
      this.saveMainSalesClass();
      break;
  }
}

cancelSidePanel() {
  this.closeSidePanel();
}

closeSidePanel() {
  this.sidePanelVisible = false;
  this.selectedNodeType = null;
  this.selectedNodeData = null;

  this.rootSalesClassFormGroup?.reset();
  this.headerSalesClassFormGroup?.reset();
  this.detailSalesClassFormGroup?.reset();
  this.mainSalesClassFormGroup?.reset();
}

showRootSalesClassDialog(rootSalesClass: RootSalesClassModel = null) {
  // بدل الدايالوج: افتح الـ side panel
  this.selectedNodeType = 'rootSalesClass';
  this.selectedNodeData = rootSalesClass;
  this.sidePanelVisible = true;

  if (rootSalesClass) {
    this.fillRootSalesForm(rootSalesClass);
  } else {
    this.rootSalesClassFormGroup.reset(); // add new
  }
}

closeRootSalesClassDialog() {
  this.rootSalesClassVisible = false;
  this.rootSalesClassFormGroup.reset();

  // اقفل side panel كمان
  this.closeSidePanel();
}

// ✅ Search term signal
private searchTermSignal = signal<string>('');

// ✅ تعرض للـ template: p-tree [value]="filteredFiles"
get filteredFiles(): TreeNode[] {
  const term = (this.searchTermSignal() || '').trim().toLowerCase();

  // لو مفيش بحث، اعرض الشجرة كاملة
  if (!term) return this.files;

  // فلترة الشجرة
  return this.filterTreeNodes(this.files, term);
}

// ✅ event handler من الـ input
onSearch(value: string): void {
  this.searchTermSignal.set(value ?? '');
}

/**
 * ✅ فلترة Recursive:
 * - يحتفظ بالـ node لو هو مطابق أو أي child مطابق
 * - يوسّع المسار لما يكون فيه نتائج (expanded=true) علشان النتائج تبقى ظاهرة
 */
private filterTreeNodes(nodes: TreeNode[] | undefined, term: string): TreeNode[] {
  if (!nodes?.length) return [];

  const result: TreeNode[] = [];

  for (const node of nodes) {
    const matches = this.nodeMatchesTerm(node, term);
    const filteredChildren = this.filterTreeNodes(node.children, term);

    if (matches || filteredChildren.length > 0) {
      result.push({
        ...node,
        children: filteredChildren.length ? filteredChildren : node.children,
        expanded: filteredChildren.length > 0 ? true : node.expanded
      });
    }
  }

  return result;
}

private nodeMatchesTerm(node: TreeNode, term: string): boolean {
  const data: any = node?.data ?? {};

  // ابحث في:
  // - englishName
  // - arabicName
  // - referenceCode
  // - label
  const haystack = [
    node?.label,
    data?.englishName,
    data?.arabicName,
    data?.referenceCode
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return haystack.includes(term);
}

 showHeaderSalesClassDialog(rootSalesClass?: RootSalesClassModel, headerSalesClass: HeaderSalesClassModel = null) {
  this.selectedNodeType = 'headerSalesClass';
  this.selectedNodeData = headerSalesClass ?? rootSalesClass ?? null;
  this.sidePanelVisible = true;

  if (headerSalesClass) {
    this.fillHeaderSalesForm(headerSalesClass);
  } else if (rootSalesClass) {
    this.headerSalesClassFormGroup.reset();
    this.headerSalesClassFormGroup.controls.rootSalesClassId.setValue(rootSalesClass.id);
  }
}

closeHeaderSalesClassDialog() {
  this.headerSalesClassVisible = false;
  this.headerSalesClassFormGroup.reset();

  this.closeSidePanel();
}


 showDetailSalesClassDialog(headerSalesClass?: HeaderSalesClassModel, detailSalesClass: DetailSalesClassModel = null) {
  this.selectedNodeType = 'detailSalesClass';
  this.selectedNodeData = detailSalesClass ?? headerSalesClass ?? null;
  this.sidePanelVisible = true;

  if (detailSalesClass) {
    this.fillDetailSalesForm(detailSalesClass);
  } else if (headerSalesClass) {
    this.detailSalesClassFormGroup.reset({ isForProjects: false });
    this.detailSalesClassFormGroup.controls.headerSalesClassId.setValue(headerSalesClass.id);
  }
}

closeDetailSalesClassDialog() {
  this.detailSalesClassVisible = false;
  this.detailSalesClassFormGroup.reset({ isForProjects: false });

  this.closeSidePanel();
}


  showMainSalesClassDialog(detailSalesClass?: DetailSalesClassModel, mainSalesClass: MainSalesClassModel = null) {
  this.selectedNodeType = 'mainSalesClass';
  this.selectedNodeData = mainSalesClass ?? detailSalesClass ?? null;
  this.sidePanelVisible = true;

  if (mainSalesClass) {
    this.fillMainSalesForm(mainSalesClass);
  } else if (detailSalesClass) {
    this.mainSalesClassFormGroup.reset();
    this.mainSalesClassFormGroup.controls.detailSalesClassId.setValue(detailSalesClass.id);
    // defaults
    this.mainSalesClassFormGroup.controls.classType.setValue('Direct');
    this.mainSalesClassFormGroup.controls.isTaxExempted.setValue(false);
  }
}

closeMainSalesClassDialog() {
  this.mainSalesClassVisible = false;
  this.mainSalesClassFormGroup.reset();

  this.closeSidePanel();
}


  rootSalesClassFormGroup: FormGroup;
  headerSalesClassFormGroup: FormGroup;
  detailSalesClassFormGroup: FormGroup;
  mainSalesClassFormGroup: FormGroup;
  rootSalesClassesSignal = signal<RootSalesClassModel[]>([]);
  headerSalesClassesSignal = signal<HeaderSalesClassModel[]>([]);
  detailSalesClassesSignal = signal<DetailSalesClassModel[]>([]);
  mainSalesClassesSignal = signal<MainSalesClassModel[]>([]);
  clientProfilesSignal = signal<ClientProfileModel[]>([]);

  get isEditing(): boolean {
    if (this.selectedNodeType === 'rootSalesClass') {
      return !!this.rootSalesClassFormGroup?.value?.id;
    }
    if (this.selectedNodeType === 'headerSalesClass') {
      return !!this.headerSalesClassFormGroup?.value?.id;
    }
    if (this.selectedNodeType === 'detailSalesClass') {
      return !!this.detailSalesClassFormGroup?.value?.id;
    }
    if (this.selectedNodeType === 'mainSalesClass') {
      return !!this.mainSalesClassFormGroup?.value?.id;
    }
    return false;
  }

  get files(): TreeNode[] {
    return this.filesSignal();
  }

  set files(value: TreeNode[]) {
    this.filesSignal.set(value);
  }

  get rootSalesClasses(): RootSalesClassModel[] {
    return this.rootSalesClassesSignal();
  }

  set rootSalesClasses(value: RootSalesClassModel[]) {
    this.rootSalesClassesSignal.set(value);
  }

  get headerSalesClasses(): HeaderSalesClassModel[] {
    return this.headerSalesClassesSignal();
  }

  set headerSalesClasses(value: HeaderSalesClassModel[]) {
    this.headerSalesClassesSignal.set(value);
  }

  get detailSalesClasses(): DetailSalesClassModel[] {
    return this.detailSalesClassesSignal();
  }

  set detailSalesClasses(value: DetailSalesClassModel[]) {
    this.detailSalesClassesSignal.set(value);
  }

  get mainSalesClasses(): MainSalesClassModel[] {
    return this.mainSalesClassesSignal();
  }

  set mainSalesClasses(value: MainSalesClassModel[]) {
    this.mainSalesClassesSignal.set(value);
  }

  get clientProfiles(): ClientProfileModel[] {
    return this.clientProfilesSignal();
  }

  set clientProfiles(value: ClientProfileModel[]) {
    this.clientProfilesSignal.set(value);
  }

  public activeLanguage: string = 'en';
  theme = localStorage.getItem('kt_theme_mode_value') || 'light';
  public translate: TranslateService;
  public mode = localStorage.getItem('kt_theme_mode_value') || 'light';

  constructor(private rootSalesClassService: RootSalesClassService,
              private headerSalesClassService: HeaderSalesClassService,
              private detailSalesClassService: DetailSalesClassService,
              private mainSalesClassService: MainSalesClassService,
              private fb: FormBuilder,
              private authService: AuthService,
              private confirmationService: ConfirmationService,
              private messageService: MessageService,
              private translateService: TranslateService,
              public translationService: TranslationService,
              private iconPackService: UseFontAwesomeIconPackService,
              private measurementUnitService: MeasurementUnitService,
              private cdr: ChangeDetectorRef
  ) {
    this.iconPack = this.iconPackService.getIconPack();
    this.translate = translateService;
    this.classTypeOptions = [
      {
        label: this.translate.instant('DATA.DIRECT'),
        value: 'Direct'
      },
      {
        label: this.translate.instant('DATA.COMPOUND'),
        value: 'Compound'
      }
    ]
    this.activeLanguage = translationService.getSelectedLanguage();
    this.authService.getUserByToken().subscribe(
      (res: UserAccountModel) => {
        if (res) {
          this.userPermissions = res.userRoles.map(ur => ur.role.rolePermissions.map(rp => rp.permission))
            .reduce((acc, val) => acc.concat(val), []);
          this.isSystemAdmin = res.userName === 'developer' || res.userRoles?.some(ur => 
            ur.role?.name === 'System.Developer'
          );
        }
      }
    );
  }


  ngOnInit(): void {
    this.loading = true;
    this.loadData();
    this.loadMeasurementUnit();

    this.rootSalesClassFormGroup = this.fb.group({
      referenceCode: ['', Validators.maxLength(500)],
      icon: [''],
      englishName: ['', [Validators.required, Validators.maxLength(500)]],
      arabicName: ['', [Validators.required, Validators.maxLength(500)]],
      id: ['']
    });

    this.headerSalesClassFormGroup = this.fb.group({
      referenceCode: ['', Validators.maxLength(500)],
      icon: [''],
      englishName: ['', [Validators.required, Validators.maxLength(500)]],
      arabicName: ['', [Validators.required, Validators.maxLength(500)]],
      rootSalesClassId: [''],
      id: ['']
    });

    this.detailSalesClassFormGroup = this.fb.group({
      referenceCode: ['', Validators.maxLength(500)],
      icon: [''],
      englishName: ['', [Validators.required, Validators.maxLength(500)]],
      arabicName: ['', [Validators.required, Validators.maxLength(500)]],
      headerSalesClassId: [''],
      isForProjects: [false],
      id: ['']
    });

    this.mainSalesClassFormGroup = this.fb.group({
      measurementUnitId: ['', Validators.required],
      isTaxExempted: [false],
      referenceCode: ['', Validators.maxLength(500)],
      icon: [''],
      englishName: ['', [Validators.required, Validators.maxLength(500)]],
      arabicName: ['', [Validators.required, Validators.maxLength(500)]],
      detailSalesClassId: [''],
      classType: ['Direct', Validators.required],
      id: ['']
    });
  }


  loadTree(rootSalesClasses: RootSalesClassModel[]) {
    // Precompute styles
    const rootStyleClass =
      `rounded-sm px-1 py-0 my-0 ${this.mode === 'dark'
        ? 'bg-sky-600 text-black'
        : 'bg-sky-400 text-white'}`;

    const headerStyleClass =
      `rounded-sm px-1 py-0 my-0.5 ${this.mode === 'dark'
        ? 'bg-sky-700 text-white'
        : 'bg-white text-black'}`;

    const detailStyleClass =
      `rounded-sm px-1 py-0 my-0.5 ${this.mode === 'dark'
        ? 'bg-sky-800 text-white'
        : 'bg-white text-black'}`;

    const mainSalesClassStyleClass =
      `rounded-sm px-1 py-0 my-0.5 ${this.mode === 'dark'
        ? 'bg-sky-900 text-white'
        : 'bg-gray-200 text-black'}`;

    const files: TreeNode[] = [];

    for (let i = 0; i < rootSalesClasses.length; i++) {
      const rootSalesClass = rootSalesClasses[i];
      const headerSalesClasses = rootSalesClass.headerSalesClasses || [];
      const rootChildren: TreeNode[] = [];

      for (let j = 0; j < headerSalesClasses.length; j++) {
        const headerSalesClass = headerSalesClasses[j];
        const detailSalesClasses = headerSalesClass.detailSalesClasses || [];
        const headerChildren: TreeNode[] = [];

        for (let k = 0; k < detailSalesClasses.length; k++) {
          const detailSalesClass = detailSalesClasses[k];
          let mainSalesClasses = detailSalesClass.mainSalesClasses || [];
          const originalCount = mainSalesClasses.length;

          if (!this.showReservationItems) {
            mainSalesClasses = mainSalesClasses.filter(m => !m.isReservationItem);
          } else {
            if (!this.firstReservationRootId && mainSalesClasses.some(m => m.isReservationItem)) {
              this.firstReservationRootId = rootSalesClass.id;
            }
          }

          // If the detail node originally had main sales classes, but now has 0 after filtering, hide it.
          if (originalCount > 0 && mainSalesClasses.length === 0) {
            continue;
          }

          const detailChildren: TreeNode[] = [];
          for (let l = 0; l < mainSalesClasses.length; l++) {
            const mainSalesClass = mainSalesClasses[l];
            detailChildren.push({
              label: mainSalesClass.englishName,
              expanded: false,
              type: 'mainSalesClass',
              styleClass: mainSalesClassStyleClass,
              data: mainSalesClass,
            });
          }

          headerChildren.push({
            label: detailSalesClass.englishName,
            expanded: false,
            type: 'detailSalesClass',
            styleClass: detailStyleClass,
            data: detailSalesClass,
            children: detailChildren,
          });
        }

        // If the header node originally had detail classes, but now has 0 after filtering, hide it.
        const originalDetailCount = detailSalesClasses.length;
        if (originalDetailCount > 0 && headerChildren.length === 0) {
          continue;
        }

        rootChildren.push({
          label: headerSalesClass.englishName,
          expanded: true,
          type: 'headerSalesClass',
          data: headerSalesClass,
          styleClass: headerStyleClass,
          children: headerChildren,
        });
      }

      // If the root node originally had header classes, but now has 0 after filtering, hide it.
      const originalHeaderCount = headerSalesClasses.length;
      if (originalHeaderCount > 0 && rootChildren.length === 0) {
        continue;
      }

      files.push({
        type: 'rootSalesClass',
        styleClass: rootStyleClass,
        label: rootSalesClass.englishName,
        expanded: true,
        data: rootSalesClass,
        children: rootChildren,
      });
    }

    this.files = files;
  }
  private setExpandedForAll(nodes: TreeNode[] | undefined, value: boolean) {
    if (!nodes) return;
    for (const node of nodes) {
      node.expanded = value;
      if (node.children?.length) {
        this.setExpandedForAll(node.children, value);
      }
    }
  }
  shiftLastDropdownPanelLeft(px: number = 40) {
    // ندي PrimeNG وقت يرسم الـ overlay ويحط position
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const panels = Array.from(document.querySelectorAll('.p-dropdown-panel')) as HTMLElement[];
        if (!panels.length) return;

        const panel = panels[panels.length - 1]; // آخر panel اتفتح

        // 1) لو PrimeNG حاطط left مباشرة
        const leftStr = panel.style.left || getComputedStyle(panel).left;
        const left = parseFloat(leftStr || '0');
        if (!Number.isNaN(left) && leftStr && leftStr !== 'auto') {
          panel.style.left = (left - px) + 'px';
          return;
        }

        // 2) لو PrimeNG بيستخدم transform: translate3d(x, y, 0)
        const tr = panel.style.transform || getComputedStyle(panel).transform;
        if (!tr || tr === 'none') {
          // fallback: نزقها بـ translateX
          panel.style.transform = `translateX(${-px}px)`;
          return;
        }

        // matrix(a,b,c,d,tx,ty) => tx هو الإزاحة الأفقية
        if (tr.startsWith('matrix(')) {
          const nums = tr.replace('matrix(', '').replace(')', '').split(',').map(x => parseFloat(x.trim()));
          if (nums.length === 6) {
            const tx = nums[4] || 0;
            const ty = nums[5] || 0;
            panel.style.transform = `translate(${tx - px}px, ${ty}px)`;
            return;
          }
        }

        // translate3d(xpx, ypx, 0px)
        const m3 = tr.match(/translate3d\(\s*([-\d.]+)px,\s*([-\d.]+)px,\s*([-\d.]+)px\s*\)/);
        if (m3) {
          const x = parseFloat(m3[1]);
          const y = parseFloat(m3[2]);
          panel.style.transform = `translate3d(${x - px}px, ${y}px, 0px)`;
          return;
        }

        // translate(xpx, ypx)
        const m2 = tr.match(/translate\(\s*([-\d.]+)px,\s*([-\d.]+)px\s*\)/);
        if (m2) {
          const x = parseFloat(m2[1]);
          const y = parseFloat(m2[2]);
          panel.style.transform = `translate(${x - px}px, ${y}px)`;
          return;
        }

        // fallback نهائي
        panel.style.transform = `translateX(${-px}px)`;
      });
    });
  }

  expandAll(): void {
    // عدّل نفس العناصر ثم اعمل shallow clone للمصفوفة لتحديث الـ signal
    this.setExpandedForAll(this.files, true);
    this.files = [...this.files];
  }
  
  collapseAll(): void {
    this.setExpandedForAll(this.files, false);
    this.files = [...this.files];
  }
  
  
  loadData() {
    this.loading = true;
    this.rootSalesClassService.getAll().subscribe({
      next: res => {
        this.rootSalesClasses = res;
        this.loadTree(res);
        this.loading = false;
      },
        error: error => {
          console.log('Error Loading Data', error);
          this.messageService.add({
            severity: 'error',
            summary: this.translate.instant('FINANCE.ERROR'),
            detail: this.translate.instant('FINANCE.DATA_LOADING_ERROR')
          });
          this.loading = false;
        }
    });
  }

  toggleReservationItems() {
    this.showReservationItems = !this.showReservationItems;
    if (this.rootSalesClasses) {
      this.firstReservationRootId = null;
      this.loadTree(this.rootSalesClasses);
      if (this.showReservationItems && this.firstReservationRootId) {
        this.cdr.detectChanges(); // Force angular to render the nodes first
        setTimeout(() => {
          const container = document.querySelector('.tree-col');
          const el = document.getElementById('root-' + this.firstReservationRootId);
          if (container && el) {
            const containerRect = container.getBoundingClientRect();
            const elRect = el.getBoundingClientRect();
            const relativeTop = elRect.top - containerRect.top + container.scrollTop;
            const targetScrollTop = relativeTop - (containerRect.height / 2) + (elRect.height / 2);
            container.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
          }
        }, 500);
      }
    }
  }


  deleteRootSalesClass(rootSalesClass: RootSalesClassModel) {
    this.loading = true;
    this.rootSalesClassService.delete(rootSalesClass.id).subscribe({
      next: res => {
        this.messageService.add({
          severity: 'info',
          summary: this.translate.instant('FINANCE.CONFIRMED'),
          detail: this.translate.instant('FINANCE.ROOT_SALES_CLASS_DELETED')
        });
        this.loadData();
      },
      error: error => {
        console.log('Error Deleting Root SalesClass', error);
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail: this.translate.instant('FINANCE.ROOT_SALES_CLASS_DELETING_ERROR')
        });
        this.loading = false;
      }
    });
  }

  deleteHeaderSalesClass(headerSalesClass: HeaderSalesClassModel) {
    this.headerSalesClassService.delete(headerSalesClass.id).subscribe({
      next: res => {
        this.messageService.add({
          severity: 'info',
          summary: this.translate.instant('FINANCE.CONFIRMED'),
          detail: this.translate.instant('FINANCE.HEADER_SALES_CLASS_DELETED')
        });
        this.loadData();
      },
      error: error => {
        console.log('Error Deleting Header SalesClass', error);
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail: this.translate.instant('FINANCE.HEADER_SALES_CLASS_DELETING_ERROR')
        });
      }
    });
  }

  deleteDetailSalesClass(detailSalesClass: DetailSalesClassModel) {
    this.detailSalesClassService.delete(detailSalesClass.id).subscribe({
      next: res => {
        this.messageService.add({
          severity: 'info',
          summary: this.translate.instant('FINANCE.CONFIRMED'),
          detail: this.translate.instant('FINANCE.DETAIL_SALES_CLASS_DELETED')
        });
        this.loadData();
      },
      error: error => {
        console.log('Error Deleting Detail SalesClass', error);
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail: this.translate.instant('FINANCE.DETAIL_SALES_CLASS_DELETING_ERROR')
        });
      }
    });
  }

  deleteMainSalesClass(mainSalesClass: MainSalesClassModel) {
    this.mainSalesClassService.delete(mainSalesClass.id).subscribe({
      next: res => {
        this.messageService.add({
          severity: 'info',
          summary: this.translate.instant('FINANCE.CONFIRMED'),
          detail: this.translate.instant('FINANCE.MAIN_SALES_CLASS_DELETED')
        });
        this.loadData();
      },
      error: error => {
        console.log('Error Deleting Main SalesClass', error);
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail: this.translate.instant('FINANCE.MAIN_SALES_CLASS_DELETING_ERROR')
        });
      }
    });
  }

  saveRootSalesClass() {
    if (this.rootSalesClassFormGroup.invalid) {
      return;
    }
    const rootSalesClassValues = this.rootSalesClassFormGroup.value;

    if (rootSalesClassValues.id) {
      const rootSalesClass = new RootSalesClassModel();
      rootSalesClass.referenceCode = rootSalesClassValues.referenceCode;
      rootSalesClass.englishName = rootSalesClassValues.englishName;
      rootSalesClass.arabicName = rootSalesClassValues.arabicName;
      rootSalesClass.id = rootSalesClassValues.id;
      rootSalesClass.icon = rootSalesClassValues.icon;

      this.rootSalesClassService.update(rootSalesClass).subscribe({
        next: res => {
          this.closeRootSalesClassDialog();
          this.messageService.add({
            severity: 'success',
            summary: this.translate.instant('FINANCE.SUCCESS'),
            detail: this.translate.instant('FINANCE.ROOT_SALES_CLASS_UPDATED')
          });
          this.loadData();
        },
        error: error => this.showSalesClassError(error, 'FINANCE.ROOT_SALES_CLASS_UPDATING_ERROR')
      });
    } else {
      const rootSalesClass = new RootSalesClassModel();
      rootSalesClass.referenceCode = rootSalesClassValues.referenceCode;
      rootSalesClass.englishName = rootSalesClassValues.englishName;
      rootSalesClass.arabicName = rootSalesClassValues.arabicName;

      this.rootSalesClassService.create(rootSalesClass).subscribe({
        next: res => {
          this.closeRootSalesClassDialog();
          this.messageService.add({
            severity: 'success',
            summary: this.translate.instant('FINANCE.SUCCESS'),
            detail: this.translate.instant('FINANCE.ROOT_SALES_CLASS_SAVED')
          });
          this.loadData();
        },
        error: error => this.showSalesClassError(error, 'FINANCE.ROOT_SALES_CLASS_SAVING_ERROR')
      });
    }
  }

  saveHeaderSalesClass() {
    if (this.headerSalesClassFormGroup.invalid) {
      return;
    }
    const headerSalesClassValues = this.headerSalesClassFormGroup.value;

    if (headerSalesClassValues.id) {
      const headerSalesClass = new HeaderSalesClassModel();
      headerSalesClass.referenceCode = headerSalesClassValues.referenceCode;
      headerSalesClass.englishName = headerSalesClassValues.englishName;
      headerSalesClass.arabicName = headerSalesClassValues.arabicName;
      headerSalesClass.rootSalesClassId = headerSalesClassValues.rootSalesClassId;
      headerSalesClass.id = headerSalesClassValues.id;
      headerSalesClass.icon = headerSalesClassValues.icon;

      this.headerSalesClassService.update(headerSalesClass).subscribe({
        next: res => {
          this.closeHeaderSalesClassDialog();
          this.messageService.add({
            severity: 'success',
            summary: this.translate.instant('FINANCE.SUCCESS'),
            detail: this.translate.instant('FINANCE.HEADER_SALES_CLASS_UPDATED')
          });
          this.loadData();
        },
        error: error => this.showSalesClassError(error, 'FINANCE.HEADER_SALES_CLASS_UPDATING_ERROR')
      });
    } else {
      const headerSalesClass = new HeaderSalesClassModel();
      headerSalesClass.referenceCode = headerSalesClassValues.referenceCode;
      headerSalesClass.englishName = headerSalesClassValues.englishName;
      headerSalesClass.arabicName = headerSalesClassValues.arabicName;
      headerSalesClass.rootSalesClassId = headerSalesClassValues.rootSalesClassId;

      this.headerSalesClassService.create(headerSalesClass).subscribe({
        next: res => {
          this.closeHeaderSalesClassDialog();
          this.messageService.add({
            severity: 'success',
            summary: this.translate.instant('FINANCE.SUCCESS'),
            detail: this.translate.instant('FINANCE.HEADER_SALES_CLASS_SAVED')
          });
          this.loadData();
        },
        error: error => this.showSalesClassError(error, 'FINANCE.HEADER_SALES_CLASS_SAVING_ERROR')
      });
    }
  }

  saveDetailSalesClass() {
    if (this.detailSalesClassFormGroup.invalid) {
      return;
    }
    const detailSalesClassValues = this.detailSalesClassFormGroup.value;

    if (detailSalesClassValues.id) {
      const detailSalesClass = new DetailSalesClassModel();
      detailSalesClass.referenceCode = detailSalesClassValues.referenceCode;
      detailSalesClass.englishName = detailSalesClassValues.englishName;
      detailSalesClass.arabicName = detailSalesClassValues.arabicName;
      detailSalesClass.headerSalesClassId = detailSalesClassValues.headerSalesClassId;
      detailSalesClass.id = detailSalesClassValues.id;
      detailSalesClass.icon = detailSalesClassValues.icon;
      detailSalesClass.isForProjects = detailSalesClassValues.isForProjects;

      this.detailSalesClassService.update(detailSalesClass).subscribe({
        next: res => {
          this.closeDetailSalesClassDialog();
          this.messageService.add({
            severity: 'success',
            summary: this.translate.instant('FINANCE.SUCCESS'),
            detail: this.translate.instant('FINANCE.DETAIL_SALES_CLASS_UPDATED')
          });
          this.loadData();
        },
        error: error => this.showSalesClassError(error, 'FINANCE.DETAIL_SALES_CLASS_UPDATING_ERROR')
      });
    } else {
      const detailSalesClass = new DetailSalesClassModel();
      detailSalesClass.referenceCode = detailSalesClassValues.referenceCode;
      detailSalesClass.englishName = detailSalesClassValues.englishName;
      detailSalesClass.arabicName = detailSalesClassValues.arabicName;
      detailSalesClass.headerSalesClassId = detailSalesClassValues.headerSalesClassId;
      detailSalesClass.isForProjects = detailSalesClassValues.isForProjects ?? false;

      this.detailSalesClassService.create(detailSalesClass).subscribe({
        next: res => {
          this.closeDetailSalesClassDialog();
          this.messageService.add({
            severity: 'success',
            summary: this.translate.instant('FINANCE.SUCCESS'),
            detail: this.translate.instant('FINANCE.DETAIL_SALES_CLASS_SAVED')
          });
          this.loadData();
        },
        error: error => this.showSalesClassError(error, 'FINANCE.DETAIL_SALES_CLASS_SAVING_ERROR')
      });
    }
  }

  private getErrorMessage(error: any): string {
    if (!error) return '';
    if (typeof error === 'string') return error;
    if (typeof error?.error === 'string') return error.error;
    
    const e = error?.error || error;
    if (e && typeof e === 'object') {
      if (typeof e.message === 'string' && e.message) return e.message;
      if (typeof e.title === 'string' && e.title) return e.title;
      if (typeof e.error === 'string' && e.error) return e.error;
      if (Array.isArray(e.errors)) return e.errors.join(', ');
      if (e.errors && typeof e.errors === 'object') {
        const flattened = Object.values(e.errors).flat().filter(Boolean);
        if (flattened.length) return flattened.join(', ');
      }
    }
    
    return error?.message || error?.statusText || '';
  }

  private showSalesClassError(error: any, defaultKey: string) {
    console.error('SalesClass Operation Error:', error);
    const rawMessage = this.getErrorMessage(error);

    let detail = '';
    if (rawMessage === "ReferenceCode already exists") {
      detail = this.translate.instant('FINANCE.REFERENCE_CODE_ALREADY_EXISTS');
    } else if (rawMessage === "ArabicName already exists") {
      detail = this.translate.instant('FINANCE.ARABIC_NAME_ALREADY_EXISTS');
    } else if (rawMessage === "EnglishName already exists") {
      detail = this.translate.instant('FINANCE.ENGLISH_NAME_ALREADY_EXISTS');
    } else {
      detail = rawMessage || this.translate.instant(defaultKey);
    }

    this.messageService.add({
      severity: 'error',
      summary: this.translate.instant('FINANCE.ERROR'),
      detail: detail,
      life: 5000
    });
  }

  saveMainSalesClass() {
    if (this.mainSalesClassFormGroup.invalid) {
      return;
    }
    const mainSalesClassValues = this.mainSalesClassFormGroup.value;

    if (mainSalesClassValues.id) {
      const mainSalesClass = new MainSalesClassModel();
      mainSalesClass.referenceCode = mainSalesClassValues.referenceCode;
      mainSalesClass.englishName = mainSalesClassValues.englishName;
      mainSalesClass.arabicName = mainSalesClassValues.arabicName;
      mainSalesClass.detailSalesClassId = mainSalesClassValues.detailSalesClassId;
      mainSalesClass.id = mainSalesClassValues.id;
      mainSalesClass.measurementUnitId = mainSalesClassValues.measurementUnitId;
      mainSalesClass.isTaxExempted = mainSalesClassValues.isTaxExempted;
      mainSalesClass.icon = mainSalesClassValues.icon;
      mainSalesClass.classType = mainSalesClassValues.classType;

      this.mainSalesClassService.update(mainSalesClass).subscribe({
        next: res => {
          this.closeMainSalesClassDialog();
          this.messageService.add({
            severity: 'success',
            summary: this.translate.instant('FINANCE.SUCCESS'),
            detail: this.translate.instant('FINANCE.MAIN_SALES_CLASS_UPDATED')
          });
          this.loadData();
        },
        error: error => this.showSalesClassError(error, 'FINANCE.MAIN_SALES_CLASS_UPDATING_ERROR')
      });
    } else {
      const mainSalesClass = new MainSalesClassModel();
      mainSalesClass.referenceCode = mainSalesClassValues.referenceCode;
      mainSalesClass.englishName = mainSalesClassValues.englishName;
      mainSalesClass.arabicName = mainSalesClassValues.arabicName;
      mainSalesClass.detailSalesClassId = mainSalesClassValues.detailSalesClassId;
      mainSalesClass.measurementUnitId = mainSalesClassValues.measurementUnitId;
      mainSalesClass.isTaxExempted = mainSalesClassValues.isTaxExempted;
      mainSalesClass.classType = mainSalesClassValues.classType;

      this.mainSalesClassService.create(mainSalesClass).subscribe({
        next: res => {
          this.closeMainSalesClassDialog();
          this.messageService.add({
            severity: 'success',
            summary: this.translate.instant('FINANCE.SUCCESS'),
            detail: this.translate.instant('FINANCE.MAIN_SALES_CLASS_SAVED')
          });
          this.loadData();
        },
        error: error => this.showSalesClassError(error, 'FINANCE.MAIN_SALES_CLASS_SAVING_ERROR')
      });
    }
  }

  confirmRootSalesClassDeletion(event: Event, rootSalesClass: RootSalesClassModel) {
    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: this.translate.instant('FINANCE.CONFIRM_ROOT_SALES_CLASS_DELETE', {rootSalesClassName: this.activeLanguage === 'en' ? rootSalesClass.englishName : rootSalesClass.arabicName}),
      header: this.translate.instant('FINANCE.ROOT_SALES_CLASS_DELETE_CONFIRMATION'),
      icon: 'pi pi-info-circle',
      acceptButtonStyleClass: "p-button-danger p-button-text rounded-md ",
      rejectButtonStyleClass: "p-button-text p-button-text rounded-md ",
      acceptIcon: "none",
      rejectIcon: "none",
      acceptLabel: this.translate.instant('FINANCE.YES'),
      rejectLabel: this.translate.instant('FINANCE.NO'),
      accept: () => {
        this.deleteRootSalesClass(rootSalesClass);
      },
    });
  }

  confirmHeaderSalesClassDeletion(event: Event, headerSalesClass: HeaderSalesClassModel) {
    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: this.translate.instant('FINANCE.CONFIRM_HEADER_SALES_CLASS_DELETE', {headerSalesClassName: this.activeLanguage === 'en' ? headerSalesClass.englishName : headerSalesClass.arabicName}),
      header: this.translate.instant('FINANCE.HEADER_SALES_CLASS_DELETE_CONFIRMATION'),
      icon: 'pi pi-info-circle',
      acceptButtonStyleClass: "p-button-danger p-button-text rounded-md ",
      rejectButtonStyleClass: "p-button-text p-button-text rounded-md ",
      acceptIcon: "none",
      rejectIcon: "none",
      acceptLabel: this.translate.instant('FINANCE.YES'),
      rejectLabel: this.translate.instant('FINANCE.NO'),
      accept: () => {
        this.deleteHeaderSalesClass(headerSalesClass);
      },
    });
  }

  confirmDetailSalesClassDeletion(event: Event, detailSalesClass: DetailSalesClassModel) {
    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: this.translate.instant('FINANCE.CONFIRM_DETAIL_SALES_CLASS_DELETE', {detailSalesClassName: this.activeLanguage === 'en' ? detailSalesClass.englishName : detailSalesClass.arabicName}),
      header: this.translate.instant('FINANCE.DETAIL_SALES_CLASS_DELETE_CONFIRMATION'),
      icon: 'pi pi-info-circle',
      acceptButtonStyleClass: "p-button-danger p-button-text rounded-md ",
      rejectButtonStyleClass: "p-button-text p-button-text rounded-md ",
      acceptIcon: "none",
      rejectIcon: "none",
      acceptLabel: this.translate.instant('FINANCE.YES'),
      rejectLabel: this.translate.instant('FINANCE.NO'),
      accept: () => {
        this.deleteDetailSalesClass(detailSalesClass);
      },
    });
  }

  confirmMainSalesClassDeletion(event: Event, mainSalesClass: MainSalesClassModel) {
    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: this.translate.instant('FINANCE.CONFIRM_MAIN_SALES_CLASS_DELETE', {mainSalesClassName: this.activeLanguage === 'en' ? mainSalesClass.englishName : mainSalesClass.arabicName}),
      header: this.translate.instant('FINANCE.MAIN_SALES_CLASS_DELETE_CONFIRMATION'),
      icon: 'pi pi-info-circle',
      acceptButtonStyleClass: "p-button-danger p-button-text rounded-md ",
      rejectButtonStyleClass: "p-button-text p-button-text rounded-md ",
      acceptIcon: "none",
      rejectIcon: "none",
      acceptLabel: this.translate.instant('FINANCE.YES'),
      rejectLabel: this.translate.instant('FINANCE.NO'),
      accept: () => {
        this.deleteMainSalesClass(mainSalesClass);
      },
    });
  }

  handleHeaderSalesClassIconChange(icon: string, headerSalesClass: HeaderSalesClassModel) {
    headerSalesClass.icon = icon;
    const ha = new HeaderSalesClassModel(headerSalesClass);
    this.headerSalesClassService.update(ha).subscribe({
      next: res => {
        this.messageService.add({
          severity: 'success',
          summary: this.translate.instant('FINANCE.SUCCESS'),
          detail: this.translate.instant('FINANCE.HEADER_SALES_CLASS_UPDATED')
        });
      },
      error: error => {
        console.log('Error Updating Header SalesClass', error);
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail: this.translate.instant('FINANCE.HEADER_SALES_CLASS_UPDATING_ERROR')
        });
      }
    });
  }

  handleDetailSalesClassIconChange(icon: string, detailSalesClass: DetailSalesClassModel) {
    detailSalesClass.icon = icon;
    const da = new DetailSalesClassModel(detailSalesClass);
    this.detailSalesClassService.update(da).subscribe({
      next: res => {
        this.messageService.add({
          severity: 'success',
          summary: this.translate.instant('FINANCE.SUCCESS'),
          detail: this.translate.instant('FINANCE.DETAIL_SALES_CLASS_UPDATED')
        });
      },
      error: error => {
        console.log('Error Updating Detail SalesClass', error);
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail: this.translate.instant('FINANCE.DETAIL_SALES_CLASS_UPDATING_ERROR')
        });
      }
    });
  }

  handleRootSalesClassIconChange(icon: string, rootSalesClass: RootSalesClassModel) {
    rootSalesClass.icon = icon;
    const ra = new RootSalesClassModel(rootSalesClass);
    this.rootSalesClassService.update(ra).subscribe({
      next: res => {
        this.messageService.add({
          severity: 'success',
          summary: this.translate.instant('FINANCE.SUCCESS'),
          detail: this.translate.instant('FINANCE.ROOT_SALES_CLASS_UPDATED')
        });
      },
      error: error => {
        console.log('Error Updating Root SalesClass', error);
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail: this.translate.instant('FINANCE.ROOT_SALES_CLASS_UPDATING_ERROR')
        });
      }
    });
  }

  handleMainSalesClassIconChange(icon: string, mainSalesClass: MainSalesClassModel) {
    mainSalesClass.icon = icon;
    const ma = new MainSalesClassModel(mainSalesClass);
    this.mainSalesClassService.update(ma).subscribe({
      next: res => {
        this.messageService.add({
          severity: 'success',
          summary: this.translate.instant('FINANCE.SUCCESS'),
          detail: this.translate.instant('FINANCE.MAIN_SALES_CLASS_UPDATED')
        });
      },
      error: error => {
        console.log('Error Updating Main SalesClass', error);
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail: this.translate.instant('FINANCE.MAIN_SALES_CLASS_UPDATING_ERROR')
        });
      }
    });
  }

  private measurementUnitSignal = signal<MeasurementUnitModel[]>([])

  get measurementUnitOptions(): Array<{ label: string, value: string }> {
    return this.measurementUnitSignal().map(x => ({
      label: this.activeLanguage === 'en' ? `${x.englishName} (${x.englishSymbol})` : `${x.arabicName} (${x.arabicSymbol})`,
      value: x.id
    }))
  }


  loadMeasurementUnit() {
    this.measurementUnitService.getAll().subscribe(elements => {
      this.measurementUnitSignal.set(elements)
    })
  }

}
