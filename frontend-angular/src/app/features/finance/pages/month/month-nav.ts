import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MonthSheet } from '../../../../core/api/models';
import { HelpTipComponent } from '../../../../shared/ui/help-tip/help-tip';
import { IconComponent } from '../../../../shared/ui/icon/icon';

/** Navigation de mois commune a « Mon mois » et a « Détails du mois » : precedent, suivant, retour au mois en cours. */
@Component({
  selector: 'ff-month-nav',
  imports: [IconComponent, HelpTipComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './month-nav.html',
  styleUrl: './month-nav.css',
})
export class MonthNavComponent {
  readonly title = input.required<string>();
  readonly period = input.required<MonthSheet['period']>();
  readonly help = input.required<string>();
  readonly shift = output<number>();
  readonly current = output<void>();
}
