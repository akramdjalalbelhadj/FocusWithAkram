import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { TransferApi } from '../../core/api/misc.api';
import { ImportReport, Settings } from '../../core/api/models';
import { AppError } from '../../core/interceptors/error.interceptor';
import { RefreshService } from '../../core/services/refresh.service';
import { SettingsStore } from '../../core/services/settings.store';
import { SHORTCUTS } from '../../core/services/shortcuts.service';
import { SoundService } from '../../core/services/sound.service';
import { ToastService } from '../../core/services/toast.service';
import { saveBlob } from '../../core/util/download';
import { IconComponent } from '../../shared/ui/icon';

@Component({
  selector: 'ff-settings-page',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="mb-6">
      <h1 class="page-title">Paramètres</h1>
      <p class="page-sub">Personnalisez l’apparence, le minuteur et vos données. Les changements sont enregistrés automatiquement.</p>
    </header>

    <div class="grid lg:grid-cols-2 gap-6 items-start">
      <section class="card p-5 space-y-5" aria-labelledby="s-look">
        <h2 id="s-look" class="font-bold text-lg">Apparence et région</h2>
        <fieldset>
          <legend class="field-label">Thème</legend>
          <div class="grid grid-cols-3 gap-2" role="radiogroup">
            @for (t of themes; track t.value) {
              <label class="cursor-pointer rounded-xl border p-3 text-center text-sm font-semibold has-[:focus-visible]:outline-2 outline-offset-2"
                [class]="s().theme === t.value ? 'border-brand bg-brand-soft text-brand' : 'border-line hover:bg-surface-2'">
                <input type="radio" name="theme" class="sr-only-text" [checked]="s().theme === t.value" (change)="set({ theme: t.value })" />
                <ff-icon [name]="t.icon" class="mx-auto mb-1" />{{ t.label }}
              </label>
            }
          </div>
        </fieldset>
        <div>
          <label class="field-label" for="set-tz">Fuseau horaire</label>
          <select id="set-tz" class="input" [value]="s().timeZone" (change)="set({ timeZone: $any($event.target).value })">
            @for (z of zones; track z) { <option [value]="z" [selected]="z === s().timeZone">{{ z }}</option> }
          </select>
          <p class="field-hint">Les dates sont stockées en UTC et affichées dans ce fuseau ; les statistiques et les archives regroupent les jours selon lui.</p>
        </div>
        <div>
          <label class="field-label" for="set-week">Premier jour de la semaine</label>
          <select id="set-week" class="input" [value]="s().weekStartsOn" (change)="set({ weekStartsOn: $any($event.target).value })">
            <option value="MONDAY">Lundi</option><option value="SATURDAY">Samedi</option><option value="SUNDAY">Dimanche</option>
          </select>
        </div>
        <label class="flex items-center gap-3"><input type="checkbox" class="size-4 accent-[var(--brand)]" [checked]="s().shortcutsEnabled" (change)="set({ shortcutsEnabled: $any($event.target).checked })" />Activer les raccourcis clavier à une touche</label>
        <label class="flex items-center gap-3"><input type="checkbox" class="size-4 accent-[var(--brand)]" [checked]="s().subtasksCompleteParent" (change)="set({ subtasksCompleteParent: $any($event.target).checked })" />
          <span>Les sous-tâches font avancer la tâche parente<span class="block text-xs text-muted">Désactivé par défaut : le statut ne change jamais sans votre action.</span></span></label>
      </section>

      <section class="card p-5 space-y-5" aria-labelledby="s-pomo">
        <h2 id="s-pomo" class="font-bold text-lg">Minuteur Pomodoro</h2>
        <div class="grid grid-cols-2 gap-3">
          @for (f of fields; track f.key) {
            <div>
              <label class="field-label" [for]="'p-' + f.key">{{ f.label }}</label>
              <input class="input" type="number" [id]="'p-' + f.key" [min]="f.min" [max]="f.max" [value]="s()[f.key]" (change)="num(f.key, $any($event.target).value, f.min, f.max)" />
            </div>
          }
          <div class="col-span-2">
            <label class="field-label" for="p-goal">Objectif quotidien de concentration (minutes)</label>
            <input class="input" id="p-goal" type="number" min="0" max="720" [value]="s().dailyFocusGoalMinutes" (change)="num('dailyFocusGoalMinutes', $any($event.target).value, 0, 720)" />
          </div>
        </div>
        <label class="flex items-center gap-3"><input type="checkbox" class="size-4 accent-[var(--brand)]" [checked]="s().autoStartBreaks" (change)="set({ autoStartBreaks: $any($event.target).checked })" />Démarrer automatiquement les pauses</label>
        <label class="flex items-center gap-3"><input type="checkbox" class="size-4 accent-[var(--brand)]" [checked]="s().autoStartWork" (change)="set({ autoStartWork: $any($event.target).checked })" />Enchaîner automatiquement la session suivante</label>
        <div class="grid grid-cols-2 gap-3 items-end">
          <div>
            <label class="field-label" for="p-sound">Son de fin de session</label>
            <select id="p-sound" class="input" [value]="s().soundName" [disabled]="!s().soundEnabled" (change)="set({ soundName: $any($event.target).value })">
              <option value="bell">Cloche</option><option value="chime">Carillon</option><option value="soft">Doux</option>
            </select>
          </div>
          <button type="button" class="btn btn-secondary" [disabled]="!s().soundEnabled" (click)="sound.play(s().soundName)"><ff-icon name="volume" />Écouter</button>
        </div>
        <label class="flex items-center gap-3"><input type="checkbox" class="size-4 accent-[var(--brand)]" [checked]="s().soundEnabled" (change)="set({ soundEnabled: $any($event.target).checked })" />Activer le son</label>
        <div>
          <label class="flex items-center gap-3"><input type="checkbox" class="size-4 accent-[var(--brand)]" [checked]="s().notificationsEnabled" (change)="toggleNotifications($any($event.target).checked)" />Notifications du navigateur</label>
          @if (permission() === 'denied') { <p class="field-error">Les notifications sont bloquées dans votre navigateur : autorisez-les pour ce site.</p> }
        </div>
      </section>

      <section class="card p-5 space-y-4 lg:col-span-2" aria-labelledby="s-data">
        <h2 id="s-data" class="font-bold text-lg">Données : export et import</h2>
        <div class="flex flex-wrap gap-2">
          <button type="button" class="btn btn-secondary" (click)="export('csv', 'ALL')"><ff-icon name="download" />Tâches (CSV)</button>
          <button type="button" class="btn btn-secondary" (click)="export('json', 'ALL')"><ff-icon name="download" />Tâches (JSON)</button>
          <button type="button" class="btn btn-primary" (click)="backup()"><ff-icon name="download" />Sauvegarde complète</button>
        </div>
        <div class="border-t border-line pt-4">
          <label class="field-label" for="imp">Importer une sauvegarde JSON</label>
          <input id="imp" type="file" accept="application/json,.json" class="input !py-1.5" (change)="onFile($any($event.target).files?.[0])" />
          <p class="field-hint">Le fichier est d’abord vérifié (aucune écriture) : les doublons (même identifiant, ou même titre et date de création) sont ignorés.</p>
          @if (report(); as r) {
            <div class="mt-3 rounded-xl border border-line bg-surface-2 p-4 text-sm" role="status">
              <p class="font-semibold mb-1">{{ r.dryRun ? 'Aperçu de l’import' : 'Import terminé' }}</p>
              <ul class="text-muted space-y-0.5">
                <li>Tâches : {{ r.tasksCreated }} à créer, {{ r.tasksSkipped }} ignorées (déjà présentes)</li>
                <li>Projets : {{ r.projectsCreated }} à créer, {{ r.projectsReused }} réutilisés</li>
                <li>Sessions Pomodoro : {{ r.sessionsCreated }} à créer, {{ r.sessionsSkipped }} ignorées</li>
              </ul>
              @if (r.errors.length) { <ul class="mt-2 text-danger list-disc pl-5">@for (e of r.errors; track e) { <li>{{ e }}</li> }</ul> }
              @if (r.dryRun && pending()) {
                <div class="flex gap-2 mt-3">
                  <button type="button" class="btn btn-primary btn-sm" (click)="confirmImport()">Confirmer l’import</button>
                  <button type="button" class="btn btn-ghost btn-sm" (click)="cancelImport()">Annuler</button>
                </div>
              }
            </div>
          }
        </div>
      </section>

      <section class="card p-5 lg:col-span-2" aria-labelledby="s-keys">
        <h2 id="s-keys" class="font-bold text-lg mb-3">Raccourcis clavier</h2>
        <ul class="grid sm:grid-cols-2 gap-x-8 divide-y sm:divide-y-0 divide-line">
          @for (k of shortcuts; track k.label) {
            <li class="flex items-center justify-between py-2"><span>{{ k.label }}</span><span class="flex gap-1">@for (key of k.keys; track key) { <kbd class="kbd">{{ key }}</kbd> }</span></li>
          }
        </ul>
      </section>
    </div>
  `,
})
export class SettingsPage {
  protected readonly store = inject(SettingsStore);
  protected readonly sound = inject(SoundService);
  private readonly transfer = inject(TransferApi);
  private readonly toast = inject(ToastService);
  private readonly refresh = inject(RefreshService);

  protected readonly s = this.store.settings;
  protected readonly shortcuts = SHORTCUTS;
  protected readonly zones = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.('timeZone') ?? ['Europe/Paris', 'UTC'];
  protected readonly permission = signal<NotificationPermission | 'unsupported'>('Notification' in window ? Notification.permission : 'unsupported');
  protected readonly report = signal<ImportReport | null>(null);
  protected readonly pending = signal<unknown>(null);

  protected readonly themes = [
    { value: 'LIGHT' as const, label: 'Clair', icon: 'sun' },
    { value: 'DARK' as const, label: 'Sombre', icon: 'moon' },
    { value: 'SYSTEM' as const, label: 'Système', icon: 'monitor' },
  ];

  protected readonly fields = [
    { key: 'workMinutes', label: 'Travail (min)', min: 1, max: 180 },
    { key: 'shortBreakMinutes', label: 'Pause courte (min)', min: 1, max: 60 },
    { key: 'longBreakMinutes', label: 'Pause longue (min)', min: 1, max: 120 },
    { key: 'sessionsBeforeLong', label: 'Sessions avant pause longue', min: 1, max: 12 },
  ] as const;

  protected async set(patch: Partial<Settings>): Promise<void> {
    try {
      await this.store.update(patch);
      this.refresh.bump();
    } catch (e) {
      this.toast.error(e instanceof AppError ? e.problem.detail : 'Impossible d’enregistrer.');
    }
  }

  protected async num(key: keyof Settings, raw: string, min: number, max: number): Promise<void> {
    const v = Math.round(Number(raw));
    if (!Number.isFinite(v) || v < min || v > max) {
      this.toast.error(`Valeur comprise entre ${min} et ${max} attendue.`);
      return;
    }
    await this.set({ [key]: v } as Partial<Settings>);
  }

  protected async toggleNotifications(on: boolean): Promise<void> {
    if (on && 'Notification' in window && Notification.permission !== 'granted') {
      const p = await Notification.requestPermission();
      this.permission.set(p);
      if (p !== 'granted') {
        this.toast.error('Permission refusée : les notifications restent désactivées.');
        await this.set({ notificationsEnabled: false });
        return;
      }
    }
    await this.set({ notificationsEnabled: on });
  }

  protected async export(format: 'csv' | 'json', scope: 'ACTIVE' | 'ARCHIVED' | 'ALL'): Promise<void> {
    try {
      saveBlob(await firstValueFrom(this.transfer.exportTasks(format, scope)), `focusflow-taches.${format}`);
    } catch {
      this.toast.error('L’export a échoué.');
    }
  }

  protected async backup(): Promise<void> {
    try {
      saveBlob(await firstValueFrom(this.transfer.backup()), `focusflow-sauvegarde-${this.store.today()}.json`);
    } catch {
      this.toast.error('La sauvegarde a échoué.');
    }
  }

  protected async onFile(file: File | undefined): Promise<void> {
    this.report.set(null);
    this.pending.set(null);
    if (!file) return;
    try {
      const json: unknown = JSON.parse(await file.text());
      this.pending.set(json);
      this.report.set(await firstValueFrom(this.transfer.importBackup(json, true)));
    } catch (e) {
      this.pending.set(null);
      this.toast.error(e instanceof AppError ? e.problem.detail : 'Fichier JSON invalide.');
    }
  }

  protected async confirmImport(): Promise<void> {
    try {
      this.report.set(await firstValueFrom(this.transfer.importBackup(this.pending(), false)));
      this.pending.set(null);
      this.toast.success('Import terminé.');
      this.refresh.bump();
    } catch (e) {
      this.toast.error(e instanceof AppError ? e.problem.detail : 'L’import a échoué.');
    }
  }

  protected cancelImport(): void {
    this.pending.set(null);
    this.report.set(null);
  }
}
