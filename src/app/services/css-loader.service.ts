import {Injectable, Renderer2, RendererFactory2} from "@angular/core";
@Injectable({
  providedIn: 'root'
})
export class CssLoaderService {
  renderer: Renderer2;

  constructor(rendererFactory: RendererFactory2) {
    this.renderer = rendererFactory.createRenderer(null, null);
  }


  loadCSS(url: string) {
    const existingLink = document.getElementById('theme-css');
    if (existingLink) {
      this.renderer.setAttribute(existingLink, 'href', url);
    } else {
      const link = this.renderer.createElement('link');
      this.renderer.setAttribute(link, 'rel', 'stylesheet');
      this.renderer.setAttribute(link, 'id', 'theme-css');
      this.renderer.setAttribute(link, 'href', url);
      this.renderer.appendChild(document.head, link);
    }
  }
}
