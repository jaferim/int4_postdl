/**
 * Custom reservation routes.
 *
 * The core router (reservation.ts) gives us POST /reservations for the create.
 * This adds the visitor-facing cancel. It's a distinct path (POST
 * /reservations/cancel) so it never collides with the core routes, and access
 * is granted to the Public role in bootstrap (src/index.ts) alongside create.
 */
export default {
  routes: [
    {
      method: 'POST',
      path: '/reservations/cancel',
      handler: 'reservation.cancel',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
