/**
 * Registre des commandes du bot — le seul endroit où l'on ajoute une commande.
 *
 * Chaque entrée dit ce que la commande fait et qui peut la lancer. `src/bot/index.ts`
 * enregistre tout ce qui est listé ici et en déduit la liste des commandes réservées
 * à l'administrateur ; `/help` affiche les mêmes libellés. Ajouter une commande =
 * un fichier dans ce dossier + une ligne ci-dessous, rien d'autre.
 *
 * Périmètre volontairement réduit (2026-08-28) : le bot sert aux clients pour
 * `/voiture` et `/produit`, et à l'admin pour quelques actions d'exploitation.
 * Toute la gestion SEO (génération, édition, mots-clés, CTR) passe par le
 * dashboard, en human-in-the-loop — les anciennes commandes IA ont été retirées.
 */
import type { Bot } from 'grammy';
import type { BotContext } from '../index.js';
import { registerHelpCommand } from './help.js';
import { registerStatusCommand } from './status.js';
import { registerSeoCommand } from './seo.js';
import { registerIndexCommand } from './index-check.js';
import { registerMonitorCommand } from './monitor.js';
import { registerPingCommand } from './ping.js';
import { registerDeployCommand } from './deploy.js';
import { registerPhoneCommand } from './phone.js';
import { registerVoitureCommand } from './voiture.js';
import { registerProduitCommand } from './produit.js';

export interface BotCommandDef {
  /** Nom sans le slash, tel que tapé dans Telegram. */
  name: string;
  /** Une ligne pour `/help` (admin). */
  usage: string;
  /** `admin` = chat admin seulement ; `group` = aussi ouvert aux groupes clients. */
  access: 'admin' | 'group';
  register: (bot: Bot<BotContext>) => void;
}

export const BOT_COMMANDS: readonly BotCommandDef[] = [
  { name: 'help', usage: '/help — Cette aide', access: 'group', register: registerHelpCommand },
  {
    name: 'voiture',
    usage: '/voiture add|list|vendu|prix|suppr|deploy — Véhicules',
    access: 'group',
    register: registerVoitureCommand,
  },
  {
    name: 'produit',
    usage: '/produit add|list|suppr|dispo|prix|deploy — Catalogue',
    access: 'group',
    register: registerProduitCommand,
  },
  {
    name: 'status',
    usage: '/status — Pages par site et par statut',
    access: 'admin',
    register: registerStatusCommand,
  },
  {
    name: 'seo',
    usage: '/seo [site] — Rapport GSC (positions, requêtes)',
    access: 'admin',
    register: registerSeoCommand,
  },
  {
    name: 'index',
    usage: '/index [site] — Vérifier l’indexation Google',
    access: 'admin',
    register: registerIndexCommand,
  },
  {
    name: 'monitor',
    usage: '/monitor — Sites en ligne ?',
    access: 'admin',
    register: registerMonitorCommand,
  },
  {
    name: 'ping',
    usage: '/ping [site] [slug|all] — Indexation instantanée',
    access: 'admin',
    register: registerPingCommand,
  },
  {
    name: 'deploy',
    usage: '/deploy [site] — Forcer un redéploiement Vercel',
    access: 'admin',
    register: registerDeployCommand,
  },
  {
    name: 'phone',
    usage: '/phone [site] [numéro] — Changer le téléphone',
    access: 'admin',
    register: registerPhoneCommand,
  },
];

/** Commandes que seul l'admin peut lancer (dérivé de `BOT_COMMANDS`, jamais dupliqué). */
export const ADMIN_ONLY_COMMANDS: ReadonlySet<string> = new Set(
  BOT_COMMANDS.filter((c) => c.access === 'admin').map((c) => c.name),
);

export function registerAllCommands(bot: Bot<BotContext>): void {
  for (const cmd of BOT_COMMANDS) cmd.register(bot);
}
