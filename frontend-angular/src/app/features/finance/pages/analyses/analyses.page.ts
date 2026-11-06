import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';
import { IconComponent } from '../../../../shared/ui/icon/icon';
import { FinanceCalendarPage } from '../calendar/finance-calendar.page';
import { FinanceStatisticsPage } from '../statistics/finance-statistics.page';

type View = 'statistics' | 'calendar';

/** Analyses : statistiques des mois passes ou calendrier du mois. L'affichage choisi est dans l'adresse (`?vue=`). */
@Component({
  selector: 'ff-finance-analyses',
  imports: [IconComponent, FinanceStatisticsPage, FinanceCalendarPage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './analyses.page.html',
})
export class FinanceAnalysesPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly view = toSignal(
    this.route.queryParamMap.pipe(
      map((p): View => (p.get('vue') === 'calendrier' ? 'calendar' : 'statistics')),
    ),
    { initialValue: 'statistics' as View },
  );

  protected setView(view: View): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { vue: view === 'calendar' ? 'calendrier' : null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}
