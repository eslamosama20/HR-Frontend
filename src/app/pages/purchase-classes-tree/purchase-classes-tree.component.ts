import { Component, signal , OnInit, OnChanges, SimpleChanges, Input, ChangeDetectorRef } from '@angular/core';
import { TreeNode} from 'primeng/api';
import { ClientProfileModel } from 'src/app/models/accounting/clientProfile.model';
import { DetailPurchaseClassModel } from 'src/app/models/purchase-classes-tree/detailPurchaseClass.model';
import { HeaderPurchaseClassModel } from 'src/app/models/purchase-classes-tree/headerPurchaseClass.model';
import { RootPurchaseClassModel } from 'src/app/models/purchase-classes-tree/rootPurchaseClass.model';
import {
  MainPurchaseClassModel,
  MainPurchaseItemType,
  normalizeMainPurchaseItemType
} from 'src/app/models/purchase-classes-tree/mainPurchaseClass.model';
import { DetailPurchaseClassService } from 'src/app/services/purchase-classes-tree/detail-purchase-class.service';
import { HeaderPurchaseClassService } from 'src/app/services/purchase-classes-tree/header-purchase-class.service';
import { RootPurchaseClassService } from 'src/app/services/purchase-classes-tree/root-purchase-class.service';
import { MainPurchaseClassService } from 'src/app/services/purchase-classes-tree/main-purchase-class.service';
import { forkJoin } from 'rxjs';
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
import {CheckboxModule} from "primeng/checkbox";
import {
  FontAwesomeIconPickerComponent
} from "../../shared-components/font-awesome-icon-picker/font-awesome-icon-picker.component";
import {MeasurementUnitService} from "../../services/inventory/measurement-unit.service";
import {MeasurementUnitModel} from "../../models/inventory/measurementUnit.model";
import { Dropdown } from 'primeng/dropdown';

@Component({
  selector: 'app-purchase-classes-tree',
  templateUrl: './purchase-classes-tree.component.html',
  styleUrl: './purchase-classes-tree.component.scss',
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
    CheckboxModule,
    FontAwesomeIconPickerComponent
  ],
  providers: [ConfirmationService, MessageService]
})
export class PurchaseClassesTreeComponent implements OnInit {

  filesSignal = signal<TreeNode[]>([]);
  rootPurchaseClassVisible = false;
  headerPurchaseClassVisible = false;
  detailPurchaseClassVisible = false;
  mainPurchaseClassVisible = false;
  iconPack: IconDefinition[];
// =========================
// EXPERIMENT: Side Details Panel (instead of dialogs)
// =========================
sidePanelVisible = false;

selectedNodeType:
  | 'rootPurchaseClass'
  | 'headerPurchaseClass'
  | 'detailPurchaseClass'
  | 'mainPurchaseClass'
  | null = null;

selectedNodeData: any = null;

  loadingSignal = signal(true);

  get itemTypeOptions(): Array<{ label: string; value: MainPurchaseItemType }> {
    return [
      { label: this.translate?.instant('FINANCE.ITEM_TYPE_GENERAL') || 'General Item', value: 'general' },
      { label: this.translate?.instant('FINANCE.ITEM_TYPE_MEDICATION') || 'Medication', value: 'medication' },
      { label: this.translate?.instant('FINANCE.ITEM_TYPE_SERVICE') || 'Service', value: 'service' }
    ];
  }

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
    return this.userPermissions.some(x => x.name === permission)
  }
openEditorFromNode(
  node: TreeNode,
  type: 'rootPurchaseClass' | 'headerPurchaseClass' | 'detailPurchaseClass' | 'mainPurchaseClass'
) {
  this.selectedNodeType = type;
  this.selectedNodeData = node?.data ?? null;
  this.sidePanelVisible = true;

  switch (type) {
    case 'rootPurchaseClass':
      this.fillRootPurchaseForm(node.data as RootPurchaseClassModel);
      break;

    case 'headerPurchaseClass':
      this.fillHeaderPurchaseForm(node.data as HeaderPurchaseClassModel);
      break;

    case 'detailPurchaseClass':
      this.fillDetailPurchaseForm(node.data as DetailPurchaseClassModel);
      break;

    case 'mainPurchaseClass':
      this.fillMainPurchaseForm(node.data as MainPurchaseClassModel);
      break;
  }
}

  // showRootPurchaseClassDialog(rootPurchaseClass: RootPurchaseClassModel = null) {
  //   this.rootPurchaseClassVisible = true;
  //   if (rootPurchaseClass) {
  //     this.rootPurchaseClassFormGroup.controls.referenceCode.setValue(rootPurchaseClass.referenceCode);
  //     this.rootPurchaseClassFormGroup.controls.englishName.setValue(rootPurchaseClass.englishName);
  //     this.rootPurchaseClassFormGroup.controls.arabicName.setValue(rootPurchaseClass.arabicName);
  //     this.rootPurchaseClassFormGroup.controls.id.setValue(rootPurchaseClass.id);
  //     this.rootPurchaseClassFormGroup.controls.icon.setValue(rootPurchaseClass.icon);
  //   }
  // }
