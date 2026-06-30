/**
 * reservation controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController(
  'api::reservation.reservation',
  ({ strapi }) => ({
    // Cancel a reservation from the (account-less) web client. The pickup
    // reference is the capability: only the visitor who made the reservation
    // has it, so requiring it stops anyone from cancelling someone else's
    // request without us needing visitor logins. We never expose the records
    // themselves to the public — this only flips matching ones to "cancelled".
    async cancel(ctx) {
      const { reference } = ctx.request.body || {};
      if (!reference || typeof reference !== 'string') {
        return ctx.badRequest('reference is required');
      }

      const matches = await strapi
        .documents('api::reservation.reservation')
        .findMany({ filters: { reference } });

      // Idempotent: nothing to cancel (already gone, or the create never
      // reached us) is a no-op success, so the client can fire-and-forget.
      if (!matches.length) return { ok: true, cancelled: 0 };

      await Promise.all(
        matches.map((r) =>
          strapi.documents('api::reservation.reservation').update({
            documentId: r.documentId,
            data: { reservationStatus: 'cancelled' },
          }),
        ),
      );

      return { ok: true, cancelled: matches.length };
    },
  }),
);
