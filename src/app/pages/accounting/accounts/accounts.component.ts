import { Component, signal , OnInit, OnChanges, SimpleChanges, Input } from '@angular/core';
import { TreeNode} from 'primeng/api';
import { ClientProfileModel } from 'src/app/models/accounting/clientProfile.model';
import { DetailAccountModel } from 'src/app/models/accounting/detailAccount.model';
import { HeaderAccountModel } from 'src/app/models/accounting/headerAccount.model';
import { RootAccountModel } from 'src/app/models/accounting/rootAccount.model';
import { DetailAccountService } from 'src/app/services/accounting/detail-account.service';
import { HeaderAccountService } from 'src/app/services/accounting/header-account.service';
import { RootAccountService } from 'src/app/services/accounting/root-account.service';
import { MainAccountService } from 'src/app/services/accounting/main-account.service';
import { forkJoin } from 'rxjs';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from 'src/app/modules/auth';
import { UserAccountModel } from 'src/app/models/auth/userAccount.model';
import { PermissionModel } from 'src/app/models/auth/permission.model';
import { ConfirmationService, MessageService } from 'primeng/api';
import {TranslateService} from "@ngx-translate/core";
import {TranslationService} from "../../../modules/i18n";
import {IconDefinition} from "@fortawesome/fontawesome-svg-core";
import {UseFontAwesomeIconPackService} from "../../../services/use-font-awesome-icon-pack.service";
import {MainAccountModel} from "../../../models/accounting/mainAccount.model";
import { PERMISSIONS } from '../../../config/permissions';

enum Accounts {
  ROOT_ACCOUNT,
  HEADER_ACCOUNT,
  DETAIL_ACCOUNT
}
@Component({
  selector: 'app-accounts',
  templateUrl: './accounts.component.html',
  styleUrl: './accounts.component.scss',
  providers: [ConfirmationService, MessageService]
})
export class AccountsComponent implements OnInit {
  readonly PERMISSIONS = PERMISSIONS;

  filesSignal = signal<TreeNode[]>([]);
  rootAccountVisible = false;
  headerAccountVisible = false;
  detailAccountVisible = false;
  mainAccountVisible = false;
  iconPack: IconDefinition[];

  // =========================
  // Side Details Panel (instead of dialogs)
  // =========================
  sidePanelVisible = false;

  selectedNodeType:
    | 'rootAccount'
    | 'headerAccount'
    | 'detailAccount'
    | 'mainAccount'
    | null = null;

  selectedNodeData: any = null;

