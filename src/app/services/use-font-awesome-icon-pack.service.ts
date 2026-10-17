import { Injectable } from '@angular/core';
import { IconDefinition, library } from '@fortawesome/fontawesome-svg-core';
import { fas } from '@fortawesome/free-solid-svg-icons';

@Injectable({
  providedIn: 'root'
})
export class UseFontAwesomeIconPackService {
  private iconPack: IconDefinition[] | undefined;

  constructor() {
    this.initializeIconPack();
  }

  private initializeIconPack() {
    console.log('initializeIconPack');
    if (!this.iconPack) {
      // Create a Set to ensure uniqueness
      const iconSet = new Set<IconDefinition>();

      // Check for existence and add icons to the Set
      Object.values(fas).forEach((icon) => {
        if (icon.iconName && icon.prefix) {
          iconSet.add(icon);  // Add only valid icons
        }
      });

      // Convert Set back to an array
      this.iconPack = Array.from(iconSet);

      // Add the icons to the FontAwesome library
      library.add(...this.iconPack);
    }
  }

  getIconPack(): IconDefinition[] {
    if (!this.iconPack) {
      this.initializeIconPack();  // Load the icons only when needed
    }
    return this.iconPack!;
  }
}
