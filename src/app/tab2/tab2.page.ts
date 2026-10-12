import { Component, inject, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  AlertController,
  IonButton,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonSearchbar,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonTitle,
  IonToolbar,
  ToastController,
} from '@ionic/angular';
import { SavedCounter } from '../models/saved-counter';
import { CounterService } from '../services/counter.service';

type HistorySort = 'recent' | 'name' | 'value-asc' | 'value-desc';

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  imports: [
    DatePipe,
    FormsModule,
    IonButton,
    IonContent,
    IonHeader,
    IonItem,
    IonLabel,
    IonList,
    IonNote,
    IonSearchbar,
    IonSelect,
    IonSelectOption,
    IonSpinner,
    IonTitle,
    IonToolbar,
  ],
})
export class Tab2Page implements OnInit {
  readonly counterService = inject(CounterService);
  private readonly alertController = inject(AlertController);
  private readonly toastController = inject(ToastController);

  searchTerm = '';
  sortBy: HistorySort = 'recent';

  get visibleCounters(): SavedCounter[] {
    const query = this.searchTerm.trim().toLocaleLowerCase('cs');
    const counters = this.counterService.counters().filter((counter) =>
      counter.name.toLocaleLowerCase('cs').includes(query),
    );

    if (this.sortBy === 'name') {
      return counters.sort((a, b) =>
        a.name.localeCompare(b.name, 'cs', { sensitivity: 'base' }),
      );
    }

    if (this.sortBy === 'value-asc') {
      return counters.sort((a, b) => a.value - b.value);
    }

    if (this.sortBy === 'value-desc') {
      return counters.sort((a, b) => b.value - a.value);
    }

    return counters;
  }

  get totalValue(): number {
    return this.counterService.counters().reduce(
      (total, counter) => total + counter.value,
      0,
    );
  }

  async ngOnInit(): Promise<void> {
    await this.counterService.initialize();
  }

  async remove(id: string): Promise<void> {
    await this.counterService.remove(id);
    await this.presentToast('Záznam byl odstraněn.');
  }

  async clear(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Vymazat historii?',
      message: 'Tuto akci nelze vrátit zpět.',
      buttons: [
        { text: 'Zrušit', role: 'cancel' },
        { text: 'Vymazat', role: 'confirm', cssClass: 'alert-button-danger' },
      ],
    });
    await alert.present();

    const { role } = await alert.onDidDismiss();
    if (role !== 'confirm') {
      return;
    }

    await this.counterService.clear();
    await this.presentToast('Historie byla vymazána.');
  }

  private async presentToast(message: string): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'bottom',
    });
    await toast.present();
  }
}