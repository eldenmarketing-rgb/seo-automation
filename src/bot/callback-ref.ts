import { createHash } from 'crypto';

/**
 * Référence courte pour le `callback_data` d'un bouton Telegram.
 *
 * Telegram limite `callback_data` à 64 octets. Un slug de véhicule y était
 * mis tel quel : « voiture_modif:peugeot-expert-cabine-approfondie-5-places-
 * standard-2019 » fait 70 octets, et un seul bouton trop long fait échouer
 * tout le message (`BUTTON_DATA_INVALID`) — le client ne recevait rien, sans
 * explication, sur /voiture vendu, prix, modif et suppr (constat Okaz,
 * 2026-09-12). Une empreinte de 12 hexadécimaux tient toujours, quel que
 * soit le préfixe, et se recalcule au clic sans rien stocker.
 */
export const REF_LENGTH = 12;

export function callbackRef(slug: string): string {
  return createHash('sha1').update(slug).digest('hex').slice(0, REF_LENGTH);
}

/**
 * Retrouve le slug désigné par une donnée de bouton : une référence courte,
 * ou — pour un bouton affiché avant ce changement et cliqué après — le slug
 * lui-même. `undefined` si rien ne correspond.
 */
export function resolveCallbackRef(slugs: string[], data: string): string | undefined {
  return slugs.find((s) => s === data || callbackRef(s) === data);
}
