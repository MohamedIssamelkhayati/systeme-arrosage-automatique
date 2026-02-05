import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, ViewEncapsulation, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Database, ref, onValue } from '@angular/fire/database';

interface RealtimeData {
  humidite: number;
  seuil: number;
  pompe_active: boolean;
  pompe_manuelle: boolean;
  timestamp: string;
}

interface HistoryPoint {
  timestamp: string;
  humidite: number;
  seuil: number;
  pompe_active: boolean;
}

interface HumidityStatus {
  text: string;
  color: string;
  bg: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class AppComponent implements OnInit, OnDestroy {
  realtimeData: RealtimeData = {
    humidite: 0,
    seuil: 500,
    pompe_active: false,
    pompe_manuelle: false,
    timestamp: ''
  };

  historique: HistoryPoint[] = [];
  selectedPeriod: string = '24h';
  periods: string[] = ['24h', '7j', '30j'];
  isConnected: boolean = true;
  status: HumidityStatus = { text: '', color: '', bg: '' };

  gridLines: any[] = [];
  yAxisLabels: any[] = [];
  xAxisLabels: string[] = [];

   constructor(private db: Database) {}

  ngOnInit(): void {
  this.setupGridAndLabels();

  const dataRef = ref(this.db, 'measurements');
  onValue(dataRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      // Dernier élément pour le temps réel
      const keys = Object.keys(data);
      const lastKey = keys[keys.length - 1];
      const lastMeasurement = data[lastKey];

      this.realtimeData = {
        humidite: lastMeasurement.humidite,
        seuil: lastMeasurement.seuil,
        pompe_active: lastMeasurement.pompe_active,
        pompe_manuelle: lastMeasurement.pompe_manuelle,
        timestamp: lastMeasurement.timestamp
      };

      this.updateStatus();

      // Générer le graphe avec tout l'historique
      this.generateHistoryFromFirebase(data);
    }
  });
}

// --- Fonction séparée dans le composant ---
generateHistoryFromFirebase(data: any): void {
  const history: HistoryPoint[] = [];
  const keys = Object.keys(data);

  for (let key of keys) {
    const m = data[key];
    history.push({
      timestamp: m.timestamp,
      humidite: m.humidite,
      seuil: m.seuil,
      pompe_active: m.pompe_active
    });
  }

  // Tri par timestamp pour que le graphe soit correct
  history.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  this.historique = history;
  this.updateXAxisLabels();
}


  ngOnDestroy(): void {
    // aucun intervalle à clear
  }

  // Génère l'historique basé sur les valeurs réelles de Firebase
  generateHistoryFromRealtime(): void {
    const data: HistoryPoint[] = [];
    const now = new Date();
    const points = this.selectedPeriod === '24h' ? 48 : this.selectedPeriod === '7j' ? 168 : 720;
    const interval = this.selectedPeriod === '24h' ? 30 : 60;

    for (let i = points; i >= 0; i--) {
      const time = new Date(now.getTime() - i * interval * 60000);
      data.push({
        timestamp: time.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        humidite: this.realtimeData.humidite,
        seuil: this.realtimeData.seuil,
        pompe_active: this.realtimeData.pompe_active
      });
    }

    this.historique = data;
    this.updateXAxisLabels();
  }

  setupGridAndLabels(): void {
    this.gridLines = [];
    for (let i = 0; i <= 5; i++) this.gridLines.push({ x1: 0, y1: i * 70, x2: 800, y2: i * 70 });
    for (let i = 0; i <= 10; i++) this.gridLines.push({ x1: i * 80, y1: 0, x2: i * 80, y2: 350 });

    this.yAxisLabels = [
      { value: 800, y: 20 },
      { value: 600, y: 110 },
      { value: 400, y: 200 },
      { value: 200, y: 290 }
    ];
  }

  updateXAxisLabels(): void {
    const step = Math.floor(this.historique.length / 8);
    this.xAxisLabels = [];
    for (let i = 0; i < this.historique.length; i += step) {
      if (this.historique[i]) this.xAxisLabels.push(this.historique[i].timestamp);
    }
  }

  getYPosition(value: number): number {
    return 350 - ((value - 200) / 600) * 350;
  }

  getLinePath(): string {
    if (this.historique.length === 0) return '';
    const points = this.historique.map((point, index) => {
      const x = (index / (this.historique.length - 1)) * 800;
      const y = this.getYPosition(point.humidite);
      return `${x},${y}`;
    });
    return 'M' + points.join(' L');
  }

  getAreaPath(): string {
    if (this.historique.length === 0) return '';
    const linePath = this.getLinePath();
    const lastX = 800;
    const bottomY = 350;
    return `${linePath} L${lastX},${bottomY} L0,${bottomY} Z`;
  }

  togglePompe(): void {
    this.realtimeData = {
      ...this.realtimeData,
      pompe_manuelle: !this.realtimeData.pompe_manuelle,
      pompe_active: !this.realtimeData.pompe_manuelle
    };
  }

  updateSeuil(newSeuil: number): void {
    this.realtimeData = {
      ...this.realtimeData,
      seuil: parseInt(newSeuil.toString())
    };
  }

  setSelectedPeriod(period: string): void {
    this.selectedPeriod = period;
    this.generateHistoryFromRealtime();
  }

  updateStatus(): void {
    const { humidite, seuil } = this.realtimeData;
    if (humidite < seuil - 100) this.status = { text: 'Très sec', color: 'text-red-600', bg: 'bg-red-100' };
    else if (humidite < seuil) this.status = { text: 'Sec', color: 'text-orange-600', bg: 'bg-orange-100' };
    else if (humidite < seuil + 100) this.status = { text: 'Optimal', color: 'text-green-600', bg: 'bg-green-100' };
    else this.status = { text: 'Humide', color: 'text-blue-600', bg: 'bg-blue-100' };
  }
}
