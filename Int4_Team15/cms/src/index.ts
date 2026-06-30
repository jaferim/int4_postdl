import type { Core } from '@strapi/strapi';

/*** The web app reserves anonymously (no visitor accounts), so the Public role needs `create` (make a reservation) and `cancel` (the custom route that flips one to "cancelled" by pickup reference) on reservations. We grant these here in bootstrap instead of clicking them in the admin so they survive every deploy and data transfer (permissions live in the DB, not in the content the transfer carries). 
 
We deliberately do NOT grant find/findOne/update/delete: reservations hold personal contact details, so they stay non-listable to the public — only the team sees them in the admin. ***/

const PUBLIC_RESERVATION_ACTIONS = [
  'api::reservation.reservation.create',
  'api::reservation.reservation.cancel',
];

async function grantPublicReservationAccess(strapi: Core.Strapi) {
  try {
    const publicRole = await strapi.db
      .query('plugin::users-permissions.role')
      .findOne({ where: { type: 'public' } });
    if (!publicRole) return;

    for (const action of PUBLIC_RESERVATION_ACTIONS) {
      const existing = await strapi.db
        .query('plugin::users-permissions.permission')
        .findOne({ where: { action, role: publicRole.id } });
      if (existing) continue; // already granted — keep this idempotent

      await strapi.db
        .query('plugin::users-permissions.permission')
        .create({ data: { action, role: publicRole.id } });
      strapi.log.info(`[bootstrap] granted Public ${action}`);
    }
  } catch (err) {
    // Never block boot over a permission tweak — log and carry on.
    strapi.log.error(`[bootstrap] could not grant reservation access: ${err}`);
  }
}

export default {
/*** An asynchronous register function that runs before your application is initialized. This gives you an opportunity to extend code. ***/
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

/*** An asynchronous bootstrap function that runs before your application gets started. This gives you an opportunity to set up your data model, run jobs, or perform some special logic. ***/
  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    await grantPublicReservationAccess(strapi);
  },
};
