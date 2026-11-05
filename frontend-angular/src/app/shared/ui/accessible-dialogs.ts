import { CdkDialogContainer, DEFAULT_DIALOG_CONFIG, Dialog, DialogConfig } from '@angular/cdk/dialog';
import {
  EnvironmentProviders,
  Injector,
  afterNextRender,
  inject,
  makeEnvironmentProviders,
  provideEnvironmentInitializer,
} from '@angular/core';

/**
 * Accessibilite des dialogues CDK.
 *
 * Le conteneur CDK porte deja role="dialog", sans nom et avec aria-modal="false" par defaut ; nos composants de
 * dialogue declarent aussi role="dialog" et leur nom (aria-labelledby vers leur titre, ou aria-label) sur leur racine.
 * Un lecteur d'ecran annoncait donc un dialogue sans nom contenant un dialogue nomme, sans confinement declare.
 *
 * Ici : aria-modal="true" par defaut, et a chaque ouverture le nom du contenu passe au conteneur, le role en double
 * etant retire du contenu. Les composants gardent leurs attributs : un seul endroit a maintenir.
 */
export function provideAccessibleDialogs(): EnvironmentProviders {
  return makeEnvironmentProviders([
    // Valeurs par defaut completes : la configuration fournie remplace celle du CDK, elle ne la complete pas.
    { provide: DEFAULT_DIALOG_CONFIG, useValue: { ...new DialogConfig(), ariaModal: true } },
    provideEnvironmentInitializer(() => {
      const injector = inject(Injector);
      inject(Dialog).afterOpened.subscribe((ref) => {
        afterNextRender(() => nameDialogFromContent(ref.overlayRef.overlayElement, ref.containerInstance), {
          injector,
        });
      });
    }),
  ]);
}

/**
 * Donne au conteneur le nom (et la description) declares par le contenu et retire au contenu son role en double ;
 * un contenu « alertdialog » (confirmation) transmet aussi ce role au conteneur.
 */
export function nameDialogFromContent(overlay: HTMLElement, container: unknown): void {
  const host = overlay.querySelector<HTMLElement>('.cdk-dialog-container');
  const inner = host?.querySelector<HTMLElement>('[role="dialog"], [role="alertdialog"]');
  if (!host || !inner) return;
  const labelledBy = inner.getAttribute('aria-labelledby');
  const label = inner.getAttribute('aria-label');
  const describedBy = inner.getAttribute('aria-describedby');
  if (labelledBy) {
    // Meme mecanisme qu'Angular Material pour ses titres de dialogue.
    (container as Partial<CdkDialogContainer>)._addAriaLabelledBy?.(labelledBy);
    if (!host.hasAttribute('aria-labelledby')) host.setAttribute('aria-labelledby', labelledBy);
  } else if (label && !host.hasAttribute('aria-label')) {
    host.setAttribute('aria-label', label);
  }
  if (describedBy && !host.hasAttribute('aria-describedby')) host.setAttribute('aria-describedby', describedBy);
  if (inner.getAttribute('role') === 'alertdialog') host.setAttribute('role', 'alertdialog');
  for (const attr of ['role', 'aria-labelledby', 'aria-label', 'aria-describedby']) inner.removeAttribute(attr);
}
