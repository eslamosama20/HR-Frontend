import {ChangeDetectorRef, Component, OnInit, AfterViewInit, signal} from '@angular/core';
import {AuthService} from "../../../../../modules/auth";
import {UserRoleModel} from "../../../../../models/auth/userRole.model";
import {UserAccountModel} from "../../../../../models/auth/userAccount.model";
import {RoleModel} from "../../../../../models/auth/role.model";
import { CompanyDataService } from 'src/app/services/companyData/company-data.service';
import { Router } from '@angular/router';
import { HotelDialogService } from 'src/app/services/hotels/hotel-dialog.service';
import { MenuComponent } from '../../../../kt/components';

@Component({
  selector: 'app-sidebar-menu',
  templateUrl: './sidebar-menu.component.html',
  styleUrls: ['./sidebar-menu.component.scss']
})
export class SidebarMenuComponent implements OnInit, AfterViewInit {

  userRolesSignal = signal<RoleModel[]>([]);

  companyId: any;
  constructor(
    private authService: AuthService,
    private companyDataService: CompanyDataService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private hotelDialogService: HotelDialogService,
  ) {
    authService.getUserByToken().subscribe(
      (res : UserAccountModel) => {
        if (res) {
          this.UserRoles=res.userRoles.map(ur => ur.role);
          this.cdr.markForCheck();
          setTimeout(() => {
            MenuComponent.reinitialization();
          }, 150);
        }
      }
    );
  }



  get UserRoles(): RoleModel[] {
    return this.userRolesSignal()
  }

  set UserRoles(roles: RoleModel[]) {
    this.userRolesSignal.set(roles);
  }

  public userHasDomain(domain: string) {
    return this.UserRoles.some(userRole => userRole?.domainDetails?.name === domain);
  }

  public userHasRole(role: string): boolean {
    return this.UserRoles.some(userRole => userRole.name === role);
  }

  public userHasPermission(permission: string): boolean {
    return this.authService.hasPermission(permission);
  }

  public userHasAllPermissions(permissions: string[]): boolean {
    return permissions.every(p => this.authService.hasPermission(p));
  }

  userHasAnyPermission(permissions: string[]): boolean {
    return this.authService.hasAnyPermission(permissions);
  }

  public userHasAnyStatusPermission(): boolean {
    return this.UserRoles.some(userRole => userRole.rolePermissions.some(rolePermission => rolePermission.permission.name.includes('Status')));
  }

  public userHasAnyJournalPermission(): boolean {
    return this.UserRoles.some(userRole => userRole.rolePermissions.some(rolePermission => rolePermission.permission.name.includes('Transaction')));
  }

  navigateAndOpenAddHotel(): void {
    this.router.navigate(['/hotels']).then(() => {
      // Small delay to ensure the component has initialised before triggering the dialog
      setTimeout(() => this.hotelDialogService.triggerOpenDialog(), 150);
    });
  }

  ngOnInit(): void {
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      MenuComponent.reinitialization();
    }, 200);
  }
}