private fillRootPurchaseForm(model: RootPurchaseClassModel | null) {
  this.rootPurchaseClassFormGroup.reset();
  if (!model) return;

  this.rootPurchaseClassFormGroup.patchValue({
    referenceCode: model.referenceCode,
    englishName: model.englishName,
    arabicName: model.arabicName,
    icon: model.icon,
    id: model.id
  });
}
forceDropdownPanelLeft(dropdown: any): void {
  // PrimeNG بيرسم overlay بعد فتحه مباشرة، فبنأخر tick
  setTimeout(() => {
    const hostEl: HTMLElement | null =
      dropdown?.containerViewChild?.nativeElement ??
      dropdown?.el?.nativeElement ??
      null;

    const overlayEl: HTMLElement | null =
      dropdown?.overlayViewChild?.nativeElement ?? null;

    if (!hostEl || !overlayEl) return;

    const rect = hostEl.getBoundingClientRect();

    const scrollX = window.scrollX || document.documentElement.scrollLeft || 0;
    const scrollY = window.scrollY || document.documentElement.scrollTop || 0;

    // ✅ افتح تحت الحقل ومحاذي للشمال (left)
    overlayEl.style.left = `${rect.left + scrollX}px`;
    overlayEl.style.right = 'auto';
    overlayEl.style.top = `${rect.bottom + scrollY}px`;

    // ✅ نفس عرض الحقل على الأقل
    overlayEl.style.minWidth = `${rect.width}px`;

    // ✅ تأكيد انه فوق الشجرة لو فيه تداخل z-index
    overlayEl.style.zIndex = '10050';
  }, 0);
}
shiftDropdownPanelLeft(dd: Dropdown, px: number = 40) {
  // بعد ما الـ panel يتعمله render وياخد position من PrimeNG
  setTimeout(() => {
    // PrimeNG بيحط id للـ overlay في aria-controls غالباً
    const hostEl: HTMLElement = dd.el?.nativeElement;
    const panelId = hostEl?.getAttribute('aria-controls');

    const panel =
      (panelId && document.getElementById(panelId)) ||
      document.querySelector('.p-dropdown-panel.p-connected-overlay') as HTMLElement;

    if (!panel) return;

    // اقرأ left الحالي (inline) واطرح منه px
    const leftStr = panel.style.left || getComputedStyle(panel).left;
    const left = parseFloat(leftStr || '0');

    if (!Number.isNaN(left)) {
      panel.style.left = (left - px) + 'px';
    }

    // احتياط لو فيه transform inline بيحركها
    // نخليه فاضي عشان left هو اللي يشتغل (اختياري)
    // panel.style.transform = '';
  }, 0);
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

private fillHeaderPurchaseForm(model: HeaderPurchaseClassModel | null) {
  this.headerPurchaseClassFormGroup.reset();
  if (!model) return;

  this.headerPurchaseClassFormGroup.patchValue({
    referenceCode: model.referenceCode,
    englishName: model.englishName,
    arabicName: model.arabicName,
    rootPurchaseClassId: model.rootPurchaseClassId,
    icon: model.icon,
    id: model.id
  });
}

private fillDetailPurchaseForm(model: DetailPurchaseClassModel | null) {
  this.detailPurchaseClassFormGroup.reset();
  if (!model) return;

  this.detailPurchaseClassFormGroup.patchValue({
    referenceCode: model.referenceCode,
    englishName: model.englishName,
    arabicName: model.arabicName,
    headerPurchaseClassId: model.headerPurchaseClassId,
    icon: model.icon,
    id: model.id
  });
}

private fillMainPurchaseForm(model: MainPurchaseClassModel | null) {
  this.mainPurchaseClassFormGroup.reset();
  if (!model) return;

  const normalized = this.normalizeMainPurchaseClassModel(model);
  this.mainPurchaseClassFormGroup.patchValue({
    referenceCode: model.referenceCode,
    englishName: model.englishName,
    arabicName: model.arabicName,
    detailPurchaseClassId: model.detailPurchaseClassId,
    measurementUnitId: model.measurementUnitId,
    icon: model.icon,
    imageUrl: model.imageUrl || '',
    itemType: normalized.itemType,
    needsBatch: normalized.needsBatch,
    needsExpiry: normalized.needsExpiry,
    isPharmacyItem: normalized.isPharmacyItem,
    sfdaCode: normalized.sfdaCode ?? '',
    isControlled: normalized.isControlled,
    id: model.id
  }, { emitEvent: false });
  this.mainPurchaseImagePreview = model.imageUrl || null;
  this.applyItemTypeRules(normalized.itemType, { reason: 'load' });
}
cancelSidePanel() {
  this.sidePanelVisible = false;
  this.selectedNodeType = null;
  this.selectedNodeData = null;
  this.closeSidePanel();

  this.rootPurchaseClassFormGroup.reset();
  this.headerPurchaseClassFormGroup.reset();
  this.detailPurchaseClassFormGroup.reset();
  this.mainPurchaseClassFormGroup.reset();
}

closeSidePanel() {
  this.sidePanelVisible = false;
  this.selectedNodeType = null;
  this.selectedNodeData = null;

  this.rootPurchaseClassFormGroup?.reset();
  this.headerPurchaseClassFormGroup?.reset();
  this.detailPurchaseClassFormGroup?.reset();
  this.mainPurchaseClassFormGroup?.reset();
}

// cancelSidePanel() {
//   this.closeSidePanel();
// }

saveFromSidePanel() {
  if (!this.selectedNodeType) return;

  // ❌ ممنوع تقفل هنا، اقفل بعد success داخل save methods
  switch (this.selectedNodeType) {
    case 'rootPurchaseClass':
      this.saveRootPurchaseClass();
      break;
    case 'headerPurchaseClass':
      this.saveHeaderPurchaseClass();
      break;
    case 'detailPurchaseClass':
      this.saveDetailPurchaseClass();
      break;
    case 'mainPurchaseClass':
      this.saveMainPurchaseClass();
      break;
  }
}


showRootPurchaseClassDialog(rootPurchaseClass: RootPurchaseClassModel = null) {

  // ===== EXPERIMENT: تعليق فتح الدايالوج =====
  // this.rootPurchaseClassVisible = true;

  // بدل الدايالوج: افتح الـ side panel
  this.selectedNodeType = 'rootPurchaseClass';
  this.selectedNodeData = rootPurchaseClass;
  this.sidePanelVisible = true;

  if (rootPurchaseClass) {
    this.fillRootPurchaseForm(rootPurchaseClass);
  } else {
    this.rootPurchaseClassFormGroup.reset(); // add new
  }
}


  // closeRootPurchaseClassDialog() {
  //   this.rootPurchaseClassVisible = false;
  //   this.rootPurchaseClassFormGroup.reset();
  // }
  closeRootPurchaseClassDialog() {
  this.rootPurchaseClassVisible = false;
  this.rootPurchaseClassFormGroup.reset();

  // EXPERIMENT: اقفل side panel كمان
  this.sidePanelVisible = false;
  this.selectedNodeType = null;
  this.selectedNodeData = null;
}

// ✅ Search term signal
private searchTermSignal = signal<string>('');

// ✅ تعرض للـ template: p-tree [value]="filteredFiles"
  get isEditing(): boolean {
    if (this.selectedNodeType === 'rootPurchaseClass') {
      return !!this.rootPurchaseClassFormGroup?.value?.id;
    }
    if (this.selectedNodeType === 'headerPurchaseClass') {
      return !!this.headerPurchaseClassFormGroup?.value?.id;
    }
    if (this.selectedNodeType === 'detailPurchaseClass') {
      return !!this.detailPurchaseClassFormGroup?.value?.id;
    }
    if (this.selectedNodeType === 'mainPurchaseClass') {
      return !!this.mainPurchaseClassFormGroup?.value?.id;
    }
    return false;
  }

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
        // لو فيه أطفال مطابقين، نحطهم بس
        children: filteredChildren.length ? filteredChildren : node.children,
        // نخليها expanded لو فيه نتائج تحتها
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

//   showHeaderPurchaseClassDialog(rootPurchaseClass?: RootPurchaseClassModel, headerPurchaseClass?: HeaderPurchaseClassModel) {
//     this.headerPurchaseClassVisible = true;

//     if (headerPurchaseClass) {
//         // تعديل
//         this.headerPurchaseClassFormGroup.controls.referenceCode.setValue(headerPurchaseClass.referenceCode);
//         this.headerPurchaseClassFormGroup.controls.englishName.setValue(headerPurchaseClass.englishName);
//         this.headerPurchaseClassFormGroup.controls.arabicName.setValue(headerPurchaseClass.arabicName);
//         this.headerPurchaseClassFormGroup.controls.rootPurchaseClassId.setValue(headerPurchaseClass.rootPurchaseClassId);
//         this.headerPurchaseClassFormGroup.controls.id.setValue(headerPurchaseClass.id);
//         this.headerPurchaseClassFormGroup.controls.icon.setValue(headerPurchaseClass.icon);
//     } else if (rootPurchaseClass) {
//         // إنشاء جديد
//         this.headerPurchaseClassFormGroup.reset();
//         this.headerPurchaseClassFormGroup.controls.rootPurchaseClassId.setValue(rootPurchaseClass.id);
//     }
// }
showHeaderPurchaseClassDialog(rootPurchaseClass?: RootPurchaseClassModel, headerPurchaseClass?: HeaderPurchaseClassModel) {

  // ===== EXPERIMENT: تعليق فتح الدايالوج =====
  // this.headerPurchaseClassVisible = true;

  this.selectedNodeType = 'headerPurchaseClass';
  this.selectedNodeData = headerPurchaseClass ?? rootPurchaseClass ?? null;
  this.sidePanelVisible = true;

  if (headerPurchaseClass) {
    this.fillHeaderPurchaseForm(headerPurchaseClass);
  } else if (rootPurchaseClass) {
    this.headerPurchaseClassFormGroup.reset();
    this.headerPurchaseClassFormGroup.controls.rootPurchaseClassId.setValue(rootPurchaseClass.id);
  }
}




  // closeHeaderPurchaseClassDialog() {
  //   this.headerPurchaseClassVisible = false;
  //   this.headerPurchaseClassFormGroup.reset();
  // }
closeHeaderPurchaseClassDialog() {
  this.headerPurchaseClassVisible = false;
  this.headerPurchaseClassFormGroup.reset();

  this.sidePanelVisible = false;
  this.selectedNodeType = null;
  this.selectedNodeData = null;
}

  // showDetailPurchaseClassDialog(headerPurchaseClass?: HeaderPurchaseClassModel, detailPurchaseClass: DetailPurchaseClassModel = null) {
  //   this.detailPurchaseClassVisible = true;
  //   if (detailPurchaseClass) {
  //     this.detailPurchaseClassFormGroup.controls.referenceCode.setValue(detailPurchaseClass.referenceCode);
  //     this.detailPurchaseClassFormGroup.controls.englishName.setValue(detailPurchaseClass.englishName);
  //     this.detailPurchaseClassFormGroup.controls.arabicName.setValue(detailPurchaseClass.arabicName);
  //     this.detailPurchaseClassFormGroup.controls.headerPurchaseClassId.setValue(detailPurchaseClass.headerPurchaseClassId);
  //     this.detailPurchaseClassFormGroup.controls.id.setValue(detailPurchaseClass.id);
  //     this.detailPurchaseClassFormGroup.controls.icon.setValue(detailPurchaseClass.icon);
  //   } else {
  //     this.detailPurchaseClassFormGroup.controls.headerPurchaseClassId.setValue(headerPurchaseClass.id);
  //   }
  // }
showDetailPurchaseClassDialog(headerPurchaseClass?: HeaderPurchaseClassModel, detailPurchaseClass: DetailPurchaseClassModel = null) {

  // ===== EXPERIMENT: تعليق فتح الدايالوج =====
  // this.detailPurchaseClassVisible = true;

  this.selectedNodeType = 'detailPurchaseClass';
  this.selectedNodeData = detailPurchaseClass ?? headerPurchaseClass ?? null;
  this.sidePanelVisible = true;

  if (detailPurchaseClass) {
    this.fillDetailPurchaseForm(detailPurchaseClass);
  } else if (headerPurchaseClass) {
    this.detailPurchaseClassFormGroup.reset();
    this.detailPurchaseClassFormGroup.controls.headerPurchaseClassId.setValue(headerPurchaseClass.id);
  }
}

  // closeDetailPurchaseClassDialog() {
  //   this.detailPurchaseClassVisible = false;
  //   this.detailPurchaseClassFormGroup.reset();
  // }
closeDetailPurchaseClassDialog() {
  this.detailPurchaseClassVisible = false;
  this.detailPurchaseClassFormGroup.reset();

  // EXPERIMENT: اقفل side panel كمان
  this.sidePanelVisible = false;
  this.selectedNodeType = null;
  this.selectedNodeData = null;
}

  // showMainPurchaseClassDialog(detailPurchaseClass?: DetailPurchaseClassModel, mainPurchaseClass: MainPurchaseClassModel = null) {
  //   this.mainPurchaseClassVisible = true;
  //   if (mainPurchaseClass) {
  //     this.mainPurchaseClassFormGroup.controls.referenceCode.setValue(mainPurchaseClass.referenceCode);
  //     this.mainPurchaseClassFormGroup.controls.englishName.setValue(mainPurchaseClass.englishName);
  //     this.mainPurchaseClassFormGroup.controls.arabicName.setValue(mainPurchaseClass.arabicName);
  //     this.mainPurchaseClassFormGroup.controls.detailPurchaseClassId.setValue(mainPurchaseClass.detailPurchaseClassId);
  //     this.mainPurchaseClassFormGroup.controls.id.setValue(mainPurchaseClass.id);
  //     this.mainPurchaseClassFormGroup.controls.measurementUnitId.setValue(mainPurchaseClass.measurementUnitId);
  //     this.mainPurchaseClassFormGroup.controls.icon.setValue(mainPurchaseClass.icon);
  //   } else {
  //     this.mainPurchaseClassFormGroup.controls.detailPurchaseClassId.setValue(detailPurchaseClass.id);
  //   }
  // }
showMainPurchaseClassDialog(detailPurchaseClass?: DetailPurchaseClassModel, mainPurchaseClass: MainPurchaseClassModel = null) {

  // ===== EXPERIMENT: تعليق فتح الدايالوج =====
  // this.mainPurchaseClassVisible = true;

  this.selectedNodeType = 'mainPurchaseClass';
  this.selectedNodeData = mainPurchaseClass ?? detailPurchaseClass ?? null;
  this.sidePanelVisible = true;

  if (mainPurchaseClass) {
    this.fillMainPurchaseForm(mainPurchaseClass);
  } else if (detailPurchaseClass) {
    this.mainPurchaseClassFormGroup.reset();
    this.mainPurchaseClassFormGroup.controls.detailPurchaseClassId.setValue(detailPurchaseClass.id);
    this.mainPurchaseClassFormGroup.patchValue({
      itemType: 'general',
      needsBatch: false,
      needsExpiry: false,
      isPharmacyItem: false,
      sfdaCode: ''
    }, { emitEvent: false });
    this.applyItemTypeRules('general', { reason: 'load' });
  }
}

  // closeMainPurchaseClassDialog() {
  //   this.mainPurchaseClassVisible = false;
  //   this.mainPurchaseClassFormGroup.reset();
  // }
closeMainPurchaseClassDialog() {
  this.mainPurchaseClassVisible = false;
  this.mainPurchaseClassFormGroup.reset();

  // EXPERIMENT: اقفل side panel كمان
  this.sidePanelVisible = false;
  this.selectedNodeType = null;
  this.selectedNodeData = null;
}

  rootPurchaseClassFormGroup: FormGroup;
  headerPurchaseClassFormGroup: FormGroup;
  detailPurchaseClassFormGroup: FormGroup;
  mainPurchaseClassFormGroup: FormGroup;
  rootPurchaseClassesSignal = signal<RootPurchaseClassModel[]>([]);
  headerPurchaseClassesSignal = signal<HeaderPurchaseClassModel[]>([]);
  detailPurchaseClassesSignal = signal<DetailPurchaseClassModel[]>([]);
  mainPurchaseClassesSignal = signal<MainPurchaseClassModel[]>([]);
  clientProfilesSignal = signal<ClientProfileModel[]>([]);

  get files(): TreeNode[] {
    return this.filesSignal();
  }

  set files(value: TreeNode[]) {
    this.filesSignal.set(value);
  }

  get rootPurchaseClasses(): RootPurchaseClassModel[] {
    return this.rootPurchaseClassesSignal();
  }

  set rootPurchaseClasses(value: RootPurchaseClassModel[]) {
    this.rootPurchaseClassesSignal.set(value);
  }

  get headerPurchaseClasses(): HeaderPurchaseClassModel[] {
    return this.headerPurchaseClassesSignal();
  }

  set headerPurchaseClasses(value: HeaderPurchaseClassModel[]) {
    this.headerPurchaseClassesSignal.set(value);
  }

  get detailPurchaseClasses(): DetailPurchaseClassModel[] {
    return this.detailPurchaseClassesSignal();
  }

  set detailPurchaseClasses(value: DetailPurchaseClassModel[]) {
    this.detailPurchaseClassesSignal.set(value);
  }

  get mainPurchaseClasses(): MainPurchaseClassModel[] {
    return this.mainPurchaseClassesSignal();
  }

  set mainPurchaseClasses(value: MainPurchaseClassModel[]) {
    this.mainPurchaseClassesSignal.set(value);
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

  constructor(private rootPurchaseClassService: RootPurchaseClassService,
              private headerPurchaseClassService: HeaderPurchaseClassService,
              private detailPurchaseClassService: DetailPurchaseClassService,
              private mainPurchaseClassService: MainPurchaseClassService,
              private fb: FormBuilder,
              private authService: AuthService,
              private confirmationService: ConfirmationService,
              private messageService: MessageService,
              private translateService: TranslateService,
              public translationService: TranslationService,
              private iconPackService: UseFontAwesomeIconPackService,
              private measurementUnitService: MeasurementUnitService,
              private cdr: ChangeDetectorRef,
  ) {
    this.iconPack = this.iconPackService.getIconPack();
    this.translate = translateService;
    this.activeLanguage = translationService.getSelectedLanguage();
    this.authService.getUserByToken().subscribe(
      (res: UserAccountModel) => {
        if (res) {
          this.userPermissions = res.userRoles.map(ur => ur.role.rolePermissions.map(rp => rp.permission))
            .reduce((acc, val) => acc.concat(val), []);
        }
      }
    );
  }


  ngOnInit(): void {
    this.loading = true;
    this.loadData();
    this.loadMeasurementUnit();

    this.rootPurchaseClassFormGroup = this.fb.group({
      referenceCode: ['', Validators.maxLength(500)],
      englishName: ['', [Validators.required, Validators.maxLength(500)]],
      arabicName: ['', [Validators.required, Validators.maxLength(500)]],
      icon: [''],
      id: ['']
    });

    this.headerPurchaseClassFormGroup = this.fb.group({
      referenceCode: ['', Validators.maxLength(500)],
      englishName: ['', [Validators.required, Validators.maxLength(500)]],
      arabicName: ['', [Validators.required, Validators.maxLength(500)]],
      rootPurchaseClassId: [''],
      icon: [''],
      id: ['']
    });

    this.detailPurchaseClassFormGroup = this.fb.group({
      referenceCode: ['', Validators.maxLength(500)],
      englishName: ['', [Validators.required, Validators.maxLength(500)]],
      arabicName: ['', [Validators.required, Validators.maxLength(500)]],
      headerPurchaseClassId: [''],
      icon: [''],
      id: ['']
    });

    this.mainPurchaseClassFormGroup = this.fb.group({
      measurementUnitId: ['', Validators.required],
      icon: [''],
      imageUrl: [''],
      referenceCode: ['', Validators.maxLength(500)],
      englishName: ['', [Validators.required, Validators.maxLength(500)]],
      arabicName: ['', [Validators.required, Validators.maxLength(500)]],
      itemType: ['general' as MainPurchaseItemType, Validators.required],
      needsBatch: [false],
      needsExpiry: [false],
      isPharmacyItem: [false],
      sfdaCode: [''],
      isControlled: [false],
      detailPurchaseClassId: [''],
      id: ['']
    });

    // Centralized product-behavior rules. Keeps template conditions simple.
    this.mainPurchaseClassFormGroup.get('itemType')?.valueChanges.subscribe((type: MainPurchaseItemType) => {
      this.applyItemTypeRules(type, { reason: 'user-change' });
    });

    // Ensure backward-safe clean defaults on first load.
    this.applyItemTypeRules('general', { reason: 'load' });
  }


  loadTree(rootPurchaseClasses: RootPurchaseClassModel[]) {
    // Precompute styles
const rootStyleClass =
  `rounded-sm px-0.5 py-[1px] my-[2px] ${this.mode === 'dark'
    ? 'bg-gray-800 text-white'
    : 'bg-gray-100 text-gray-900'}`;


const headerStyleClass =
  `rounded-sm px-0.5 py-[1px] my-[2px] ${this.mode === 'dark'
    ? 'bg-sky-700 text-white'
    : 'bg-white text-black'}`;


const detailStyleClass =
  `rounded-sm px-0.5 py-[1px] my-[2px] ${this.mode === 'dark'
    ? 'bg-sky-800 text-white'
    : 'bg-white text-black'}`;


const mainPurchaseClassStyleClass =
  `rounded-sm px-0.5 py-[1px] my-[2px] ${this.mode === 'dark'
    ? 'bg-sky-900 text-white'
    : 'bg-gray-200 text-black'}`;


    const files = new Array(rootPurchaseClasses.length);

    for (let i = 0; i < rootPurchaseClasses.length; i++) {
      const rootPurchaseClass = rootPurchaseClasses[i];
      const headerPurchaseClasses = rootPurchaseClass.headerPurchaseClasses;
      const rootChildren = new Array(headerPurchaseClasses.length);

      for (let j = 0; j < headerPurchaseClasses.length; j++) {
        const headerPurchaseClass = headerPurchaseClasses[j];
        const detailPurchaseClasses = headerPurchaseClass.detailPurchaseClasses;
        const headerChildren = new Array(detailPurchaseClasses.length);

        for (let k = 0; k < detailPurchaseClasses.length; k++) {
          const detailPurchaseClass = detailPurchaseClasses[k];
          const mainPurchaseClasses = detailPurchaseClass.mainPurchaseClasses;
          const detailChildren = new Array(mainPurchaseClasses.length);

          for (let l = 0; l < mainPurchaseClasses.length; l++) {
            const mainPurchaseClass = mainPurchaseClasses[l];
            console.log(mainPurchaseClass);

            detailChildren[l] = {
              label: mainPurchaseClass.englishName,
              expanded: false,
              type: 'mainPurchaseClass',
              styleClass: mainPurchaseClassStyleClass,
              data: mainPurchaseClass,
            };
          }

          headerChildren[k] = {
            label: detailPurchaseClass.englishName,
            expanded: false,
            type: 'detailPurchaseClass',
            styleClass: detailStyleClass,
            data: detailPurchaseClass,
            children: detailChildren,
          };
        }

        rootChildren[j] = {
          label: headerPurchaseClass.englishName,
          expanded: true,
          type: 'headerPurchaseClass',
          data: headerPurchaseClass,
          styleClass: headerStyleClass,
          children: headerChildren,
        };
      }

      files[i] = {
        type: 'rootPurchaseClass',
        styleClass: rootStyleClass,
        label: rootPurchaseClass.englishName,
        expanded: true,
        data: rootPurchaseClass,
        children: rootChildren,
      };
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
  
  expandAll(): void {
    this.setExpandedForAll(this.files, true);
    // trigger للـ signal
    this.files = [...this.files];
  }
  
  collapseAll(): void {
    this.setExpandedForAll(this.files, false);
    this.files = [...this.files];
  }
  
  loadData() {
    this.loading = true;
    this.rootPurchaseClassService.getAll().subscribe({
      next: res => {
        this.rootPurchaseClasses = res;
        this.loadTree(res);
        this.loading = false;
        this.cdr.detectChanges();
      },
        error: error => {
          console.log('Error Loading Data', error);
          this.messageService.add({
            severity: 'error',
            summary: this.translate.instant('FINANCE.ERROR'),
            detail: this.translate.instant('FINANCE.DATA_LOADING_ERROR')
          });
          this.loading = false;
          this.cdr.detectChanges();
        }
    });
  }


  deleteRootPurchaseClass(rootPurchaseClass: RootPurchaseClassModel) {
    this.loading = true;
    this.rootPurchaseClassService.delete(rootPurchaseClass.id).subscribe({
      next: res => {
        this.messageService.add({
          severity: 'info',
          summary: this.translate.instant('FINANCE.CONFIRMED'),
          detail: this.translate.instant('FINANCE.ROOT_PURCHASE_CLASS_DELETED')
        });
        this.loadData();
      },
      error: error => {
        console.log('Error Deleting Root PurchaseClass', error);
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail: this.translate.instant('FINANCE.ROOT_PURCHASE_CLASS_DELETING_ERROR')
        });
        this.loading = false;
      }
    });
  }

  deleteHeaderPurchaseClass(headerPurchaseClass: HeaderPurchaseClassModel) {
    this.headerPurchaseClassService.delete(headerPurchaseClass.id).subscribe({
      next: res => {
        this.messageService.add({
          severity: 'info',
          summary: this.translate.instant('FINANCE.CONFIRMED'),
          detail: this.translate.instant('FINANCE.HEADER_PURCHASE_CLASS_DELETED')
        });
        this.loadData();
      },
      error: error => {
        console.log('Error Deleting Header PurchaseClass', error);
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail: this.translate.instant('FINANCE.HEADER_PURCHASE_CLASS_DELETING_ERROR')
        });
      }
    });
  }

  deleteDetailPurchaseClass(detailPurchaseClass: DetailPurchaseClassModel) {
    this.detailPurchaseClassService.delete(detailPurchaseClass.id).subscribe({
      next: res => {
        this.messageService.add({
          severity: 'info',
          summary: this.translate.instant('FINANCE.CONFIRMED'),
          detail: this.translate.instant('FINANCE.DETAIL_PURCHASE_CLASS_DELETED')
        });
        this.loadData();
      },
      error: error => {
        console.log('Error Deleting Detail PurchaseClass', error);
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail: this.translate.instant('FINANCE.DETAIL_PURCHASE_CLASS_DELETING_ERROR')
        });
      }
    });
  }

  deleteMainPurchaseClass(mainPurchaseClass: MainPurchaseClassModel) {
    this.mainPurchaseClassService.delete(mainPurchaseClass.id).subscribe({
      next: res => {
        this.messageService.add({
          severity: 'info',
          summary: this.translate.instant('FINANCE.CONFIRMED'),
          detail: this.translate.instant('FINANCE.MAIN_PURCHASE_CLASS_DELETED')
        });
        this.loadData();
      },
      error: error => {
        console.log('Error Deleting Main PurchaseClass', error);
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail: this.translate.instant('FINANCE.MAIN_PURCHASE_CLASS_DELETING_ERROR')
        });
      }
    });
  }

  saveRootPurchaseClass() {
    if (this.rootPurchaseClassFormGroup.invalid) {
      return;
    }
    const rootPurchaseClassValues = this.rootPurchaseClassFormGroup.value;

    if (rootPurchaseClassValues.id) {
      const rootPurchaseClass = new RootPurchaseClassModel();
      rootPurchaseClass.referenceCode = rootPurchaseClassValues.referenceCode;
      rootPurchaseClass.englishName = rootPurchaseClassValues.englishName;
      rootPurchaseClass.arabicName = rootPurchaseClassValues.arabicName;
      rootPurchaseClass.id = rootPurchaseClassValues.id;

      this.rootPurchaseClassService.update(rootPurchaseClass).subscribe({
        next: res => {
          this.closeRootPurchaseClassDialog();
          this.messageService.add({
            severity: 'success',
            summary: this.translate.instant('FINANCE.SUCCESS'),
            detail: this.translate.instant('FINANCE.ROOT_PURCHASE_CLASS_UPDATED')
          });
          this.loadData();
        },
        error: error => this.showPurchaseClassError(error, 'FINANCE.ROOT_PURCHASE_CLASS_UPDATING_ERROR')
      });
    } else {
      const rootPurchaseClass = new RootPurchaseClassModel();
      rootPurchaseClass.referenceCode = rootPurchaseClassValues.referenceCode;
      rootPurchaseClass.englishName = rootPurchaseClassValues.englishName;
      rootPurchaseClass.arabicName = rootPurchaseClassValues.arabicName;
      rootPurchaseClass.icon = rootPurchaseClassValues.icon;

      this.rootPurchaseClassService.create(rootPurchaseClass).subscribe({
        next: res => {
          this.closeRootPurchaseClassDialog();
          this.messageService.add({
            severity: 'success',
            summary: this.translate.instant('FINANCE.SUCCESS'),
            detail: this.translate.instant('FINANCE.ROOT_PURCHASE_CLASS_SAVED')
          });
          this.loadData();
        },
        error: error => this.showPurchaseClassError(error, 'FINANCE.ROOT_PURCHASE_CLASS_SAVING_ERROR')
      });
    }
  }

  saveHeaderPurchaseClass() {
    if (this.headerPurchaseClassFormGroup.invalid) {
      return;
    }
    const headerPurchaseClassValues = this.headerPurchaseClassFormGroup.value;

    if (headerPurchaseClassValues.id) {
      const headerPurchaseClass = new HeaderPurchaseClassModel();
      headerPurchaseClass.referenceCode = headerPurchaseClassValues.referenceCode;
      headerPurchaseClass.englishName = headerPurchaseClassValues.englishName;
      headerPurchaseClass.arabicName = headerPurchaseClassValues.arabicName;
      headerPurchaseClass.rootPurchaseClassId = headerPurchaseClassValues.rootPurchaseClassId;
      headerPurchaseClass.id = headerPurchaseClassValues.id;
      headerPurchaseClass.icon = headerPurchaseClassValues.icon;

      this.headerPurchaseClassService.update(headerPurchaseClass).subscribe({
        next: res => {
          this.closeHeaderPurchaseClassDialog();
          this.messageService.add({
            severity: 'success',
            summary: this.translate.instant('FINANCE.SUCCESS'),
            detail: this.translate.instant('FINANCE.HEADER_PURCHASE_CLASS_UPDATED')
          });
          this.loadData();
        },
        error: error => this.showPurchaseClassError(error, 'FINANCE.HEADER_PURCHASE_CLASS_UPDATING_ERROR')
      });
    } else {
      const headerPurchaseClass = new HeaderPurchaseClassModel();
      headerPurchaseClass.referenceCode = headerPurchaseClassValues.referenceCode;
      headerPurchaseClass.englishName = headerPurchaseClassValues.englishName;
      headerPurchaseClass.arabicName = headerPurchaseClassValues.arabicName;
      headerPurchaseClass.rootPurchaseClassId = headerPurchaseClassValues.rootPurchaseClassId;

      this.headerPurchaseClassService.create(headerPurchaseClass).subscribe({
        next: res => {
          this.closeHeaderPurchaseClassDialog();
          this.messageService.add({
            severity: 'success',
            summary: this.translate.instant('FINANCE.SUCCESS'),
            detail: this.translate.instant('FINANCE.HEADER_PURCHASE_CLASS_SAVED')
          });
          this.loadData();
        },
        error: error => this.showPurchaseClassError(error, 'FINANCE.HEADER_PURCHASE_CLASS_SAVING_ERROR')
      });
    }
  }

  saveDetailPurchaseClass() {
    if (this.detailPurchaseClassFormGroup.invalid) {
      return;
    }
    const detailPurchaseClassValues = this.detailPurchaseClassFormGroup.value;

    if (detailPurchaseClassValues.id) {
      const detailPurchaseClass = new DetailPurchaseClassModel();
      detailPurchaseClass.referenceCode = detailPurchaseClassValues.referenceCode;
      detailPurchaseClass.englishName = detailPurchaseClassValues.englishName;
      detailPurchaseClass.arabicName = detailPurchaseClassValues.arabicName;
      detailPurchaseClass.headerPurchaseClassId = detailPurchaseClassValues.headerPurchaseClassId;
      detailPurchaseClass.id = detailPurchaseClassValues.id;
      detailPurchaseClass.icon = detailPurchaseClassValues.icon;

      this.detailPurchaseClassService.update(detailPurchaseClass).subscribe({
        next: res => {
          this.closeDetailPurchaseClassDialog();
          this.messageService.add({
            severity: 'success',
            summary: this.translate.instant('FINANCE.SUCCESS'),
            detail: this.translate.instant('FINANCE.DETAIL_PURCHASE_CLASS_UPDATED')
          });
          this.loadData();
        },
        error: error => this.showPurchaseClassError(error, 'FINANCE.DETAIL_PURCHASE_CLASS_UPDATING_ERROR')
      });
    } else {
      const detailPurchaseClass = new DetailPurchaseClassModel();
      detailPurchaseClass.referenceCode = detailPurchaseClassValues.referenceCode;
      detailPurchaseClass.englishName = detailPurchaseClassValues.englishName;
      detailPurchaseClass.arabicName = detailPurchaseClassValues.arabicName;
      detailPurchaseClass.headerPurchaseClassId = detailPurchaseClassValues.headerPurchaseClassId;

      this.detailPurchaseClassService.create(detailPurchaseClass).subscribe({
        next: res => {
          this.closeDetailPurchaseClassDialog();
          this.messageService.add({
            severity: 'success',
            summary: this.translate.instant('FINANCE.SUCCESS'),
            detail: this.translate.instant('FINANCE.DETAIL_PURCHASE_CLASS_SAVED')
          });
          this.loadData();
        },
        error: error => this.showPurchaseClassError(error, 'FINANCE.DETAIL_PURCHASE_CLASS_SAVING_ERROR')
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

  private showPurchaseClassError(error: any, defaultKey: string) {
    console.error('PurchaseClass Operation Error:', error);
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

  mainPurchaseImagePreview: string | null = null;

  onMainProductImageSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      this.mainPurchaseImagePreview = dataUrl;
      this.mainPurchaseClassFormGroup.patchValue({ imageUrl: dataUrl });
    };
    reader.readAsDataURL(file);
  }

  saveMainPurchaseClass() {
    if (this.mainPurchaseClassFormGroup.invalid) {
      return;
    }
    const mainPurchaseClassValues = this.mainPurchaseClassFormGroup.value;
    const payloadValues = this.sanitizeMainPurchaseClassValues(mainPurchaseClassValues);

    if (mainPurchaseClassValues.id) {
      const mainPurchaseClass = new MainPurchaseClassModel();
      mainPurchaseClass.referenceCode = payloadValues.referenceCode;
      mainPurchaseClass.englishName = payloadValues.englishName;
      mainPurchaseClass.arabicName = payloadValues.arabicName;
      mainPurchaseClass.detailPurchaseClassId = payloadValues.detailPurchaseClassId;
      mainPurchaseClass.id = payloadValues.id;
      mainPurchaseClass.measurementUnitId = payloadValues.measurementUnitId;
      mainPurchaseClass.icon = payloadValues.icon;
      mainPurchaseClass.imageUrl = payloadValues.imageUrl || null;
      mainPurchaseClass.itemType = payloadValues.itemType;
      mainPurchaseClass.needsBatch = payloadValues.needsBatch;
      mainPurchaseClass.needsExpiry = payloadValues.needsExpiry;
      mainPurchaseClass.isPharmacyItem = payloadValues.isPharmacyItem;
      mainPurchaseClass.sfdaCode = payloadValues.sfdaCode;
      mainPurchaseClass.isControlled = payloadValues.isControlled;

      this.mainPurchaseClassService.update(mainPurchaseClass).subscribe({
        next: res => {
          this.closeMainPurchaseClassDialog();
          this.messageService.add({
            severity: 'success',
            summary: this.translate.instant('FINANCE.SUCCESS'),
            detail: this.translate.instant('FINANCE.MAIN_PURCHASE_CLASS_UPDATED')
          });
          this.loadData();
        },
        error: error => this.showPurchaseClassError(error, 'FINANCE.MAIN_PURCHASE_CLASS_UPDATING_ERROR')
      });
    } else {
      const mainPurchaseClass = new MainPurchaseClassModel();
      mainPurchaseClass.referenceCode = payloadValues.referenceCode;
      mainPurchaseClass.englishName = payloadValues.englishName;
      mainPurchaseClass.arabicName = payloadValues.arabicName;
      mainPurchaseClass.detailPurchaseClassId = payloadValues.detailPurchaseClassId;
      mainPurchaseClass.measurementUnitId = payloadValues.measurementUnitId;
      mainPurchaseClass.imageUrl = payloadValues.imageUrl || null;
      mainPurchaseClass.itemType = payloadValues.itemType;
      mainPurchaseClass.needsBatch = payloadValues.needsBatch;
      mainPurchaseClass.needsExpiry = payloadValues.needsExpiry;
      mainPurchaseClass.isPharmacyItem = payloadValues.isPharmacyItem;
      mainPurchaseClass.sfdaCode = payloadValues.sfdaCode;
      mainPurchaseClass.isControlled = payloadValues.isControlled;

      this.mainPurchaseClassService.create(mainPurchaseClass).subscribe({
        next: res => {
          this.closeMainPurchaseClassDialog();
          this.messageService.add({
            severity: 'success',
            summary: this.translate.instant('FINANCE.SUCCESS'),
            detail: this.translate.instant('FINANCE.MAIN_PURCHASE_CLASS_SAVED')
          });
          this.loadData();
        },
        error: error => this.showPurchaseClassError(error, 'FINANCE.MAIN_PURCHASE_CLASS_SAVING_ERROR')
      });
    }
  }

  confirmRootPurchaseClassDeletion(event: Event, rootPurchaseClass: RootPurchaseClassModel) {
    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: this.translate.instant('FINANCE.CONFIRM_ROOT_PURCHASE_CLASS_DELETE', {rootPurchaseClassName: this.activeLanguage === 'en' ? rootPurchaseClass.englishName : rootPurchaseClass.arabicName}),
      header: this.translate.instant('FINANCE.ROOT_PURCHASE_CLASS_DELETE_CONFIRMATION'),
      icon: 'pi pi-info-circle',
      acceptButtonStyleClass: "p-button-danger p-button-text rounded-md ",
      rejectButtonStyleClass: "p-button-text p-button-text rounded-md ",
      acceptIcon: "none",
      rejectIcon: "none",
      acceptLabel: this.translate.instant('FINANCE.YES'),
      rejectLabel: this.translate.instant('FINANCE.NO'),
      accept: () => {
        this.deleteRootPurchaseClass(rootPurchaseClass);
      },
    });
  }

  confirmHeaderPurchaseClassDeletion(event: Event, headerPurchaseClass: HeaderPurchaseClassModel) {
    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: this.translate.instant('FINANCE.CONFIRM_HEADER_PURCHASE_CLASS_DELETE', {headerPurchaseClassName: this.activeLanguage === 'en' ? headerPurchaseClass.englishName : headerPurchaseClass.arabicName}),
      header: this.translate.instant('FINANCE.HEADER_PURCHASE_CLASS_DELETE_CONFIRMATION'),
      icon: 'pi pi-info-circle',
      acceptButtonStyleClass: "p-button-danger p-button-text rounded-md ",
      rejectButtonStyleClass: "p-button-text p-button-text rounded-md ",
      acceptIcon: "none",
      rejectIcon: "none",
      acceptLabel: this.translate.instant('FINANCE.YES'),
      rejectLabel: this.translate.instant('FINANCE.NO'),
      accept: () => {
        this.deleteHeaderPurchaseClass(headerPurchaseClass);
      },
    });
  }

  confirmDetailPurchaseClassDeletion(event: Event, detailPurchaseClass: DetailPurchaseClassModel) {
    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: this.translate.instant('FINANCE.CONFIRM_DETAIL_PURCHASE_CLASS_DELETE', {detailPurchaseClassName: this.activeLanguage === 'en' ? detailPurchaseClass.englishName : detailPurchaseClass.arabicName}),
      header: this.translate.instant('FINANCE.DETAIL_PURCHASE_CLASS_DELETE_CONFIRMATION'),
      icon: 'pi pi-info-circle',
      acceptButtonStyleClass: "p-button-danger p-button-text rounded-md ",
      rejectButtonStyleClass: "p-button-text p-button-text rounded-md ",
      acceptIcon: "none",
      rejectIcon: "none",
      acceptLabel: this.translate.instant('FINANCE.YES'),
      rejectLabel: this.translate.instant('FINANCE.NO'),
      accept: () => {
        this.deleteDetailPurchaseClass(detailPurchaseClass);
      },
    });
  }

  confirmMainPurchaseClassDeletion(event: Event, mainPurchaseClass: MainPurchaseClassModel) {
    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: this.translate.instant('FINANCE.CONFIRM_MAIN_PURCHASE_CLASS_DELETE', {mainPurchaseClassName: this.activeLanguage === 'en' ? mainPurchaseClass.englishName : mainPurchaseClass.arabicName}),
      header: this.translate.instant('FINANCE.MAIN_PURCHASE_CLASS_DELETE_CONFIRMATION'),
      icon: 'pi pi-info-circle',
      acceptButtonStyleClass: "p-button-danger p-button-text rounded-md ",
      rejectButtonStyleClass: "p-button-text p-button-text rounded-md ",
      acceptIcon: "none",
      rejectIcon: "none",
      acceptLabel: this.translate.instant('FINANCE.YES'),
      rejectLabel: this.translate.instant('FINANCE.NO'),
      accept: () => {
        this.deleteMainPurchaseClass(mainPurchaseClass);
      },
    });
  }

  handleHeaderPurchaseClassIconChange(icon: string, headerPurchaseClass: HeaderPurchaseClassModel) {
    headerPurchaseClass.icon = icon;
    const ha = new HeaderPurchaseClassModel(headerPurchaseClass);
    this.headerPurchaseClassService.update(ha).subscribe({
      next: res => {
        this.messageService.add({
          severity: 'success',
          summary: this.translate.instant('FINANCE.SUCCESS'),
          detail: this.translate.instant('FINANCE.HEADER_PURCHASE_CLASS_UPDATED')
        });
      },
      error: error => {
        console.log('Error Updating Header PurchaseClass', error);
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail: this.translate.instant('FINANCE.HEADER_PURCHASE_CLASS_UPDATING_ERROR')
        });
      }
    });
  }

  handleDetailPurchaseClassIconChange(icon: string, detailPurchaseClass: DetailPurchaseClassModel) {
    detailPurchaseClass.icon = icon;
    const da = new DetailPurchaseClassModel(detailPurchaseClass);
    this.detailPurchaseClassService.update(da).subscribe({
      next: res => {
        this.messageService.add({
          severity: 'success',
          summary: this.translate.instant('FINANCE.SUCCESS'),
          detail: this.translate.instant('FINANCE.DETAIL_PURCHASE_CLASS_UPDATED')
        });
      },
      error: error => {
        console.log('Error Updating Detail PurchaseClass', error);
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail: this.translate.instant('FINANCE.DETAIL_PURCHASE_CLASS_UPDATING_ERROR')
        });
      }
    });
  }

  handleRootPurchaseClassIconChange(icon: string, rootPurchaseClass: RootPurchaseClassModel) {
    rootPurchaseClass.icon = icon;
    const ra = new RootPurchaseClassModel(rootPurchaseClass);
    this.rootPurchaseClassService.update(ra).subscribe({
      next: res => {
        this.messageService.add({
          severity: 'success',
          summary: this.translate.instant('FINANCE.SUCCESS'),
          detail: this.translate.instant('FINANCE.ROOT_PURCHASE_CLASS_UPDATED')
        });
      },
      error: error => {
        console.log('Error Updating Root PurchaseClass', error);
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail: this.translate.instant('FINANCE.ROOT_PURCHASE_CLASS_UPDATING_ERROR')
        });
      }
    });
  }

  handleMainPurchaseClassIconChange(icon: string, mainPurchaseClass: MainPurchaseClassModel) {
    mainPurchaseClass.icon = icon;
    const ma = new MainPurchaseClassModel(mainPurchaseClass);
    this.mainPurchaseClassService.update(ma).subscribe({
      next: res => {
        this.messageService.add({
          severity: 'success',
          summary: this.translate.instant('FINANCE.SUCCESS'),
          detail: this.translate.instant('FINANCE.MAIN_PURCHASE_CLASS_UPDATED')
        });
      },
      error: error => {
        console.log('Error Updating Main PurchaseClass', error);
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail: this.translate.instant('FINANCE.MAIN_PURCHASE_CLASS_UPDATING_ERROR')
        });
      }
    });
  }

  get isMedicationMainItem(): boolean {
    return normalizeMainPurchaseItemType(this.mainPurchaseClassFormGroup?.get('itemType')?.value) === 'medication';
  }

  private normalizeMainPurchaseClassModel(model: MainPurchaseClassModel): Required<Pick<MainPurchaseClassModel,
    'itemType' | 'needsBatch' | 'needsExpiry' | 'isPharmacyItem' | 'sfdaCode' | 'isControlled'>> {
    return {
      itemType: normalizeMainPurchaseItemType(model?.itemType),
      needsBatch: !!model?.needsBatch,
      needsExpiry: !!model?.needsExpiry,
      isPharmacyItem: !!model?.isPharmacyItem || normalizeMainPurchaseItemType(model?.itemType) === 'medication',
      sfdaCode: model?.sfdaCode ?? null,
      isControlled: !!model?.isControlled
    };
  }

  private applyItemTypeRules(type: MainPurchaseItemType, ctx: { reason: 'load' | 'user-change' }): void {
    const safeType = normalizeMainPurchaseItemType(type);

    if (safeType === 'medication') {
      // Show pharmacy controls; set recommended defaults only on explicit user change.
      const applyRecommended = ctx.reason === 'user-change';
      if (applyRecommended) {
        this.mainPurchaseClassFormGroup.patchValue({
          needsBatch: true,
          needsExpiry: true,
          isPharmacyItem: true,
          isControlled: false
        }, { emitEvent: false });
      }
      this.mainPurchaseClassFormGroup.get('sfdaCode')?.enable({ emitEvent: false });
      return;
    }

    // general/service: reset + prevent stale hidden values.
    this.mainPurchaseClassFormGroup.patchValue({
      needsBatch: false,
      needsExpiry: false,
      isPharmacyItem: false,
      sfdaCode: '',
      isControlled: false
    }, { emitEvent: false });
    this.mainPurchaseClassFormGroup.get('sfdaCode')?.disable({ emitEvent: false });
  }

  private sanitizeMainPurchaseClassValues(values: any): any {
    const itemType = normalizeMainPurchaseItemType(values?.itemType);
    const base = {
      ...values,
      itemType,
      needsBatch: !!values?.needsBatch,
      needsExpiry: !!values?.needsExpiry,
      isPharmacyItem: !!values?.isPharmacyItem,
      sfdaCode: (values?.sfdaCode ?? '').toString().trim(),
      isControlled: !!values?.isControlled
    };

    if (itemType !== 'medication') {
      return {
        ...base,
        needsBatch: false,
        needsExpiry: false,
        isPharmacyItem: false,
        sfdaCode: null,
        isControlled: false
      };
    }

    return {
      ...base,
      sfdaCode: base.sfdaCode.length ? base.sfdaCode : null
    };
  }

  private measurementUnitSignal = signal<MeasurementUnitModel[]>([])

  get measurementUnitOptions(): Array<{ label: string, value: string }> {
    return this.measurementUnitSignal().map(x => ({
      label: this.activeLanguage === 'en' ? `${x.englishName} (${x.englishSymbol})` : `${x.arabicName} (${x.arabicSymbol})`,
      value: x.id
    }))
  }


  loadMeasurementUnit() {
    this.measurementUnitService.getAll().subscribe({
      next: elements => {
        this.measurementUnitSignal.set(elements)
      },
      error: error => {
        console.log('Error Loading Measurement Units', error);
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('ERROR'),
          detail: this.translate.instant('MEASUREMENT_UNIT_LOADING_ERROR')
        });
      }
    })
  }

}
