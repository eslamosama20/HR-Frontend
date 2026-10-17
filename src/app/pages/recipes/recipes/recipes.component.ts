import {Component, LOCALE_ID, OnInit, signal, ViewChild} from '@angular/core';
import {Table} from "primeng/table";
import {ConfirmationService, MessageService, PrimeNGConfig} from "primeng/api";
import {TranslateService} from "@ngx-translate/core";
import {TranslationService} from "../../../modules/i18n";
import {AuthService} from "../../../modules/auth";
import { FormBuilder, FormGroup} from "@angular/forms";
import {PermissionModel} from "../../../models/auth/permission.model";
import {UserAccountModel} from "../../../models/auth/userAccount.model";
import {Router} from "@angular/router";
import {RecipeService} from "../../../services/recipes/recipe.service";
import {RecipeModel} from "../../../models/recipes/recipe.model";
import {OverlayPanel} from "primeng/overlaypanel";

interface Column {
  field: string;
  header: string;
  filter?: boolean;
  filterType?: string;
}
@Component({
  selector: 'app-recipes',
  templateUrl: './recipes.component.html',
  styleUrl: './recipes.component.scss',
  providers: [ConfirmationService, MessageService, {provide: LOCALE_ID, useValue: 'ar-SA'}]
})
export class RecipesComponent implements OnInit{
  @ViewChild('opRecipe') opRecipe!: OverlayPanel;
  selectedRecipe: RecipeModel | null = null;

  recipesSignal = signal([]);
  recipeEntriesSignal = signal([]);

  loading: boolean = true;
  searchValueSignal = signal('');
  userPermissionsSignal = signal<PermissionModel[]>([]);

  public activeLanguage: string = 'en';
  theme = localStorage.getItem('kt_theme_mode_value') || 'light';
  public translate : TranslateService;
  columns!: Column[];

  private router: Router;

  constructor(
    private recipeService : RecipeService,
    private fb: FormBuilder,
    private authService: AuthService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private translateService: TranslateService,
    public translationService: TranslationService,
    router: Router
  ) {
    this.router = router;
    this.translate = translateService;
    this.activeLanguage = translationService.getSelectedLanguage();
    this.authService.getUserByToken().subscribe(
      (res : UserAccountModel) => {
        if (res) {
          this.userPermissions= res.userRoles.map(ur => ur.role.rolePermissions.map(rp => rp.permission))
            .reduce((acc, val) => acc.concat(val), []);
        }
      }
    );
  }

  ngOnInit(): void {
    this.loadRecipes()

    this.columns = [
      {field: 'referenceNumber', header: this.translate.instant('DATA.RECIPE_REFERENCE_NUMBER') , filter: true , filterType: 'text'},
      {field: 'mainSalesClassName', header: this.translate.instant('DATA.RECIPE_NAME')},
      {field: 'description', header: this.translate.instant('FINANCE.DESCRIPTION') , filter: true , filterType: 'text'},
      {field: 'createdAt', header: this.translate.instant('FINANCE.CREATED_AT'), filter: true , filterType: 'date'},
    ];
  }


  loadRecipes() {
    this.loading = true;
    this.recipeService.getAll().subscribe({
      next: recipes => {
        this.recipes = recipes.map(x => {
          x.createdAt = new Date(x.createdAt);
          x.mainSalesClassName = this.activeLanguage == "en" ? `${x.mainSalesClass.englishName} | ${x.mainSalesClass.referenceCode}` : `${x.mainSalesClass.arabicName} | ${x.mainSalesClass.referenceCode}`;
          return x;
        })
        this.loading = false;
      },
      error: error => {
        console.log('Error Loading Recipes', error);
        this.messageService.add({ severity: 'error', summary: this.translate.instant('FINANCE.ERROR'), detail: this.translate.instant('FINANCE.DATA_LOADING_ERROR') });
        this.loading = false;
      }
    });
  }


