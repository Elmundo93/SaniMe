// Dev-Werkzeug: setzt den Status einer Versorgung so, wie es unser Team in der
// Admin-App (apps/admin) täte — für schnelle Tests ohne Login. Bootet das Backend
// ohne HTTP und ruft SupplyOrderService.transitionOrder — Push, Aufgaben und
// Verlauf entstehen also genau wie im Betrieb.
//
//   npm run backend:versorgung-status -- AntragVersendet
//   npm run backend:versorgung-status -- InsuranceApproved <supplyId>
//
// Ohne supplyId: die zuletzt angelegte Versorgung.
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import type { SupplyEvent } from '@sanime/domain';
import { AppModule } from '../src/app.module';
import { DEFAULT_TENANT_CONTEXT } from '../src/common/repository/tenant-context';
import { SupplyOrderService } from '../src/modules/supply-order/supply-order.service';

const EREIGNISSE: SupplyEvent['type'][] = [
  'AntragVersendet',
  'InsuranceApproved',
  'InsuranceRejected',
  'SupplierAssigned',
  'Ordered',
  'Delivered',
  'Completed',
];

async function main() {
  const [ereignis, supplyId] = process.argv.slice(2) as [SupplyEvent['type'] | undefined, string | undefined];
  if (process.env.NODE_ENV === 'production') throw new Error('Nur für die lokale Entwicklung');
  if (!ereignis || !EREIGNISSE.includes(ereignis)) {
    throw new Error(`Ereignis fehlt oder unbekannt. Möglich: ${EREIGNISSE.join(', ')}`);
  }
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  try {
    const supplyOrder = app.get(SupplyOrderService);
    const orders = await supplyOrder.listOrders(DEFAULT_TENANT_CONTEXT);
    const order = supplyId ? orders.find((o) => o.supplyId === supplyId) : orders[0];
    if (!order) throw new Error('Keine passende Versorgung gefunden');
    const ergebnis = await supplyOrder.transitionOrder(DEFAULT_TENANT_CONTEXT, order.id, { type: ereignis }, { type: 'system', id: null });
    console.log(`Versorgung ${order.supplyId}: ${order.status} → ${ergebnis.status}`);
    // Push-Versand läuft als Job in diesem Prozess — kurz abwarten.
    await new Promise((r) => setTimeout(r, 3000));
  } finally {
    await app.close();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
