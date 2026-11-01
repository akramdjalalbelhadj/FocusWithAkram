import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AppError } from '../../../../core/api/app-error';
import { FinanceApi } from '../../../../core/api/finance.api';
import { FinanceCategory } from '../../../../core/api/models';
import { IconComponent } from '../../../../shared/ui/icon/icon';
import { COLORS } from '../../../projects/constants/colors';
import { CATEGORY_ICONS } from '../../finance-labels';
import { FinanceReferenceStore } from '../../services/finance-reference.store';

export interface CategoryDialogData {
  category: FinanceCategory | null;
  /** Parent propose a la creation d'une sous-categorie. */
  parentId?: string | null;
}

/** Creation ou modification d'une categorie (deux niveaux : racine ou sous-categorie). */
@Component({
  selector: 'ff-category-dialog',
  imports: [ReactiveFormsModule, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './category-dialog.html',
})
export class CategoryDialogComponent {
  private readonly api = inject(FinanceApi);
  private readonly store = inject(FinanceReferenceStore);
  protected readonly data = inject<CategoryDialogData>(DIALOG_DATA);
  protected readonly ref = inject<DialogRef<boolean>>(DialogRef);
  protected readonly icons = CATEGORY_ICONS;
  protected readonly colors = COLORS;
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  private readonly current = this.data.category;
  protected readonly form = inject(FormBuilder).nonNullable.group({
    name: [this.current?.name ?? '', [Validators.required, Validators.maxLength(60)]],
    parentId: [this.current?.parentId ?? this.data.parentId ?? ''],
    icon: [this.current?.icon ?? 'tag'],
    color: [this.current?.color ?? COLORS[0]],
  });
  /** Une categorie qui a des sous-categories reste racine (deux niveaux au plus). */
  protected readonly canHaveParent = !this.current?.children.length;
  protected readonly parents = computed(() =>
    this.store.activeCategories().filter((c) => c.id !== this.current?.id),
  );

  protected async submit(): Promise<void> {
    this.form.markAllAsTouched();
    const v = this.form.getRawValue();
    if (this.form.invalid || !v.name.trim()) return;
    const root = !v.parentId;
    const body = {
      name: v.name.trim(),
      parentId: v.parentId || null,
      icon: root ? v.icon : null,
      color: root ? v.color : null,
      position: this.current?.position ?? 0,
      archived: this.current?.archived ?? false,
    };
    this.saving.set(true);
    try {
      await firstValueFrom(
        this.current
          ? this.api.updateCategory(this.current.id, body)
          : this.api.createCategory(body),
      );
      this.ref.close(true);
    } catch (e) {
      this.error.set(e instanceof AppError ? e.problem.detail : 'Erreur inattendue.');
    } finally {
      this.saving.set(false);
    }
  }
}