  get recipes() {
    return this.recipesSignal();
  }
  set recipes(value) {
    this.recipesSignal.set(value);
  }

  get searchValue() {
    return this.searchValueSignal();
  }
  set searchValue(value) {
    this.searchValueSignal.set(value);
  }

  get userPermissions(): PermissionModel[] {
    return this.userPermissionsSignal()
  }
  set userPermissions(permissions: PermissionModel[]) {
    this.userPermissionsSignal.set(permissions);
  }

  public hasPermission(permission : string): boolean {
    return this.userPermissions.some(x => x.name === permission)
  }
  clear(table: Table) {
    table.clear();
    this.searchValue = ''
  }

  filter(dt1: Table, event: Event) {
    const target = event.target as HTMLInputElement;

    dt1.filterGlobal(target.value, 'contains')
  }


  deleteRecipe(recipe: RecipeModel) {
    this.loading = true;
    this.recipeService.delete(recipe.id).subscribe(res => {
      this.messageService.add({ severity: 'info', summary: this.translate.instant('FINANCE.CONFIRMED'), detail: this.translate.instant('DATA.RECIPE_DELETED') });
      this.loadRecipes();
    });
  }

  confirmRecipeDeletion(event: Event , recipe: RecipeModel) {
    this.confirmationService.confirm({
        target: event.target as EventTarget,
        message: this.translate.instant('DATA.CONFIRM_RECIPE_DELETE', {referenceNumber: recipe.referenceNumber}),
        header: this.translate.instant('DATA.RECIPE_DELETE_CONFIRMATION'),
        icon: 'pi pi-info-circle',
        acceptButtonStyleClass:"p-button-danger p-button-text rounded-md ",
        rejectButtonStyleClass:"p-button-text p-button-text rounded-md ",
        acceptIcon:"none",
        rejectIcon:"none",
        acceptLabel : this.translate.instant('FINANCE.YES'),
        rejectLabel : this.translate.instant('FINANCE.NO'),
        accept: () => {
            this.deleteRecipe(recipe);
        },
    });
  }

  toggleCogOverlay(event: Event, recipe: RecipeModel) {
    event.stopPropagation();
    const isVisible = this.opRecipe?.overlayVisible;
    const isDifferent = this.selectedRecipe?.id !== recipe.id;
    this.selectedRecipe = recipe;

    if (isVisible && isDifferent) {
      this.opRecipe.hide();
      setTimeout(() => {
        this.opRecipe.show(event, event.currentTarget as HTMLElement);
      }, 50);
    } else {
      this.opRecipe.toggle(event, event.currentTarget as HTMLElement);
    }
  }

  openContextMenu(event: MouseEvent, recipe: RecipeModel) {
    event.preventDefault();
    event.stopPropagation();

    this.selectedRecipe = recipe;
    this.opRecipe.show(event);

    setTimeout(() => {
      const panelEl = this.opRecipe?.container as HTMLElement;
      if (panelEl) {
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const panelRect = panelEl.getBoundingClientRect();

        let left = event.clientX;
        let top = event.clientY;

        // Prevent overflowing right
        if (left + panelRect.width > viewportWidth) {
          left = viewportWidth - panelRect.width - 15;
        }
        if (left < 15) {
          left = 15;
        }

        // Prevent overflowing bottom
        if (top + panelRect.height > viewportHeight) {
          top = viewportHeight - panelRect.height - 15;
        }
        if (top < 15) {
          top = 15;
        }

        panelEl.style.position = 'fixed';
        panelEl.style.left = `${left}px`;
        panelEl.style.top = `${top}px`;
        panelEl.style.transform = 'none';
        panelEl.style.margin = '0';
        panelEl.style.zIndex = '99999';
      }
    }, 0);
  }

  navigateToAddRecipe() {
    this.router.navigate(['/recipes/new']);
  }
  navigateToRecipe(recipe: RecipeModel) {
    this.router.navigate(['/recipes/', recipe.id]);
  }
}
