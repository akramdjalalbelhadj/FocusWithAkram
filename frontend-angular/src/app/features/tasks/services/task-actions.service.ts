import { Dialog } from '@angular/cdk/dialog';
import { Overlay } from '@angular/cdk/overlay';
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { QUADRANT_META, Quadrant, Task, TaskStatus } from '../../../core/api/models';
import { TasksApi } from '../../../core/api/tasks.api';
import { PomodoroEngine } from '../../../core/services/pomodoro.engine';
import { RefreshService } from '../../../core/services/refresh.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmDialogComponent, StartDateDialogComponent } from '../../../shared/ui/dialogs/index';
import { TaskDetailPanelComponent } from '../components/task-detail/task-detail.panel';
import { TaskFormData, TaskFormDialogComponent } from '../components/task-form/task-form.dialog';

/**
 * Facade des actions sur une tache, partagee par toutes les pages (matrice, listes, dashboard, calendrier...).
 * Chaque action appelle l'API, informe l'utilisateur et incremente `RefreshService` : toutes les vues
 * actives se rechargent donc a partir de la meme source de verite.
 */
@Injectable({ providedIn: 'root' })
export class TaskActions {
  private readonly dialog = inject(Dialog);
  private readonly overlay = inject(Overlay);
  private readonly api = inject(TasksApi);
  private readonly refresh = inject(RefreshService);
  private readonly toast = inject(ToastService);
  private readonly engine = inject(PomodoroEngine);
  private readonly router = inject(Router);

  async create(data: TaskFormData = {}): Promise<Task | undefined> {
    const saved = await firstValueFrom(
      this.dialog.open<Task, TaskFormData>(TaskFormDialogComponent, {
        data,
        backdropClass: 'ff-backdrop',
        ariaModal: true,
        maxWidth: '100vw',
      }).closed,
    );
    if (saved) {
      this.toast.success(
        data.task
          ? 'Tâche mise à jour.'
          : data.fromNote
            ? `Tâche créée dans la matrice : ${saved.quadrant} · ${QUADRANT_META[saved.quadrant].label}.`
            : 'Tâche créée.',
      );
      this.refresh.bump();
    }
    return saved;
  }

  edit(task: Task): Promise<Task | undefined> {
    return this.create({ task });
  }

  openDetail(id: string): void {
    this.dialog.open(TaskDetailPanelComponent, {
      data: { id },
      backdropClass: 'ff-backdrop',
      positionStrategy: this.overlay.position().global().right('0').top('0'),
      height: '100dvh',
      maxWidth: '100vw',
      panelClass: 'ff-side-panel',
    });
  }

  async start(task: Task, retroactive = false): Promise<void> {
    let start: string | null = null;
    if (retroactive) {
      start = await this.askStart(
        'Corriger la date de début réel',
        'Vous avez commencé avant de le déclarer ? Indiquez le moment réel du début. Cette correction remplace la date actuelle.',
        task.actualStartAt,
        'Corriger la date',
      );
      if (!start) return;
    }
    await this.run(
      () => this.api.start(task.id, start),
      retroactive ? 'Date de début corrigée.' : 'Tâche démarrée.',
    );
  }

  async pause(task: Task): Promise<void> {
    await this.setStatus(task, 'TODO', 'Tâche remise à faire (début réel conservé).');
  }

  /** Termine et archive. Sans début reel connu, on le demande explicitement plutot que de l'inventer. */
  async complete(task: Task): Promise<void> {
    let start: string | null = null;
    if (!task.actualStartAt) {
      start = await this.askStart(
        'Quand avez-vous commencé ?',
        `« ${task.title} » n'a jamais été démarrée. Indiquez la date de début réelle pour terminer la tâche.`,
        task.plannedStartAt && Date.parse(task.plannedStartAt) <= Date.now()
          ? task.plannedStartAt
          : null,
        'Terminer la tâche',
      );
      if (!start) return;
    }
    await this.run(
      () => this.api.complete(task.id, { actualStartAt: start }),
      'Tâche terminée et archivée.',
    );
  }

  async restore(task: Task): Promise<void> {
    await this.run(() => this.api.restore(task.id), 'Tâche restaurée : un nouveau cycle commence.');
  }

  async setStatus(task: Task, status: TaskStatus, message = 'Statut mis à jour.'): Promise<void> {
    if (status === 'DONE') return this.complete(task);
    if (status === 'IN_PROGRESS') return this.start(task);
    await this.run(() => this.api.changeStatus(task.id, status), message);
  }

  async moveTo(task: Task, quadrant: Quadrant): Promise<void> {
    if (task.quadrant === quadrant) return;
    await this.run(() => this.api.moveToQuadrant(task.id, quadrant), `Déplacée vers ${quadrant}.`);
  }

  async duplicate(task: Task): Promise<void> {
    await this.run(() => this.api.duplicate(task.id), 'Tâche dupliquée.');
  }

  async remove(task: Task): Promise<boolean> {
    const ok = await firstValueFrom(
      this.dialog.open<boolean>(ConfirmDialogComponent, {
        data: {
          title: 'Supprimer cette tâche ?',
          message: `« ${task.title} » sera supprimée définitivement, avec ses sous-tâches et son historique.`,
          confirmLabel: 'Supprimer',
          danger: true,
        },
        backdropClass: 'ff-backdrop',
      }).closed,
    );
    if (!ok) return false;
    return (await this.run(() => this.api.delete(task.id), 'Tâche supprimée.')) !== undefined;
  }

  /** Lance une session de concentration sur la tache, puis ouvre la page Focus. */
  async focusOn(task: Task): Promise<void> {
    if (this.engine.isActive()) {
      this.toast.info('Une session est déjà en cours.');
    } else if (!(await this.engine.start('WORK', task.id))) {
      return;
    }
    void this.router.navigate(['/focus']);
  }

  async toggleSubtask(task: Task, subtaskId: string, done: boolean): Promise<Task | undefined> {
    return this.run(() => this.api.updateSubtask(task.id, subtaskId, { done }));
  }

  private async askStart(
    title: string,
    message: string,
    suggested: string | null,
    confirmLabel: string,
  ): Promise<string | null> {
    const result = await firstValueFrom(
      this.dialog.open<string | null>(StartDateDialogComponent, {
        data: { title, message, suggested, confirmLabel },
        backdropClass: 'ff-backdrop',
      }).closed,
    );
    return result ?? null;
  }

  private async run<T>(
    call: () => import('rxjs').Observable<T>,
    success?: string,
  ): Promise<T | undefined> {
    try {
      const result = await firstValueFrom(call());
      if (success) this.toast.success(success);
      this.refresh.bump();
      return result ?? (true as T);
    } catch (e) {
      this.toast.errorFrom(e);
      return undefined;
    }
  }
}