  loadingSignal = signal(true);

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
    type: 'rootAccount' | 'headerAccount' | 'detailAccount' | 'mainAccount'
  ) {
    this.selectedNodeType = type;
    this.selectedNodeData = node?.data ?? null;
    this.sidePanelVisible = true;

    switch (type) {
      case 'rootAccount':
        this.fillRootAccountForm(node.data as RootAccountModel);
        break;

      case 'headerAccount':
        this.fillHeaderAccountForm(node.data as HeaderAccountModel);
        break;

      case 'detailAccount':
        this.fillDetailAccountForm(node.data as DetailAccountModel);
        break;

      case 'mainAccount':
        this.fillMainAccountForm(node.data as MainAccountModel);
        break;
    }
  }

  private fillRootAccountForm(model: RootAccountModel | null) {
    this.rootAccountFormGroup.reset();
    if (!model) return;

    this.rootAccountFormGroup.patchValue({
      referenceCode: model.referenceCode,
      englishName: model.englishName,
      arabicName: model.arabicName,
      icon: model.icon,
      id: model.id
    });
  }

  private fillHeaderAccountForm(model: HeaderAccountModel | null) {
    this.headerAccountFormGroup.reset();
    if (!model) return;

    this.headerAccountFormGroup.patchValue({
      referenceCode: model.referenceCode,
      englishName: model.englishName,
      arabicName: model.arabicName,
      rootAccountId: model.rootAccountId,
      icon: model.icon,
      id: model.id
    });
  }

  private fillDetailAccountForm(model: DetailAccountModel | null) {
    this.detailAccountFormGroup.reset();
    if (!model) return;

    this.detailAccountFormGroup.patchValue({
      referenceCode: model.referenceCode,
      englishName: model.englishName,
      arabicName: model.arabicName,
      headerAccountId: model.headerAccountId,
      icon: model.icon,
      id: model.id
    });
  }

  private fillMainAccountForm(model: MainAccountModel | null) {
    this.mainAccountFormGroup.reset();
    if (!model) return;

    this.mainAccountFormGroup.patchValue({
      referenceCode: model.referenceCode,
      englishName: model.englishName,
      arabicName: model.arabicName,
      detailAccountId: model.detailAccountId,
      icon: model.icon,
      id: model.id
    });
  }

  cancelSidePanel() {
    this.closeSidePanel();
  }

  closeSidePanel() {
    this.sidePanelVisible = false;
    this.selectedNodeType = null;
    this.selectedNodeData = null;

    this.rootAccountFormGroup?.reset();
    this.headerAccountFormGroup?.reset();
    this.detailAccountFormGroup?.reset();
    this.mainAccountFormGroup?.reset();
  }

  saveFromSidePanel() {
    if (!this.selectedNodeType) return;

    switch (this.selectedNodeType) {
      case 'rootAccount':
        this.saveRootAccount();
        break;
      case 'headerAccount':
        this.saveHeaderAccount();
        break;
      case 'detailAccount':
        this.saveDetailAccount();
        break;
      case 'mainAccount':
        this.saveMainAccount();
        break;
    }
  }

  showRootAccountDialog(rootAccount: RootAccountModel = null) {
    this.selectedNodeType = 'rootAccount';
    this.selectedNodeData = rootAccount;
    this.sidePanelVisible = true;

    if (rootAccount) {
      this.fillRootAccountForm(rootAccount);
    } else {
      this.rootAccountFormGroup.reset();
    }
  }

  closeRootAccountDialog() {
    this.rootAccountVisible = false;
    this.rootAccountFormGroup.reset();
    this.closeSidePanel();
  }

  showHeaderAccountDialog(rootAccount?: RootAccountModel, headerAccount: HeaderAccountModel = null) {
    this.selectedNodeType = 'headerAccount';
    this.selectedNodeData = headerAccount ?? rootAccount ?? null;
    this.sidePanelVisible = true;

    if (headerAccount) {
      this.fillHeaderAccountForm(headerAccount);
    } else if (rootAccount) {
      this.headerAccountFormGroup.reset();
      this.headerAccountFormGroup.controls.rootAccountId.setValue(rootAccount.id);
    }
  }

  closeHeaderAccountDialog() {
    this.headerAccountVisible = false;
    this.headerAccountFormGroup.reset();
    this.closeSidePanel();
  }

  showDetailAccountDialog(headerAccount?: HeaderAccountModel, detailAccount: DetailAccountModel = null) {
    this.selectedNodeType = 'detailAccount';
    this.selectedNodeData = detailAccount ?? headerAccount ?? null;
    this.sidePanelVisible = true;

    if (detailAccount) {
      this.fillDetailAccountForm(detailAccount);
    } else if (headerAccount) {
      this.detailAccountFormGroup.reset();
      this.detailAccountFormGroup.controls.headerAccountId.setValue(headerAccount.id);
    }
  }

  closeDetailAccountDialog() {
    this.detailAccountVisible = false;
    this.detailAccountFormGroup.reset();
    this.closeSidePanel();
  }

  showMainAccountDialog(detailAccount?: DetailAccountModel, mainAccount: MainAccountModel = null) {
    this.selectedNodeType = 'mainAccount';
    this.selectedNodeData = mainAccount ?? detailAccount ?? null;
    this.sidePanelVisible = true;

    if (mainAccount) {
      this.fillMainAccountForm(mainAccount);
    } else if (detailAccount) {
      this.mainAccountFormGroup.reset();
      this.mainAccountFormGroup.controls.detailAccountId.setValue(detailAccount.id);
    }
  }

  closeMainAccountDialog() {
    this.mainAccountVisible = false;
    this.mainAccountFormGroup.reset();
    this.closeSidePanel();
  }

  // ✅ Search term signal
  private searchTermSignal = signal<string>('');

  get filteredFiles(): TreeNode[] {
    const term = (this.searchTermSignal() || '').trim().toLowerCase();
    if (!term) return this.files;
    return this.filterTreeNodes(this.files, term);
  }

  onSearch(value: string): void {
    this.searchTermSignal.set(value ?? '');
  }

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

  shiftLastDropdownPanelLeft(px: number = 40) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const panels = Array.from(document.querySelectorAll('.p-dropdown-panel')) as HTMLElement[];
        if (!panels.length) return;

        const panel = panels[panels.length - 1];

        const leftStr = panel.style.left || getComputedStyle(panel).left;
        const left = parseFloat(leftStr || '0');
        if (!Number.isNaN(left) && leftStr && leftStr !== 'auto') {
          panel.style.left = (left - px) + 'px';
          return;
        }

        const tr = panel.style.transform || getComputedStyle(panel).transform;
        if (!tr || tr === 'none') {
          panel.style.transform = `translateX(${-px}px)`;
          return;
        }

        if (tr.startsWith('matrix(')) {
          const nums = tr.replace('matrix(', '').replace(')', '').split(',').map(x => parseFloat(x.trim()));
          if (nums.length === 6) {
            const tx = nums[4] || 0;
            const ty = nums[5] || 0;
            panel.style.transform = `translate(${tx - px}px, ${ty}px)`;
            return;
          }
        }

        const m3 = tr.match(/translate3d\(\s*([-\d.]+)px,\s*([-\d.]+)px,\s*([-\d.]+)px\s*\)/);
        if (m3) {
          const x = parseFloat(m3[1]);
          const y = parseFloat(m3[2]);
          panel.style.transform = `translate3d(${x - px}px, ${y}px, 0px)`;
          return;
        }

        const m2 = tr.match(/translate\(\s*([-\d.]+)px,\s*([-\d.]+)px\s*\)/);
        if (m2) {
          const x = parseFloat(m2[1]);
          const y = parseFloat(m2[2]);
          panel.style.transform = `translate(${x - px}px, ${y}px)`;
          return;
        }

        panel.style.transform = `translateX(${-px}px)`;
      });
    });
  }

  rootAccountFormGroup: FormGroup;
  headerAccountFormGroup: FormGroup;
  detailAccountFormGroup: FormGroup;
  mainAccountFormGroup: FormGroup;
  rootAccountsSignal = signal<RootAccountModel[]>([]);
  headerAccountsSignal = signal<HeaderAccountModel[]>([]);
  detailAccountsSignal = signal<DetailAccountModel[]>([]);
  mainAccountsSignal = signal<MainAccountModel[]>([]);
  clientProfilesSignal = signal<ClientProfileModel[]>([]);

  get files(): TreeNode[] {
    return this.filesSignal();
  }

  set files(value: TreeNode[]) {
    this.filesSignal.set(value);
  }

  get rootAccounts(): RootAccountModel[] {
    return this.rootAccountsSignal();
  }

  set rootAccounts(value: RootAccountModel[]) {
    this.rootAccountsSignal.set(value);
  }

  get headerAccounts(): HeaderAccountModel[] {
    return this.headerAccountsSignal();
  }

  set headerAccounts(value: HeaderAccountModel[]) {
    this.headerAccountsSignal.set(value);
  }

  get detailAccounts(): DetailAccountModel[] {
    return this.detailAccountsSignal();
  }

  set detailAccounts(value: DetailAccountModel[]) {
    this.detailAccountsSignal.set(value);
  }

  get mainAccounts(): MainAccountModel[] {
    return this.mainAccountsSignal();
  }

  set mainAccounts(value: MainAccountModel[]) {
    this.mainAccountsSignal.set(value);
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

  constructor(private rootAccountService: RootAccountService,
              private headerAccountService: HeaderAccountService,
              private detailAccountService: DetailAccountService,
              private mainAccountService: MainAccountService,
              private fb: FormBuilder,
              private authService: AuthService,
              private confirmationService: ConfirmationService,
              private messageService: MessageService,
              private translateService: TranslateService,
              public translationService: TranslationService,
              private iconPackService: UseFontAwesomeIconPackService
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

    this.rootAccountFormGroup = this.fb.group({
      referenceCode: [''],
      englishName: ['', Validators.required],
      arabicName: ['', Validators.required],
      id: ['']
    });

    this.headerAccountFormGroup = this.fb.group({
      referenceCode: [''],
      englishName: ['', Validators.required],
      arabicName: ['', Validators.required],
      rootAccountId: [''],
      id: ['']
    });

    this.detailAccountFormGroup = this.fb.group({
      referenceCode: [''],
      englishName: ['', Validators.required],
      arabicName: ['', Validators.required],
      headerAccountId: [''],
      id: ['']
    });

    this.mainAccountFormGroup = this.fb.group({
      referenceCode: [''],
      englishName: ['', Validators.required],
      arabicName: ['', Validators.required],
      detailAccountId: [''],
      id: ['']
    });
  }


  loadTree(rootAccounts: RootAccountModel[]) {
    // Precompute styles
    const rootStyleClass = `w-full rounded-xl p-4 my-2 ${this.mode === 'dark' ? 'bg-sky-600 text-black' : 'bg-sky-400 text-white'}`;
    const headerStyleClass = `w-full rounded-xl p-4 my-2 ${this.mode === 'dark' ? 'bg-sky-700 text-white' : 'bg-white text-black'}`;
    const detailStyleClass = `w-full text-black rounded-xl p-4 my-2 ${this.mode === 'dark' ? 'bg-sky-800 text-white' : 'bg-white text-black'}`;
    const mainAccountStyleClass = `w-full text-black rounded-xl p-4 my-2 ${this.mode === 'dark' ? 'bg-sky-900 text-white' : 'bg-gray-200 text-black'}`;

    const files = new Array(rootAccounts.length);

    for (let i = 0; i < rootAccounts.length; i++) {
      const rootAccount = rootAccounts[i];
      const headerAccounts = rootAccount.headerAccounts;
      const rootChildren = new Array(headerAccounts.length);

      for (let j = 0; j < headerAccounts.length; j++) {
        const headerAccount = headerAccounts[j];
        const detailAccounts = headerAccount.detailAccounts;
        const headerChildren = new Array(detailAccounts.length);

        for (let k = 0; k < detailAccounts.length; k++) {
          const detailAccount = detailAccounts[k];
          const mainAccounts = detailAccount.mainAccounts;
          const detailChildren = new Array(mainAccounts.length);

          for (let l = 0; l < mainAccounts.length; l++) {
            const mainAccount = mainAccounts[l];
            detailChildren[l] = {
              label: mainAccount.englishName,
              expanded: true,
              type: 'mainAccount',
              styleClass: mainAccountStyleClass,
              data: mainAccount,
            };
          }

          headerChildren[k] = {
            label: detailAccount.englishName,
            expanded: true,
            type: 'detailAccount',
            styleClass: detailStyleClass,
            data: detailAccount,
            children: detailChildren,
          };
        }

        rootChildren[j] = {
          label: headerAccount.englishName,
          expanded: true,
          type: 'headerAccount',
          data: headerAccount,
          styleClass: headerStyleClass,
          children: headerChildren,
        };
      }

      files[i] = {
        type: 'rootAccount',
        styleClass: rootStyleClass,
        label: rootAccount.englishName,
        expanded: true,
        data: rootAccount,
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
    // trigger signal update
    this.files = [...this.files];
  }

  collapseAll(): void {
    this.setExpandedForAll(this.files, false);
    this.files = [...this.files];
  }

  loadData() {
    this.loading = true;
    this.rootAccountService.getAll().subscribe({
      next: res => {
        this.rootAccounts = res;
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


  deleteRootAccount(rootAccount: RootAccountModel) {
    this.loading = true;
    this.rootAccountService.delete(rootAccount.id).subscribe({
      next: res => {
        this.messageService.add({
          severity: 'info',
          summary: this.translate.instant('FINANCE.CONFIRMED'),
          detail: this.translate.instant('FINANCE.ROOT_ACCOUNT_DELETED')
        });
        this.loadData();
      },
      error: error => {
        console.log('Error Deleting Root Account', error);
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail: this.translate.instant('FINANCE.ROOT_ACCOUNT_DELETING_ERROR')
        });
        this.loading = false;
      }
    });
  }

  deleteHeaderAccount(headerAccount: HeaderAccountModel) {
    this.headerAccountService.delete(headerAccount.id).subscribe({
      next: res => {
        this.messageService.add({
          severity: 'info',
          summary: this.translate.instant('FINANCE.CONFIRMED'),
          detail: this.translate.instant('FINANCE.HEADER_ACCOUNT_DELETED')
        });
        this.loadData();
      },
      error: error => {
        console.log('Error Deleting Header Account', error);
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail: this.translate.instant('FINANCE.HEADER_ACCOUNT_DELETING_ERROR')
        });
      }
    });
  }

  deleteDetailAccount(detailAccount: DetailAccountModel) {
    this.detailAccountService.delete(detailAccount.id).subscribe({
      next: res => {
        this.messageService.add({
          severity: 'info',
          summary: this.translate.instant('FINANCE.CONFIRMED'),
          detail: this.translate.instant('FINANCE.DETAIL_ACCOUNT_DELETED')
        });
        this.loadData();
      },
      error: error => {
        console.log('Error Deleting Detail Account', error);
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail: this.translate.instant('FINANCE.DETAIL_ACCOUNT_DELETING_ERROR')
        });
      }
    });
  }

  deleteMainAccount(mainAccount: MainAccountModel) {
    this.mainAccountService.delete(mainAccount.id).subscribe({
      next: res => {
        this.messageService.add({
          severity: 'info',
          summary: this.translate.instant('FINANCE.CONFIRMED'),
          detail: this.translate.instant('FINANCE.MAIN_ACCOUNT_DELETED')
        });
        this.loadData();
      },
      error: error => {
        console.log('Error Deleting Main Account', error);
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail: this.translate.instant('FINANCE.MAIN_ACCOUNT_DELETING_ERROR')
        });
      }
    });
  }

  saveRootAccount() {
    if (this.rootAccountFormGroup.invalid) {
      return;
    }
    const rootAccountValues = this.rootAccountFormGroup.value;

    if (rootAccountValues.id) {
      const rootAccount = new RootAccountModel();
      rootAccount.referenceCode = rootAccountValues.referenceCode;
      rootAccount.englishName = rootAccountValues.englishName;
      rootAccount.arabicName = rootAccountValues.arabicName;
      rootAccount.icon = rootAccountValues.icon;
      rootAccount.id = rootAccountValues.id;

      this.rootAccountService.update(rootAccount).subscribe({
        next: res => {
          this.closeRootAccountDialog();
          this.messageService.add({
            severity: 'success',
            summary: this.translate.instant('FINANCE.SUCCESS'),
            detail: this.translate.instant('FINANCE.ROOT_ACCOUNT_UPDATED')
          });
          this.loadData();
        },
        error: error => {
          console.log('Error Updating Root Account', error);
          if (error === "ReferenceCode already exists"){
            this.messageService.add({
              severity: 'error',
              summary: this.translate.instant('FINANCE.ERROR'),
              detail: this.translate.instant('FINANCE.REFERENCE_CODE_ALREADY_EXISTS')
            });
          }else{
            this.messageService.add({
              severity: 'error',
              summary: this.translate.instant('FINANCE.ERROR'),
              detail: this.translate.instant('FINANCE.ROOT_ACCOUNT_UPDATING_ERROR')
            });
          }

        }
      });
    } else {
      const rootAccount = new RootAccountModel();
      rootAccount.referenceCode = rootAccountValues.referenceCode;
      rootAccount.englishName = rootAccountValues.englishName;
      rootAccount.arabicName = rootAccountValues.arabicName;

      this.rootAccountService.create(rootAccount).subscribe({
        next: res => {
          this.closeRootAccountDialog();
          this.messageService.add({
            severity: 'success',
            summary: this.translate.instant('FINANCE.SUCCESS'),
            detail: this.translate.instant('FINANCE.ROOT_ACCOUNT_SAVED')
          });
          this.loadData();
        },
        error: error => {
          console.log('Error Saving Root Account', error);
          if (error === "ReferenceCode already exists"){
            this.messageService.add({
              severity: 'error',
              summary: this.translate.instant('FINANCE.ERROR'),
              detail: this.translate.instant('FINANCE.REFERENCE_CODE_ALREADY_EXISTS')
            });
          }else{
            this.messageService.add({
              severity: 'error',
              summary: this.translate.instant('FINANCE.ERROR'),
              detail: this.translate.instant('FINANCE.ROOT_ACCOUNT_SAVING_ERROR')
            });
          }
        }
      });
    }
  }

  saveHeaderAccount() {
    if (this.headerAccountFormGroup.invalid) {
      return;
    }
    const headerAccountValues = this.headerAccountFormGroup.value;

    if (headerAccountValues.id) {
      const headerAccount = new HeaderAccountModel();
      headerAccount.referenceCode = headerAccountValues.referenceCode;
      headerAccount.englishName = headerAccountValues.englishName;
      headerAccount.arabicName = headerAccountValues.arabicName;
      headerAccount.icon = headerAccountValues.icon;
      headerAccount.rootAccountId = headerAccountValues.rootAccountId;
      headerAccount.id = headerAccountValues.id;

      this.headerAccountService.update(headerAccount).subscribe({
        next: res => {
          this.closeHeaderAccountDialog();
          this.messageService.add({
            severity: 'success',
            summary: this.translate.instant('FINANCE.SUCCESS'),
            detail: this.translate.instant('FINANCE.HEADER_ACCOUNT_UPDATED')
          });
          this.loadData();
        },
        error: error => {
          console.log('Error Updating Header Account', error);
          if (error === "ReferenceCode already exists"){
            this.messageService.add({
              severity: 'error',
              summary: this.translate.instant('FINANCE.ERROR'),
              detail: this.translate.instant('FINANCE.REFERENCE_CODE_ALREADY_EXISTS')
            });
          }else{
            this.messageService.add({
              severity: 'error',
              summary: this.translate.instant('FINANCE.ERROR'),
              detail: this.translate.instant('FINANCE.HEADER_ACCOUNT_UPDATING_ERROR')
            });
          }
        }
      });
    } else {
      const headerAccount = new HeaderAccountModel();
      headerAccount.referenceCode = headerAccountValues.referenceCode;
      headerAccount.englishName = headerAccountValues.englishName;
      headerAccount.arabicName = headerAccountValues.arabicName;
      headerAccount.rootAccountId = headerAccountValues.rootAccountId;

      this.headerAccountService.create(headerAccount).subscribe({
        next: res => {
          this.closeHeaderAccountDialog();
          this.messageService.add({
            severity: 'success',
            summary: this.translate.instant('FINANCE.SUCCESS'),
            detail: this.translate.instant('FINANCE.HEADER_ACCOUNT_SAVED')
          });
          this.loadData();
        },
        error: error => {
          console.log('Error Saving Header Account', error);
          if (error === "ReferenceCode already exists"){
            this.messageService.add({
              severity: 'error',
              summary: this.translate.instant('FINANCE.ERROR'),
              detail: this.translate.instant('FINANCE.REFERENCE_CODE_ALREADY_EXISTS')
            });
          }else{
            this.messageService.add({
              severity: 'error',
              summary: this.translate.instant('FINANCE.ERROR'),
              detail: this.translate.instant('FINANCE.HEADER_ACCOUNT_SAVING_ERROR')
            });
          }
        }
      });
    }
  }

  saveDetailAccount() {
    if (this.detailAccountFormGroup.invalid) {
      return;
    }
    const detailAccountValues = this.detailAccountFormGroup.value;

    if (detailAccountValues.id) {
      const detailAccount = new DetailAccountModel();
      detailAccount.referenceCode = detailAccountValues.referenceCode;
      detailAccount.englishName = detailAccountValues.englishName;
      detailAccount.arabicName = detailAccountValues.arabicName;
      detailAccount.icon = detailAccountValues.icon;
      detailAccount.headerAccountId = detailAccountValues.headerAccountId;
      detailAccount.id = detailAccountValues.id;

      this.detailAccountService.update(detailAccount).subscribe({
        next: res => {
          this.closeDetailAccountDialog();
          this.messageService.add({
            severity: 'success',
            summary: this.translate.instant('FINANCE.SUCCESS'),
            detail: this.translate.instant('FINANCE.DETAIL_ACCOUNT_UPDATED')
          });
          this.loadData();
        },
        error: error => {
          console.log('Error Updating Detail Account', error);
          if (error === "ReferenceCode already exists"){
            this.messageService.add({
              severity: 'error',
              summary: this.translate.instant('FINANCE.ERROR'),
              detail: this.translate.instant('FINANCE.REFERENCE_CODE_ALREADY_EXISTS')
            });
          }else{
            this.messageService.add({
              severity: 'error',
              summary: this.translate.instant('FINANCE.ERROR'),
              detail: this.translate.instant('FINANCE.DETAIL_ACCOUNT_UPDATING_ERROR')
            });
          }
        }
      });
    } else {
      const detailAccount = new DetailAccountModel();
      detailAccount.referenceCode = detailAccountValues.referenceCode;
      detailAccount.englishName = detailAccountValues.englishName;
      detailAccount.arabicName = detailAccountValues.arabicName;
      detailAccount.headerAccountId = detailAccountValues.headerAccountId;

      this.detailAccountService.create(detailAccount).subscribe({
        next: res => {
          this.closeDetailAccountDialog();
          this.messageService.add({
            severity: 'success',
            summary: this.translate.instant('FINANCE.SUCCESS'),
            detail: this.translate.instant('FINANCE.DETAIL_ACCOUNT_SAVED')
          });
          this.loadData();
        },
        error: error => {
          console.log('Error Saving Detail Account', error);
          if (error === "ReferenceCode already exists"){
            this.messageService.add({
              severity: 'error',
              summary: this.translate.instant('FINANCE.ERROR'),
              detail: this.translate.instant('FINANCE.REFERENCE_CODE_ALREADY_EXISTS')
            });
          }else{
            this.messageService.add({
              severity: 'error',
              summary: this.translate.instant('FINANCE.ERROR'),
              detail: this.translate.instant('FINANCE.DETAIL_ACCOUNT_SAVING_ERROR')
            });
          }
        }
      });
    }
  }

  saveMainAccount() {
    if (this.mainAccountFormGroup.invalid) {
      return;
    }
    const mainAccountValues = this.mainAccountFormGroup.value;

    if (mainAccountValues.id) {
      const mainAccount = new MainAccountModel();
      mainAccount.referenceCode = mainAccountValues.referenceCode;
      mainAccount.englishName = mainAccountValues.englishName;
      mainAccount.arabicName = mainAccountValues.arabicName;
      mainAccount.detailAccountId = mainAccountValues.detailAccountId;
      mainAccount.id = mainAccountValues.id;

      this.mainAccountService.update(mainAccount).subscribe({
        next: res => {
          this.closeMainAccountDialog();
          this.messageService.add({
            severity: 'success',
            summary: this.translate.instant('FINANCE.SUCCESS'),
            detail: this.translate.instant('FINANCE.MAIN_ACCOUNT_UPDATED')
          });
          this.loadData();
        },
        error: error => {
          console.log('Error Updating Main Account', error);
          if (error === "ReferenceCode already exists"){
            this.messageService.add({
              severity: 'error',
              summary: this.translate.instant('FINANCE.ERROR'),
              detail: this.translate.instant('FINANCE.REFERENCE_CODE_ALREADY_EXISTS')
            });
          }else{
            this.messageService.add({
              severity: 'error',
              summary: this.translate.instant('FINANCE.ERROR'),
              detail: this.translate.instant('FINANCE.MAIN_ACCOUNT_UPDATING_ERROR')
            });
          }
        }
      });
    } else {
      const mainAccount = new MainAccountModel();
      mainAccount.referenceCode = mainAccountValues.referenceCode;
      mainAccount.englishName = mainAccountValues.englishName;
      mainAccount.arabicName = mainAccountValues.arabicName;
      mainAccount.detailAccountId = mainAccountValues.detailAccountId;

      this.mainAccountService.create(mainAccount).subscribe({
        next: res => {
          this.closeMainAccountDialog();
          this.messageService.add({
            severity: 'success',
            summary: this.translate.instant('FINANCE.SUCCESS'),
            detail: this.translate.instant('FINANCE.MAIN_ACCOUNT_SAVED')
          });
          this.loadData();
        },
        error: error => {
          console.log('Error Saving Main Account', error);
          if (error === "ReferenceCode already exists"){
            this.messageService.add({
              severity: 'error',
              summary: this.translate.instant('FINANCE.ERROR'),
              detail: this.translate.instant('FINANCE.REFERENCE_CODE_ALREADY_EXISTS')
            });
          }else{
            this.messageService.add({
              severity: 'error',
              summary: this.translate.instant('FINANCE.ERROR'),
              detail: this.translate.instant('FINANCE.MAIN_ACCOUNT_SAVING_ERROR')
            });
          }
        }
      });
    }
  }

  confirmRootAccountDeletion(event: Event, rootAccount: RootAccountModel) {
    if (rootAccount.headerAccounts && rootAccount.headerAccounts.length > 0) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.instant('FINANCE.WARNING'),
        detail: this.translate.instant('FINANCE.CANNOT_DELETE_ROOT_ACCOUNT_WITH_SUB_ACCOUNTS')
      });
      return;
    }

    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: this.translate.instant('FINANCE.CONFIRM_ROOT_ACCOUNT_DELETE', {rootAccountName: this.activeLanguage === 'en' ? rootAccount.englishName : rootAccount.arabicName}),
      header: this.translate.instant('FINANCE.ROOT_ACCOUNT_DELETE_CONFIRMATION'),
      icon: 'pi pi-info-circle',
      acceptButtonStyleClass: "p-button-danger p-button-text rounded-md ",
      rejectButtonStyleClass: "p-button-text p-button-text rounded-md ",
      acceptIcon: "none",
      rejectIcon: "none",
      acceptLabel: this.translate.instant('FINANCE.YES'),
      rejectLabel: this.translate.instant('FINANCE.NO'),
      accept: () => {
        this.deleteRootAccount(rootAccount);
      },
    });
  }

  confirmHeaderAccountDeletion(event: Event, headerAccount: HeaderAccountModel) {
    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: this.translate.instant('FINANCE.CONFIRM_HEADER_ACCOUNT_DELETE', {headerAccountName: this.activeLanguage === 'en' ? headerAccount.englishName : headerAccount.arabicName}),
      header: this.translate.instant('FINANCE.HEADER_ACCOUNT_DELETE_CONFIRMATION'),
      icon: 'pi pi-info-circle',
      acceptButtonStyleClass: "p-button-danger p-button-text rounded-md ",
      rejectButtonStyleClass: "p-button-text p-button-text rounded-md ",
      acceptIcon: "none",
      rejectIcon: "none",
      acceptLabel: this.translate.instant('FINANCE.YES'),
      rejectLabel: this.translate.instant('FINANCE.NO'),
      accept: () => {
        this.deleteHeaderAccount(headerAccount);
      },
    });
  }

  confirmDetailAccountDeletion(event: Event, detailAccount: DetailAccountModel) {
    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: this.translate.instant('FINANCE.CONFIRM_DETAIL_ACCOUNT_DELETE', {detailAccountName: this.activeLanguage === 'en' ? detailAccount.englishName : detailAccount.arabicName}),
      header: this.translate.instant('FINANCE.DETAIL_ACCOUNT_DELETE_CONFIRMATION'),
      icon: 'pi pi-info-circle',
      acceptButtonStyleClass: "p-button-danger p-button-text rounded-md ",
      rejectButtonStyleClass: "p-button-text p-button-text rounded-md ",
      acceptIcon: "none",
      rejectIcon: "none",
      acceptLabel: this.translate.instant('FINANCE.YES'),
      rejectLabel: this.translate.instant('FINANCE.NO'),
      accept: () => {
        this.deleteDetailAccount(detailAccount);
      },
    });
  }

  confirmMainAccountDeletion(event: Event, mainAccount: MainAccountModel) {
    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: this.translate.instant('FINANCE.CONFIRM_MAIN_ACCOUNT_DELETE', {mainAccountName: this.activeLanguage === 'en' ? mainAccount.englishName : mainAccount.arabicName}),
      header: this.translate.instant('FINANCE.MAIN_ACCOUNT_DELETE_CONFIRMATION'),
      icon: 'pi pi-info-circle',
      acceptButtonStyleClass: "p-button-danger p-button-text rounded-md ",
      rejectButtonStyleClass: "p-button-text p-button-text rounded-md ",
      acceptIcon: "none",
      rejectIcon: "none",
      acceptLabel: this.translate.instant('FINANCE.YES'),
      rejectLabel: this.translate.instant('FINANCE.NO'),
      accept: () => {
        this.deleteMainAccount(mainAccount);
      },
    });
  }

  handleHeaderAccountIconChange(icon: string, headerAccount: HeaderAccountModel) {
    headerAccount.icon = icon;
    const ha = new HeaderAccountModel(headerAccount);
    this.headerAccountService.update(ha).subscribe({
      next: res => {
        this.messageService.add({
          severity: 'success',
          summary: this.translate.instant('FINANCE.SUCCESS'),
          detail: this.translate.instant('FINANCE.HEADER_ACCOUNT_UPDATED')
        });
      },
      error: error => {
        console.log('Error Updating Header Account', error);
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail: this.translate.instant('FINANCE.HEADER_ACCOUNT_UPDATING_ERROR')
        });
      }
    });
  }

  handleDetailAccountIconChange(icon: string, detailAccount: DetailAccountModel) {
    detailAccount.icon = icon;
    const da = new DetailAccountModel(detailAccount);
    this.detailAccountService.update(da).subscribe({
      next: res => {
        this.messageService.add({
          severity: 'success',
          summary: this.translate.instant('FINANCE.SUCCESS'),
          detail: this.translate.instant('FINANCE.DETAIL_ACCOUNT_UPDATED')
        });
      },
      error: error => {
        console.log('Error Updating Detail Account', error);
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail: this.translate.instant('FINANCE.DETAIL_ACCOUNT_UPDATING_ERROR')
        });
      }
    });
  }

  handleRootAccountIconChange(icon: string, rootAccount: RootAccountModel) {
    rootAccount.icon = icon;
    const ra = new RootAccountModel(rootAccount);
    this.rootAccountService.update(ra).subscribe({
      next: res => {
        this.messageService.add({
          severity: 'success',
          summary: this.translate.instant('FINANCE.SUCCESS'),
          detail: this.translate.instant('FINANCE.ROOT_ACCOUNT_UPDATED')
        });
      },
      error: error => {
        console.log('Error Updating Root Account', error);
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail: this.translate.instant('FINANCE.ROOT_ACCOUNT_UPDATING_ERROR')
        });
      }
    });
  }

  handleMainAccountIconChange(icon: string, mainAccount: MainAccountModel) {
    mainAccount.icon = icon;
    const ma = new MainAccountModel(mainAccount);
    this.mainAccountService.update(ma).subscribe({
      next: res => {
        this.messageService.add({
          severity: 'success',
          summary: this.translate.instant('FINANCE.SUCCESS'),
          detail: this.translate.instant('FINANCE.MAIN_ACCOUNT_UPDATED')
        });
      },
      error: error => {
        console.log('Error Updating Main Account', error);
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail: this.translate.instant('FINANCE.MAIN_ACCOUNT_UPDATING_ERROR')
        });
      }
    });
  }
}
